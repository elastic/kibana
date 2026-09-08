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
Memory tools are available through the Agent Builder MCP server at `/api/agent_builder/mcp`.
Agent Builder's registered-tool REST execution endpoint is subject to Agent Builder
access checks and the caller's native Elasticsearch permissions.

## Elasticsearch storage

Memories are stored in `ai-index-idx-agent-memory` through
`StorageIndexAdapter`. The index template composes:

1. Elasticsearch's required `ai-index@mappings` component
2. Elasticsearch's optional `ai-index@custom` component
3. The plugin-owned `ai-index-agent-memory@mappings` component

The plugin-owned component defines only Agent Memory fields. Common AI-index
fields such as `title`, `description`, `content`, `content.semantic`, and
`tags` are inherited from Elasticsearch.

Significant Events is prior art only. Agent Memory has no Significant Events
plugin or package dependency.

Existing local POC data may require index recreation. Authoritative scope fields
are now required and document IDs are deterministic over
`space_id + memory.scope_kind + memory.scope_id + content_hash`.

## Authorization and isolation

The index is non-hidden and has no native document-level security (DLS). Broad
direct Elasticsearch reads can cross user and space boundaries, bypassing the
application filters. A principal with direct write access could also forge
another user's scope. Normal viewer/editor broad grants are read-only. Because
these direct paths bypass application enforcement, this POC remains
disabled-by-default and is not production-ready.

Supported Agent Memory application paths derive a stable authenticated identity
and enforce `space_id`, `memory.scope_kind=user`, and `memory.scope_id` set to
that identity. Forget checks the same ownership tuple before soft-deleting a
memory. `memory.provenance.author` is creator metadata only; it does not control
visibility or ownership. Team scope is reserved but is not implemented.

Writes stamp `permissions.kibana.privileges` with nested per-space entries such
as `{ space, name: ['ai_index:agent_memory/read'], count }`, matching merged
Kibana [PR #285559](https://github.com/elastic/kibana/pull/285559). Agent
Builder's `read` and `all` privileges grant `ai_index:agent_memory/read` as a
Kibana AI-index feature action, not an Elasticsearch index privilege. Agent
Memory reads do not consume these stamps, and the stamps do not currently
create native DLS.

Kibana PR #285559 applies to SML's `ai-index-idx-sml-data` path. Open
Elasticsearch [PR #156990](https://github.com/elastic/elasticsearch/pull/156990)
is hard-coded to that same SML index and enforces space and action only, not
`memory.scope_id`.

Even a generalized version of the SML DLS would not isolate Alice and Bob in the
same space when both have `ai_index:agent_memory/read`. Principal-aware native
DLS, or a private index accessible only through trusted Kibana paths, remains a
production blocker.

Deployments must grant Elasticsearch index privileges on
`ai-index-idx-agent-memory*` separately:

- Direct read paths require `read` and `view_index_metadata`.
- Write, initialization, and reconciliation paths additionally require
  `write`, `create_index`, and `manage`. Current-user operations can create
  backing indices and reconcile mappings with `putMapping`.

Index-template and component-template management itself uses the plugin's
internal management client rather than the current-user client.

## Storage Adapter follow-up

[PR #285258](https://github.com/elastic/kibana/pull/285258) is closed because its
SML-specific implementation did not satisfy
[elastic/search-team#15599](https://github.com/elastic/search-team/issues/15599),
which requires removing SML's dedicated priority-600 index template.

This branch needs the composition capabilities `composedOf`,
`ignoreMissingComponentTemplates`, and `inlineSchemaMappings`, plus the separate
`indexManagementClient` capability. These adapter capabilities need focused
upstream ownership.
