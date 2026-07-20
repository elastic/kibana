# OpenCode Sub-Agent Sandbox

This directory contains the experimental Agent Builder coding sub-agent runtime. It lets an
Agent Builder agent delegate a coding task to OpenCode, run it inside an isolated sandbox,
stream its activity back to the conversation, and grant only the credentials that specific
task needs.

The current implementation is a proof of concept, but the boundaries are intentional:

- Agent Builder decides when a task needs a coding sub-agent and which products or repos the
run may access.
- The sandbox provider owns compute isolation and lifecycle.
- The coding runtime owns OpenCode configuration, ACP communication, and timeline extraction.
- Credential minters produce short-lived, run-scoped credentials with the narrowest useful  
privileges.

## End-to-End Flow

1. The parent Agent Builder agent calls `run_opencode_subagent`.
2. The tool builds run-specific guidance from the sandbox profile, attached connectors, and
  explicit credential request.
3. `OpencodeSubagentExecutor` selects the effective sandbox stack:
  - the agent's attached sandbox profile when present;
  - otherwise the process-level default `opencodeSubagent` config.
4. The executor mints the per-run Agent Builder MCP credential so the sandbox can call back
  into Kibana tools without receiving connector secrets.
5. The executor resolves direct credentials only for products requested by the parent agent:
  - GitHub, when the task needs `git` or `gh`;
  - Elastic CLI, when the task needs Kibana or Elasticsearch access from the sandbox.
6. The sandbox registry provisions or reuses an isolated sandbox.
7. `OpenCodeAcpRuntime` writes OpenCode config, injects run-scoped credentials, starts
  `opencode acp`, and drives ACP over stdio.
8. ACP `session/update` events are normalized into `OpencodeRunProgress` items and streamed
  back to the conversation UI.
9. The runtime scrubs injected credentials, the executor revokes minted API keys, and the
  sandbox lifecycle layer decides whether the sandbox can stay warm or must be torn down.



## Agent Builder Relationship

OpenCode is not an independent agent exposed directly to users. It is an implementation detail
behind the Agent Builder internal tool `run_opencode_subagent`.

The parent Agent Builder agent keeps responsibility for:

- deciding whether a coding sandbox is appropriate;
- asking clarifying questions before delegating ambiguous repo/product access;
- choosing credential granularity through the structured `credentials` field;
- passing relevant context and expected deliverables to OpenCode;
- relaying the final result back to the user.

The OpenCode sub-agent receives a narrower prompt and a narrower capability set than the parent
agent. This is important: the sandbox should not inherit every connector, credential, or product
permission available to the parent session. It gets only what the parent explicitly asks for and
what the user's RBAC allows.

## Granularity Model

The PR introduces granularity at a few layers:

- Runtime granularity: `CodingRuntime` separates "the coding agent" from "the sandbox provider",
so OpenCode can be replaced later without changing provisioning.
- Sandbox profile granularity: a profile controls provider, image, policy, runtime, and git
posture for the agent using it.
- Connector granularity: attached connector IDs are forwarded to the runtime so MCP brokered
calls are scoped to the connectors available in this run.
- Credential granularity: `SandboxCredentialRequest` names the exact product and access level
the sandbox needs.

The structured credential shape is:

```ts
{
  github?: {
    repository?: string;
    access?: 'read' | 'push-pr';
  };
  elastic?: {
    kibana?: 'read' | 'write';
    elasticsearch?: 'read' | 'write';
  };
  gcp?: {
    connectorId?: string;
    projectId?: string;
    access?: 'read' | 'write';
    services?: string[];
    regions?: string[];
  };
}
```

The tool guidance instructs the parent agent to omit credentials that are not needed, use `read`
by default, and request `write` or `push-pr` only for mutating tasks.

## Sandbox And Coding Agent Layers

The sandbox layer is provider-oriented. Today the default provider is local Kubernetes, backed by
`kubectl`, but the interfaces are intended to support other providers.

