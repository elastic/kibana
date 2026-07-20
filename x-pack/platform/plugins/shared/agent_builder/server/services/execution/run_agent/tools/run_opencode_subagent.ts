/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { ToolType, platformCoreTools } from '@kbn/agent-builder-common';
import { internalTools } from '@kbn/agent-builder-common/tools';
import { AttachmentType, getLatestVersion } from '@kbn/agent-builder-common/attachments';
import type { ConnectorAttachmentData } from '@kbn/agent-builder-common/attachments';
import {
  createErrorResult,
  createOtherResult,
  getAgentFromRunContext,
} from '@kbn/agent-builder-server';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server/tools';
import type { AttachmentStateManager } from '@kbn/agent-builder-server/attachments';
import { getConnectorSpec } from '@kbn/connector-specs';
import type { SandboxProfile } from '@kbn/agent-builder-common';
import type { OpencodeSubagentExecutor } from '../../opencode_subagent/executor';

/**
 * Result of resolving the conversation's attached connectors for the sub-agent:
 * a human-readable catalog (goes into the sub-agent's system prompt) and the
 * flat list of connector ids (goes into the run's tool-access scope so the
 * broker/runtime knows exactly which connectors this run may touch).
 */
interface ConnectorContext {
  /** Catalog (Connector ID + sub-actions) to inject into the sub-agent system prompt. */
  catalog: string;
  /** Connector ids the sub-agent is allowed to use for this run. */
  connectorIds: string[];
}

/**
 * Build a briefing of the connectors currently attached to the conversation, so
 * the OpenCode sub-agent knows which connectorId + sub-actions it can call over
 * MCP (via platform.core.execute_connector_sub_action) WITHOUT the user spelling
 * out ids/sub-actions in the prompt.
 *
 * This mirrors the connector attachment representation the parent agent already
 * sees; we surface it to the sub-agent because it runs in its own session. The
 * secret never leaves Kibana — the sub-agent only ever names a connectorId, and
 * Kibana's actions framework brokers the call.
 */
const buildConnectorContext = (attachments: AttachmentStateManager): ConnectorContext => {
  const toolId = platformCoreTools.executeConnectorSubAction;
  const connectorAttachments = attachments
    .getActive()
    .filter((a) => a.type === AttachmentType.connector);

  const empty: ConnectorContext = { catalog: '', connectorIds: [] };
  if (connectorAttachments.length === 0) return empty;

  const blocks: string[] = [];
  const connectorIds: string[] = [];
  for (const attachment of connectorAttachments) {
    const data = getLatestVersion(attachment)?.data as ConnectorAttachmentData | undefined;
    if (!data) continue;
    const {
      connector_id: connectorId,
      connector_name: connectorName,
      connector_type: connectorType,
    } = data;
    connectorIds.push(connectorId);
    const spec = getConnectorSpec(connectorType);
    const subActions = spec
      ? Object.entries(spec.actions)
          .filter(([, action]) => action.isTool)
          .map(([name, action]) => `  - ${name}: ${action.description ?? name}`)
      : [];

    const lines = [
      `Connector: ${connectorName} (${connectorType})`,
      `Connector ID: ${connectorId}`,
    ];
    if (subActions.length > 0) {
      lines.push('Available sub-actions:', ...subActions);
    }
    blocks.push(lines.join('\n'));
  }

  if (blocks.length === 0) return empty;

  const catalog = [
    '## Available Kibana connectors',
    '',
    `You can call these connectors through the agent_builder MCP tool "${toolId}".`,
    `Invoke it with JSON {"connectorId":"<id below>","subAction":"<sub-action>","params":{ ... }}.`,
    'Kibana holds the credentials and makes the external call; you never see the secret.',
    '',
    ...blocks,
  ].join('\n');

  return { catalog, connectorIds };
};

/**
 * Compose git/PR guidance for the sub-agent's system prompt from the profile's
 * git policy. When the profile allows push+PR, tell the agent exactly how to
 * clone, branch, commit, push, and open a PR on the allowed repo(s) — the
 * sandbox already has a scoped, short-lived credential injected into git + gh.
 */
const buildGitGuidance = (
  profile: SandboxProfile,
  credentials?: { github?: { repository?: string; access?: 'read' | 'push-pr' } }
): string => {
  if (!credentials?.github) return '';
  const git = profile.policy?.git;
  if (!git || git.mode === 'none') return '';
  const repos = [credentials.github.repository, ...(git.repos ?? [])].filter(
    (repo): repo is string => Boolean(repo)
  );
  const repoLine =
    repos.length > 0
      ? `You may operate on these repositories only: ${repos.join(', ')}.`
      : 'Operate only on the repository named in the task.';

  if (git.mode === 'clone-ro') {
    return [
      '## Git access (read-only)',
      '',
      repoLine,
      'git and the `gh` CLI are pre-authenticated in this sandbox with a short-lived,',
      'repo-scoped token. You may `git clone` and read, but do NOT push or open PRs.',
    ].join('\n');
  }

  // push-pr
  return [
    '## Git access (push + open PR)',
    '',
    repoLine,
    'git and the `gh` CLI are pre-authenticated in this sandbox with a short-lived,',
    'repo-scoped GitHub App token (contents + pull_requests). To deliver a fix:',
    '1. `git clone https://github.com/<owner>/<repo>.git` and investigate.',
    '2. Create a branch, make the minimal fix, and commit with a clear message.',
    '3. `git push` the branch.',
    '4. Open a pull request with `gh pr create --fill` (or the GitHub API) and',
    '   return the PR URL in your final answer.',
    'Keep the change focused and small. Do not modify unrelated files.',
  ].join('\n');
};

