# Agent Memory

Agent Memory persists user-authored memories for Agent Builder chat and workflows.

## Surfaces

- Agent Builder tools: `platform.memory.remember`, `platform.memory.recall`, and
  `platform.memory.forget`
- Agent Builder skill and `beforeAgent` automatic recall hook
- Workflow steps: `memory.remember` and `memory.recall`

The tools and workflow steps share the same core write and recall operations.

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

## Access model

The index is intentionally non-hidden so users with Elasticsearch index
privileges can inspect it directly with ES|QL. Direct Elasticsearch access is
therefore shared and is not restricted by the plugin's per-user filters.

Agent Memory tools, workflows, and automatic recall use the request's
`asCurrentUser` client. Those surfaces enforce Kibana feature privileges and
scope reads and mutations by Kibana space and resolved user identity.

Deployments must grant Elasticsearch index privileges on
`ai-index-idx-agent-memory*` separately:

- Direct read paths require `read` and `view_index_metadata`.
- Write, initialization, and reconciliation paths additionally require
  `write`, `create_index`, and `manage`. Current-user operations can create
  backing indices and reconcile mappings with `putMapping`.

Kibana feature privileges do not grant these Elasticsearch privileges.
Index-template and component-template management itself uses the plugin's
internal management client rather than the current-user client.