Key files:

- `sandbox_provider.ts` defines the provider-neutral `SandboxProvider` and `Sandbox` contracts.
- `sandbox_manager.ts` provisions local Kubernetes pods, applies the egress posture, and exposes
basic sandbox metadata.
- `sandbox_registry.ts` owns warm sandbox reuse and reaping.
- `profile_runtime_resolver.ts` resolves an attached sandbox profile into the provider/runtime
stack for a specific agent.
- `coding_runtime.ts` defines the runtime-neutral coding agent interface.
- `opencode_acp_runtime.ts` implements `CodingRuntime` using OpenCode over ACP.
- `executor.ts` connects Agent Builder execution, sandbox lifecycle, credential minting, runtime
invocation, progress streaming, persistence, and cleanup.

This split keeps the responsibilities small:

- Providers create and destroy sandboxes.
- The registry decides reuse.
- The runtime runs one coding turn inside an already-ready sandbox.
- The executor owns run orchestration and Agent Builder integration.



## ACP Communication

OpenCode is driven through ACP, the Agent Client Protocol. In this PR we use a small local client
instead of adding a production SDK dependency.

`acp_client.ts` speaks newline-delimited JSON-RPC 2.0 over the child process stdio:

- `initialize`
- `session/new`
- `session/prompt`

It also handles inbound OpenCode messages:

- `session/update`, used for streamed text, thoughts, tool calls, and plans;
- `session/request_permission`, auto-approved in the PoC because sandbox isolation is the main
boundary.

`opencode_acp_runtime.ts` starts OpenCode with:

```sh
OPENCODE_CONFIG=/workspace/.config/opencode/opencode.json opencode acp --log-level ERROR
```

The runtime writes the OpenCode config before each turn. That config includes:

- LiteLLM model routing for the orchestrator and coding models;
- the Agent Builder MCP server as a remote MCP endpoint;
- a per-run `Authorization` header for the MCP loopback.

OpenCode then sends ACP updates while it works. The runtime maps those updates into timeline
items:

- message chunks become the final answer;
- thought chunks become a `Thinking` item;
- plan updates become todo progress;
- tool calls become categorized activity such as git, GitHub CLI, Elastic CLI, file edits,
searches, tests, and connector calls.

The UI receives these items through Agent Builder progress metadata and upserts them by item ID.

## MCP Loopback And Connector Access

Most external capability should stay brokered through Kibana rather than injected into the
sandbox. For that path, the sandbox receives a short-lived Kibana credential and calls the Agent
Builder MCP endpoint.

Important files:

- `mcp_auth_minter.ts` mints the run-scoped MCP loopback credential.
- `run_opencode_subagent.ts` builds the connector catalog from attached conversation connectors.
- `coding_runtime.ts` models the runtime tool access as `mcpUrl`, `mcpAuthHeader`, and optional
`allowedConnectors`.
- `opencode_acp_runtime.ts` writes those values into OpenCode's MCP config.

Connector secrets remain inside Kibana. The sandbox sees connector IDs and sub-action names, then
Kibana's actions framework performs the actual external call.

## GitHub Short-Lived Tokens

GitHub is the exception to the "broker through MCP" rule because real `git clone`, `git push`, and
`gh pr create` need a git-usable credential inside the sandbox.

The flow is:

1. The parent agent requests `credentials.github` only when the task needs GitHub repo access.
2. The executor normalizes the target repo from the structured field or, as a fallback, from the
  prompt.
3. The executor determines access:
  - `read` for clone/read-only work;
  - `push-pr` for branch push or PR creation.
4. `GithubTokenResolver` searches the run's attached GitHub connectors, or accessible GitHub
  connectors when none are explicitly attached.
5. A `.github` connector with `github_app` auth mints an installation token via
  `GithubAppTokenMinter`.
6. The connector's `allowedRepos` allowlist is enforced before minting.
7. The runtime injects the token into git and `gh` configuration, then scrubs it in `finally`.