const accessSchema = z.enum(['read', 'write']);

const buildElasticCliGuidance = (credentials?: {
  elastic?: { kibana?: 'read' | 'write'; elasticsearch?: 'read' | 'write' };
}): string => {
  if (!credentials?.elastic?.kibana && !credentials?.elastic?.elasticsearch) {
    return '';
  }
  const grants = [
    credentials.elastic.kibana ? `Kibana ${credentials.elastic.kibana}` : undefined,
    credentials.elastic.elasticsearch
      ? `Elasticsearch ${credentials.elastic.elasticsearch}`
      : undefined,
  ]
    .filter(Boolean)
    .join(', ');

  return [
    '## Elastic CLI access',
    '',
    `The sandbox is prepared with ${grants} credentials. \`ELASTIC_CLI_CONFIG_FILE\``,
    'points at a run-scoped Elastic CLI config for the requested products only.',
    'If the `elastic` binary is available in the sandbox image, use it directly.',
    'Otherwise use Agent Builder MCP tools for Elastic/Kibana actions.',
  ].join('\n');
};

const buildCredentialGuidance = (): string =>
  [
    '## Sandbox credential grants',
    '',
    'Request only the credentials this coding task actually needs:',
    '- `credentials.github`: use only for GitHub clone, push, or PR operations.',
    '- `credentials.elastic.kibana`: REQUIRED when the user asks the sandbox to use ECLI, Elastic CLI, the `elastic` command, Kibana APIs, workflows, saved objects, cases, or other Kibana resources.',
    '- `credentials.elastic.elasticsearch`: REQUIRED when the user asks the sandbox to use ECLI/Elastic CLI for Elasticsearch APIs, indices, mappings, documents, search, or ES|QL.',
    'Use `read` unless the task must create, update, delete, push, or open a PR.',
  ].join('\n');

export const OpencodeSubagentToolName = internalTools.runOpencodeSubagent;

const schema = z.object({
  description: z.string().describe('A short (3-5 word) description of the coding task'),
  repository: z
    .string()
    .optional()
    .describe(
      'GitHub repository for sandbox git credentials, as owner/repo or a github.com URL. Provide this whenever the task needs clone, push, or PR access. If the user asks for GitHub work but the repo is unclear, ask a clarifying question before calling this tool.'
    ),
  credentials: z
    .object({
      github: z
        .object({
          repository: z
            .string()
            .optional()
            .describe(
              'Repository to grant GitHub credentials for, as owner/repo or github.com URL.'
            ),
          access: z
            .enum(['read', 'push-pr'])
            .optional()
            .describe('Use read for clone-only; use push-pr only when pushing/opening a PR.'),
        })
        .optional()
        .describe('Request GitHub credentials only when the sandbox needs git/gh access.'),
      elastic: z
        .object({
          kibana: accessSchema
            .optional()
            .describe(
              'Direct Kibana access for Elastic CLI/API calls. Set to read when the task mentions ECLI, Elastic CLI, `elastic`, workflows, saved objects, cases, Kibana APIs, or verifying the Elastic CLI against Kibana. Use write only for Kibana mutations.'
            ),
          elasticsearch: accessSchema
            .optional()
            .describe(
              'Direct Elasticsearch access for Elastic CLI/API calls. Set to read when the task mentions ECLI/Elastic CLI with indices, mappings, documents, search, or ES|QL. Use write only for Elasticsearch mutations.'
            ),
        })
        .optional()
        .describe('Request Elastic CLI credentials only for products the sandbox must access.'),
    })
    .optional()
    .describe(
      'Least-privilege sandbox credentials to grant for this run. Omit products not needed.'
    ),
  prompt: z
    .string()
    .describe(
      'The coding task for the OpenCode sub-agent to perform. Include repository, the problem to investigate or fix, and what output you expect (e.g. a PR, a patch summary, a root-cause explanation).'
    ),
});

