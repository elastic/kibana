# Agent Context Layer (`agentContextLayer`)

The Agent Context Layer plugin provides a centralized service for indexing, crawling, and searching Kibana assets (visualizations, dashboards, connectors, workflows, etc.) via the **Semantic Metadata Layer (SML)**.

It was extracted from the `agentBuilder` plugin to serve as an independent, shared platform service.

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
interface AgentContextLayerPluginSetup {
  registerType(definition: SmlTypeDefinition): void;
  registerResolver(resolver: SmlResolver): void;
}
```

### Start

```typescript
interface AgentContextLayerPluginStart {
  search(params): Promise<{ results: SmlSearchResult[]; total: number }>;
  /**
   * Fetch SML documents by chunk IDs. Permission checks are performed internally
   * — the returned map only contains documents the user (identified by `request`)
   * is authorized to access. Unauthorized or missing IDs are absent from the
   * result.
   */
  getDocuments(params: {
    ids: string[];
    request: KibanaRequest;
    spaceId?: string; // resolved from request when omitted
  }): Promise<Map<string, SmlDocument>>;
  getTypeDefinition(typeId: string): SmlTypeDefinition | undefined;
  resolveSmlAttachItems(params): Promise<SmlResolvedItemResult[]>;
  indexAttachment(params: SmlIndexAttachmentParams): Promise<void>;
}
```

> Note: an explicit `checkItemsAccess` primitive is intentionally **not** part of
> the public contract. `getDocuments` is safe by default and `resolveSmlAttachItems`
> covers the "convert chunks to attachments" workflow. If you find yourself wanting
> a standalone access check, use `getDocuments` and look at which IDs are present
> in the result.

## Registering an SML type

During plugin setup, call `agentContextLayer.registerType()` with an `SmlTypeDefinition`:

```typescript
setup(core, { agentContextLayer }) {
  agentContextLayer.registerType({
    id: 'my-asset',
    list: async function* (context) { /* yield pages of items */ },
    getSmlData: async (originId, context) => { /* return chunks to index */ },
    toAttachment: async (doc, context) => { /* convert to attachment */ },
    fetchFrequency: () => '30m', // optional, defaults to 10m
  });
}
```

## Resolvers and origin ids

SML supports a small registry of **resolvers** that know how to read a
single class of resource (a Kibana saved object, an Elasticsearch
document, an ES index's mappings, ...) and compute the privileges
required to access it.

Origin ids carry a resolver scheme as a URI prefix:

| Origin id format                          | Resolver       | Auto-computed permission           |
|-------------------------------------------|---------------|------------------------------------|
| `kibana://<so_type>/<so_id>`              | `kibana`      | `saved_object:<so_type>/get`       |
| `es_document://<index>/<doc_id>`          | `es_document` | `es-index:<index>:read`            |
| `es_index://<index>`                      | `es_index`    | `es-index:<index>:view_index_metadata` |

When an SML chunk's `origin_id` matches a registered resolver scheme,
`getSmlData` no longer needs to return a `permissions` array — the
indexer asks the resolver for the permissions and stamps them on the SML
document. For example:

```typescript
agentContextLayer.registerType({
  id: 'visualization',

  async *list(context) {
    for await (const page of context.savedObjectsClient.createPointInTimeFinder({ type: 'lens' }).find()) {
      yield page.saved_objects.map((so) => ({
        id: `kibana://lens/${so.id}`,
        updatedAt: so.updated_at ?? new Date().toISOString(),
        spaces: so.namespaces ?? [],
      }));
    }
  },

  getSmlData: async (originId, context) => {
    // origin id format: `kibana://lens/<so_id>` — extract the id and read the SO.
    // No `permissions` field needed; the `kibana` resolver derives them.
    // ...
  },

  toAttachment: async (item, context) => {
    // item.origin_id is the FULL prefixed form (`kibana://lens/<so_id>`).
    // Use the `parseOriginId` helper exported from `@kbn/agent-context-layer-plugin/server`
    // to extract the saved object id when needed.
  },
});
```

### Backward compatibility

The resolver flow is opt-in. SML types whose permissions don't fit any
registered resolver (e.g. feature-API privileges like
`api:workflowsManagement:read`) keep yielding bare origin ids and
provide `chunk.permissions` explicitly — that path continues to work and
is the recommended fallback when no resolver applies.

### Permissions DSL

Stored permission strings (whether returned by a resolver or by
`chunk.permissions`) use a small DSL that the security check routes to
the right bucket of Elasticsearch's `_has_privileges` API:

- bare or `kibana:<priv>` → Kibana privilege (default).
- `es-cluster:<priv>` → Elasticsearch cluster privilege.
- `es-index:<index>:<priv>` → Elasticsearch index privilege.

### Custom resolvers

Plugins that introduce a new resource kind can register their own
resolver via `agentContextLayer.registerResolver({ type, getPermissions,
getItem })`. The `type` becomes the URI scheme used on origin ids
produced by that plugin's SML types.

## Current consumers

| Plugin | Types registered |
|--------|-----------------|
| `agentBuilderPlatform` | `visualization`, `connector` |
| `agentBuilderDashboards` | `dashboard` |
| `workflowsManagement` | `workflow` |

## Feature gating

SML functionality is gated behind the `agentBuilder:experimentalFeatures` UI setting. The search route, crawler tasks, and Agent Builder SML tools all check this flag.

## Index naming

SML data is stored in `.chat-sml-data` and crawler state in `.chat-sml-crawler-state`, using the `.chat-*` system index prefix registered in the Elasticsearch `kibana_system` role.