Least-privilege behavior:

- GitHub App installation tokens are short-lived.
- Repository access is limited by the connector's allowlist and by the GitHub App installation.
- `read` grants read-only repository permissions.
- `push-pr` grants the permissions required for contents and pull requests.
- If a requested repo is missing or not allowed, the executor fails before sandbox work starts
instead of letting OpenCode discover missing credentials halfway through.

Related files:

- `github_token_resolver.ts` finds GitHub connectors, reads encrypted connector material
server-side, validates repo allowlists, and returns git-usable tokens.
- `github_app_token_minter.ts` signs the GitHub App JWT, finds the installation, and mints the
installation token.
- `opencode_acp_runtime.ts` writes the token into the sandbox's git credential store and `gh`
host config.
- `src/platform/packages/shared/kbn-connector-specs/src/auth_types/github_app.ts` defines the
connector auth type.
- `src/platform/packages/shared/kbn-connector-specs/src/specs/github/github.ts` adds GitHub App
auth and `allowedRepos` to the GitHub connector spec.



## Elastic CLI Credentials And OOTB Installation

Elastic CLI access is requested through `credentials.elastic`.

The parent agent should request:

- `credentials.elastic.kibana: 'read'` for Kibana reads, workflow inspection, saved object reads,
cases reads, or verifying the `elastic` command against Kibana.
- `credentials.elastic.kibana: 'write'` only for Kibana mutations.
- `credentials.elastic.elasticsearch: 'read'` for index, mapping, search, document, or ES|QL
reads.
- `credentials.elastic.elasticsearch: 'write'` only for Elasticsearch mutations.

`ElasticCliCredentialMinter` produces a run-scoped `.elasticrc.yml`:

- If the inbound request already uses an API key, the config reuses that key.
- Otherwise it grants a short-lived API key on behalf of the current user.
- Kibana privileges are limited to read or all for the current space.
- Elasticsearch privileges are limited to monitor/read/view index metadata for read access, or
broader privileges only for write access.
- Minted API keys are invalidated after the run.

The runtime handles out-of-the-box CLI setup:

- `ensureElasticCliInstalled` checks whether `elastic` is already available.
- If not, it installs `@elastic/cli` into `/workspace/.elastic-cli-npm`.
- It writes `ELASTIC_CLI_CONFIG_FILE` and `PATH` setup into a run-scoped env file.
- It sources that env file before launching OpenCode.
- It removes the config and env file during cleanup.

Related files:

- `elastic_cli_credential_minter.ts` mints/reuses API keys and builds `.elasticrc.yml`.
- `opencode_acp_runtime.ts` installs the CLI when needed and injects the config.
- `config.ts` adds the configured Elasticsearch URL used in the generated CLI config.
- `server/test_utils/config.ts` mirrors the test config default.
- `run_opencode_subagent.ts` tells the parent agent when it must request Elastic CLI credentials.

## Google Cloud CLI Credentials And OOTB Installation

Google Cloud CLI access is requested through `credentials.gcp`.

The implementation is connector-backed:

- A `.gcp_cli` connector stores the target project and optional service/region allowlists.
- The connector uses the existing `gcp_service_account` auth type as a server-side bootstrap
  credential.
- The connector can optionally name a target service account to impersonate. The bootstrap
  service account must be allowed to call IAM Credentials `generateAccessToken` for that target.
- `GcpCliCredentialResolver` reads the connector server-side, validates the requested project,
  services, and regions, and calls IAM Credentials to mint a short-lived access token.
- `OpenCodeAcpRuntime` installs or finds `gcloud`, writes `CLOUDSDK_CONFIG`,
  `CLOUDSDK_AUTH_ACCESS_TOKEN_FILE`, and `CLOUDSDK_CORE_PROJECT`, configures
  `auth/access_token_file`, and scrubs the token/config files after the run.

