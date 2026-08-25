# Agent Memory

Agent Memory is a disabled-by-default evaluation POC for persisting user-authored
memories in Agent Builder chat and workflows. It is not production-ready.

Enable the plugin explicitly with `xpack.agentMemory.enabled: true`. Enabling the
plugin does not enable memory for every agent: each agent must explicitly select
the `agent-memory` skill or individual memory tools. The `beforeAgent` automatic
recall hook runs only when the agent selects the memory skill,
`platform.memory.recall`, or the all-tools wildcard.

## Surfaces

- Agent Builder tools: `platform.memory.remember`, `platform.memory.recall`, and
  `platform.memory.forget`
- Opt-in `agent-memory` skill and `beforeAgent` automatic recall hook
- Workflow steps: `memory.remember`, `memory.recall`, and `memory.forget`

The tools and workflow steps share the same core write, recall, and soft-delete operations.
Explicit tool and workflow recall can require generic exact-match tags such as project,
customer, case, workflow, or Watch identifiers. Every requested tag must be present.
Automatic recall remains unchanged and does not add a tag constraint.
All memory tools set `excludeFromMcp` and are omitted from the Agent Builder MCP
server. Agent Builder's registered-tool REST execution endpoint remains an
inherent Agent Builder surface; it is subject to Agent Builder access checks and
the caller's native Elasticsearch permissions.

## Elasticsearch storage

Memories are stored in `ai-index-idx-agent-memory` through
`StorageIndexAdapter`. The index template composes:

1. Elasticsearch's required `ai-index@mappings` component
2. The plugin-owned `ai-index-agent-memory@mappings` component
3. Elasticsearch's optional `ai-index@custom` component

The plugin-owned component defines only Agent Memory fields. Common AI-index
fields such as `title`, `description`, `content`, `content.semantic`, and
`tags` are inherited from Elasticsearch.

Significant Events is prior art only. Agent Memory has no Significant Events
plugin or package dependency.

Existing local POC data may require index recreation. Authoritative scope fields
are now required and document IDs are deterministic over
`space_id + memory.scope_kind + memory.scope_id + content_hash`.

## Authorization and isolation

Agent Memory has no custom Kibana feature privileges. Tools, workflows, and
automatic recall perform data operations with the request-scoped
`asCurrentUser` client, so authorization relies solely on native Elasticsearch
permissions. Core security is used only to resolve a stable identity.

Current application paths enforce personal scope with `space_id`,
`memory.scope_kind=user`, and `memory.scope_id` set to that identity.
`memory.provenance.author` is creator metadata only; it does not control
visibility or ownership. Team scope is reserved in the schema and deterministic
key design, but team memories are not implemented.

The index is intentionally non-hidden and has no per-document native
document-level security. Built-in viewer/editor-style broad index reads can
therefore query memories across users directly with ES|QL, bypassing the
application's personal-scope filters. Normal roles do not receive write access
by default. This direct Elasticsearch cross-user access makes the POC unsafe for
production. Principal-aware and team-aware native authorization remains an
unresolved production blocker.

Deployments must grant Elasticsearch index privileges on
`ai-index-idx-agent-memory*` separately:

- Direct read paths require `read` and `view_index_metadata`.
- Write, initialization, and reconciliation paths additionally require
  `write`, `create_index`, and `manage`. Current-user operations can create
  backing indices and reconcile mappings with `putMapping`.

Index-template and component-template management itself uses the plugin's
internal management client rather than the current-user client.

## Storage Adapter follow-up

[PR #285258](https://github.com/elastic/kibana/pull/285258) addresses mapping and
component-template composition settings only; it does not address authorization.
After it merges, adopt its public `composedOf`,
`ignoreMissingComponentTemplates`, and `inlineSchemaMappings` APIs for
overlapping composition behavior.

This branch also requires a separate internal `indexManagementClient` and owned
component-template dependency, lifecycle, and reconciliation behavior that
#285258 does not provide. Those needs must be replaced upstream or relocated
before all five branch-owned Storage Adapter diffs can be removed. The
convergence/removal target remains:

- `index.ts`
- `src/get_schema_version.ts`
- `src/index_adapter/index.test.ts`
- `src/index_adapter/index.ts`
- `src/index_adapter/integration_tests/index.test.ts`
