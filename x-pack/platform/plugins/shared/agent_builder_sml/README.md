# Agent Builder SML (`agentBuilderSml`)

The Agent Builder SML plugin provides a centralized service for indexing, crawling, and searching Kibana assets (visualizations, dashboards, connectors, workflows, rules, action policies, significant events) via the **Semantic Metadata Layer (SML)**.

Renamed from `agent_context_layer` — SML is an Agent Builder feature; this plugin is the SML implementation shared across the Agent Builder plugin family.

## Overview

The SML makes Kibana content discoverable by maintaining a search index of asset metadata. It supports:

- **Type registration** — solution plugins register `SmlTypeDefinition`s describing how to list, index, and convert their assets.
- **Crawling** — a background Task Manager task periodically crawls registered types and keeps the index up to date.
- **Event-driven indexing** — plugins can call `indexAttachment()` to immediately index or remove an asset (e.g., on connector create/delete).
- **Search** — an internal HTTP route and programmatic API for searching indexed assets with space and permission filtering.
- **Attach resolution** — resolves search hits into conversation attachments for use in the Agent Builder.

## Plugin contracts

### Setup

```typescript
interface AgentBuilderSmlPluginSetup {
  registerType(definition: SmlTypeDefinition): void;
}
```

### Start

```typescript
interface AgentBuilderSmlPluginStart {
  search(params): Promise<{ results: SmlSearchResult[] }>;
  getTypeDefinition(typeId: string): SmlTypeDefinition | undefined;
  resolveSmlAttachItems(params): Promise<SmlResolvedItemResult[]>;
  indexAttachment(params: SmlIndexAttachmentParams): Promise<void>;
}
```

## Registering an SML type

During plugin setup, call `agentBuilderSml.registerType()` with an `SmlTypeDefinition`:

```typescript
setup(core, { agentBuilderSml }) {
  agentBuilderSml.registerType({
    id: 'my-asset',
    list: async function* (context) { /* yield pages of items */ },
    getSmlEntry: async (originId, context) => { /* return entry to index */ },
    toAttachment: async (doc, context) => { /* convert to attachment */ },
    fetchFrequency: () => '30m', // optional, defaults to 10m
  });
}
```

## Current consumers

| Plugin | Types registered |
|--------|-----------------|
| `agentBuilderPlatform` | `connector` |
| `agentBuilderDashboards` | `dashboard` |
| `agentBuilderVisualizations` | `visualization` |
| `agentBuilderWorkflows` | `workflow` |
| `alertingV2` | `rule`, `action_policy` |
| `significantEvents` | `significant_event` |

`workflowsManagement` calls `indexAttachment` indirectly (via a callback passed in by `agentBuilderWorkflows`) but does not register a type. `agentBuilder` itself is the only real caller of `search`/`resolveSmlAttachItems`.

## Feature gating

SML functionality is gated behind the `contextEngine:enabled` UI setting. Everything owned by this plugin — the HTTP routes (`withSmlFeatureFlag`), the crawler tasks — checks `contextEngine:enabled` alone.

SML surfaces that live in the Agent Builder family of plugins additionally require `agentBuilder:experimentalFeatures`, so they are gated on **both** flags: the `sml_search` / `sml_attach` tools, the internal `_attach` route, and the `@` command menu (in `agent_builder`), plus the connector lifecycle handler that crawls connectors into SML (in `agent_builder_platform`). This keeps SML behind Agent Builder's own experimental gate even if the Context Engine flag graduates independently.

## Index naming

SML data is stored in `.chat-sml-data` and crawler state in `.chat-sml-crawler-state`, using the `.chat-*` system index prefix registered in the Elasticsearch `kibana_system` role.

The `permissions` mapping no longer has an `elasticsearch.indices` sub-object (removed once every registered type was confirmed to hardcode it empty) — if a `.chat-sml-data` document from before that change ever populated `permissions.elasticsearch.indices`, it needs a reindex before this mapping change is safe; this has not been verified against a live deployment.
