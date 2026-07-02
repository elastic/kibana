# Context Engine (`contextEngine`)

The Context Engine plugin provides a centralized service for indexing, crawling, and searching Kibana assets (visualizations, dashboards, connectors, workflows, etc.).

It was extracted from the `agentBuilder` plugin to serve as an independent, shared platform service.

## Overview

The CE makes Kibana content discoverable by maintaining a search index of asset metadata. It supports:

- **Type registration** — solution plugins register `CeTypeDefinition`s describing how to list, index, and convert their assets.
- **Crawling** — a background Task Manager task periodically crawls registered types and keeps the index up to date.
- **Event-driven indexing** — plugins can call `indexAttachment()` to immediately index or remove an asset (e.g., on connector create/delete).
- **Search** — an internal HTTP route and programmatic API for searching indexed assets with space and permission filtering.
- **Attach resolution** — resolves search hits into conversation attachments for use in the Agent Builder.

## Plugin contracts

### Setup

```typescript
interface ContextEnginePluginSetup {
  registerType(definition: CeTypeDefinition): void;
}
```

### Start

```typescript
interface ContextEnginePluginStart {
  search(params): Promise<{ results: CeSearchResult[]; total: number }>;
  /**
   * Fetch CE documents by entry IDs. Permission checks are performed internally
   * — the returned map only contains documents the user (identified by `request`)
   * is authorized to access. Unauthorized or missing IDs are absent from the
   * result.
   */
  getDocuments(params: {
    ids: string[];
    request: KibanaRequest;
    spaceId?: string; // resolved from request when omitted
  }): Promise<Map<string, CeDocument>>;
  getTypeDefinition(typeId: string): CeTypeDefinition | undefined;
  resolveCeAttachItems(params): Promise<CeResolvedItemResult[]>;
  indexAttachment(params: CeIndexAttachmentParams): Promise<void>;
}
```

> Note: an explicit `checkItemsAccess` primitive is intentionally **not** part of
> the public contract. `getDocuments` is safe by default and `resolveCeAttachItems`
> covers the "convert entries to attachments" workflow. If you find yourself wanting
> a standalone access check, use `getDocuments` and look at which IDs are present
> in the result.

## Registering a CE type

During plugin setup, call `contextEngine.registerType()` with a `CeTypeDefinition`:

```typescript
setup(core, { contextEngine }) {
  contextEngine.registerType({
    id: 'my-asset',
    list: async function* (context) { /* yield pages of items */ },
    getCeData: async (originId, context) => { /* return entries to index */ },
    toAttachment: async (doc, context) => { /* convert to attachment */ },
    fetchFrequency: () => '30m', // optional, defaults to 10m
  });
}
```

## Current consumers

| Plugin | Types registered |
|--------|-----------------|
| `agentBuilderPlatform` | `visualization`, `connector` |
| `agentBuilderDashboards` | `dashboard` |
| `workflowsManagement` | `workflow` |

## Feature gating

CE functionality is gated behind the `contextEngine:enabled` UI setting (the Context Engine feature flag, registered by this plugin). Everything owned by this plugin — the HTTP routes (`withCeFeatureFlag`), the crawler tasks, and the workflow index step — checks `contextEngine:enabled` alone.

CE surfaces that live in the Agent Builder family of plugins additionally require `agentBuilder:experimentalFeatures`, so they are gated on **both** flags: the `ce_search` / `ce_attach` tools, the internal `_attach` route, and the `@` command menu (in `agent_builder`), plus the connector lifecycle handler that crawls connectors into CE (in `agent_builder_platform`). This keeps CE behind Agent Builder's own experimental gate even if the Context Engine flag graduates independently.

## Index naming

CE data is stored in `.chat-sml-data` and crawler state in `.chat-sml-crawler-state`, using the `.chat-*` system index prefix registered in the Elasticsearch `kibana_system` role. The `sml-` index suffixes are intentionally retained (not renamed to `ce-`) so the plugin keeps reading the existing system indices without requiring a change to the out-of-repo `kibana_system` role allowlist.