The connector's service account JSON never enters the sandbox. The sandbox receives only the
generated access token, which expires automatically.

Related files:

- `gcp_cli_credential_resolver.ts` resolves `.gcp_cli` connectors for sandbox CLI setup.
- `opencode_acp_runtime.ts` installs `gcloud`, activates the service account, and scrubs config.
- `run_opencode_subagent.ts` tells the parent agent when it must request GCP CLI credentials.
- `src/platform/packages/shared/kbn-connector-specs/src/specs/gcp_cli/gcp_cli.ts` defines the
  generic Google Cloud CLI connector.



## Progress Timeline And UI

The runtime emits `OpencodeRunProgress` items for lifecycle, credentials, thoughts, todos, tools,
file edits, and final status.

This PR adds richer timeline metadata:

- `iconType` lets the server suggest product-specific or command-specific icons.
- `credentialIconVariant` distinguishes secured credential grants from infrastructure setup.
- Command classification maps common commands to friendlier labels:
  - `gh pr create` -> opened a GitHub PR;
  - `git clone` -> cloned repository;
  - `elastic es` -> queried Elasticsearch with Elastic CLI;
  - `node scripts/jest` -> ran Jest tests.

UI files:

- `public/application/components/sandboxes/opencode_timeline.tsx` renders the timeline, icons,
credential badges, command output, file previews, and todo progress.
- `public/application/components/conversations/conversation_rounds/round_events/steps/opencode_subagent_step.tsx`
renders the OpenCode block in the conversation and makes it collapsible.



## Files Changed By This PR Area

Connector specs:

- `src/platform/packages/shared/kbn-connector-specs/src/all_auth_types.ts`
- `src/platform/packages/shared/kbn-connector-specs/src/auth_types/github_app.ts`
- `src/platform/packages/shared/kbn-connector-specs/src/auth_types/translations.ts`
- `src/platform/packages/shared/kbn-connector-specs/src/specs/gcp_cli/gcp_cli.ts`
- `src/platform/packages/shared/kbn-connector-specs/src/specs/github/github.ts`
- `src/platform/packages/shared/kbn-connector-specs/src/specs/github/github.test.ts`

Agent Builder server/runtime:

- `x-pack/platform/plugins/shared/agent_builder/server/config.ts`
- `x-pack/platform/plugins/shared/agent_builder/server/test_utils/config.ts`
- `x-pack/platform/plugins/shared/agent_builder/server/services/execution/run_agent/tools/run_opencode_subagent.ts`
- `x-pack/platform/plugins/shared/agent_builder/server/services/execution/opencode_subagent/coding_runtime.ts`
- `x-pack/platform/plugins/shared/agent_builder/server/services/execution/opencode_subagent/elastic_cli_credential_minter.ts`
- `x-pack/platform/plugins/shared/agent_builder/server/services/execution/opencode_subagent/executor.ts`
- `x-pack/platform/plugins/shared/agent_builder/server/services/execution/opencode_subagent/gcp_cli_credential_resolver.ts`
- `x-pack/platform/plugins/shared/agent_builder/server/services/execution/opencode_subagent/github_app_token_minter.ts`
- `x-pack/platform/plugins/shared/agent_builder/server/services/execution/opencode_subagent/github_token_resolver.ts`
- `x-pack/platform/plugins/shared/agent_builder/server/services/execution/opencode_subagent/opencode_acp_runtime.ts`
- `x-pack/platform/plugins/shared/agent_builder/server/services/execution/opencode_subagent/provider.ts`
- `x-pack/platform/plugins/shared/agent_builder/server/services/execution/opencode_subagent/types.ts`

Agent Builder UI:

- `x-pack/platform/plugins/shared/agent_builder/public/application/components/conversations/conversation_rounds/round_events/steps/opencode_subagent_step.tsx`
- `x-pack/platform/plugins/shared/agent_builder/public/application/components/sandboxes/opencode_timeline.tsx`