const toolDescription = `Delegate ANY task that involves writing, running, or reasoning about code to a sandboxed OpenCode sub-agent.

ALWAYS use this tool (instead of just describing steps to the user) when the user
asks you to:
- write / create / generate code or a script (any language)
- run or execute code and report the output
- clone a repository and investigate or fix a bug
- apply a change and open a pull request
Do NOT answer coding requests by printing instructions for the user to run
themselves — actually delegate the work here and relay the real result.

The OpenCode sub-agent runs inside an isolated Kubernetes sandbox with git and a
full coding toolchain (Node.js, git, ripgrep). Its network egress is locked
down: it can reach this Kibana's tools (Agent Builder MCP), the model gateway,
and GitHub — nothing else. Note: only Node.js is guaranteed to be installed, so
prefer JavaScript/TypeScript for "run this" tasks unless a repo brings its own
toolchain.

Elastic CLI / ECLI credential rule:
- If the user asks to use or verify ECLI / Elastic CLI / the "elastic" command,
  you MUST request credentials.elastic.
- Without credentials.elastic, the sandbox will not install/configure Elastic
  CLI credentials.

Because it is wired back into Agent Builder over MCP, the OpenCode sub-agent can
call the SAME Kibana-aware tools you have (ES|QL, index mappings, cases,
connectors, workflows, ...) WHILE it writes and runs code.

## Writing the prompt

Brief it like a smart engineer who just joined:
- State the goal and why it matters.
- Set the structured repository field when the task needs GitHub clone, push, or PR access.
- If GitHub access is needed and the repository is unclear, incomplete, or ownerless
  (for example "kibana" instead of "elastic/kibana" or "rosomri/kibana"), ask
  the user which repo to use before calling this tool. Do not guess the owner.
- Set the structured credentials field for only the products and access levels the sandbox needs.
- Name any specific files/areas if you know them.
- Share what you've already learned (e.g. the failing behaviour, relevant index
  or log data you found via your own tools).
- Say what deliverable you want back (root cause, a patch, a PR URL).

## Usage notes

- This runs a full sandboxed coding session; it can take several minutes.
- When it's done it returns a single summary. Relay a concise version to the user.
- The sub-agent's file changes live only in its sandbox unless it pushes/opens a PR.`;

export const createOpencodeSubagentTool = ({
  executor,
  profile,
}: {
  executor: OpencodeSubagentExecutor;
  /** The agent's attached Sandbox Profile (provider + runtime + policy). */
  profile: SandboxProfile;
}): BuiltinToolDefinition<typeof schema> => {
  return {
    id: OpencodeSubagentToolName,
    description: toolDescription,
    type: ToolType.builtin,
    schema,
    tags: ['subagent', 'coding'],
    handler: async (
      { description, repository, credentials, prompt },
      { events, runContext, spaceId, request, attachments }
    ) => {
      try {
        // Resolve any attached connectors so the sub-agent can use them by id
        // without the user spelling out connectorId/subAction. The parent agent
        // discovers connectors via SML (sml_search/sml_attach) or the user
        // attaches them; this forwards that context into the sub-agent's
        // separate session. The catalog goes into the system prompt; the ids
        // scope the run's tool access (broker/runtime).
        const { catalog, connectorIds } = buildConnectorContext(attachments);
        const effectiveCredentials = credentials ?? (repository ? { github: { repository } } : {});
        const gitGuidance = buildGitGuidance(profile, effectiveCredentials);
        const elasticCliGuidance = buildElasticCliGuidance(effectiveCredentials);
        const credentialGuidance = buildCredentialGuidance();
        const systemPrompt =
          [catalog, gitGuidance, elasticCliGuidance, credentialGuidance]
            .filter(Boolean)
            .join('\n\n') || undefined;
        const fullPrompt = `${description}\n\n${prompt}`;

        const agentCtx = getAgentFromRunContext(runContext);

        const result = await executor.execute({
          prompt: fullPrompt,
          repository,
          credentials: effectiveCredentials,
          systemPrompt,
          allowedConnectors: connectorIds.length > 0 ? connectorIds : undefined,
          request,
          profile,
          runContext: {
            conversationId: agentCtx?.conversationId,
            agentId: agentCtx?.agentId,
            executionId: agentCtx?.executionId,
            spaceId,
          },
          onProgress: (progress) => {
            // Stream each activity item to the UI. Metadata values must be
            // strings, so the full structured item (id, phase, status, command,
            // output, todos, ...) is serialized under `item`; the UI parses it
            // and upserts by id for a live, Cursor-style activity feed.
            events.reportProgress(progress.label, {
              metadata: {
                opencode_subagent: 'true',
                item: JSON.stringify(progress),
              },
            });
          },
        });

        if (result.status === 'error') {
          return {
            results: [createErrorResult(`OpenCode sub-agent failed: ${result.error}`)],
          };
        }

        return {
          results: [
            createOtherResult({
              opencode_subagent: true,
              status: 'completed',
              run_id: result.runId,
              stop_reason: result.stopReason,
              timeline: result.timeline,
              tool_calls: result.toolCalls,
              response: result.answer,
            }),
          ],
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return {
          results: [createErrorResult(`OpenCode sub-agent execution failed: ${message}`)],
        };
      }
    },
  };
};
