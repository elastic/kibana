# Integrating `@kbn/change-history-ui`

Guide for Kibana plugin teams adopting the shared change history UI.

## Prerequisites

| Requirement | Notes |
|-------------|-------|
| Server write path | Domain calls `@kbn/change-history` `log()` after successful primary writes |
| Read routes | List + detail HTTP routes (domain wire types; map to UI DTOs in the browser) |
| React Query | Host app wraps consumers in `QueryClientProvider` (`@kbn/react-query`) |
| Telemetry (recommended) | Register EBT events once in plugin `setup()` |

See also [`@kbn/change-history` README](../kbn-change-history/README.md) for storage and write-path guidance.

## Integration flow

```
@kbn/change-history (server write/read)
    → domain HTTP wire types (your list/detail JSON)
        → ChangeHistoryAdapter (browser — map to UI DTOs)
            → ChangeHistoryProvider + ChangeHistoryModal
```

Most domains implement a **custom** `ChangeHistoryAdapter`. A small HTTP factory exists for simple APIs — see [Appendix: HTTP adapter starter](#appendix-http-adapter-starter).

## Quick start

### 1. Implement a custom adapter

Start from [`examples/minimal_custom_adapter.example.ts`](./examples/minimal_custom_adapter.example.ts): separate list and detail routes, domain wire types, mappers to `ChangeHistoryListItem` / `ChangeHistoryDetail`, optional restore with `mapChangeHistoryHttpError`.

```ts
import type { ChangeHistoryAdapter } from '@kbn/change-history-ui';
import { mapChangeHistoryHttpError } from '@kbn/change-history-ui';

export const createMyEntityChangeHistoryAdapter = (http: HttpSetup): ChangeHistoryAdapter => ({
  listChanges: async ({ objectId, page, signal }) => {
    const body = await http.get(/* list route */, {
      query: { page: page.index + 1, per_page: page.size },
      signal,
    });
    return { items: body.items.map(mapToListItem), total: body.total };
  },
  getChange: async ({ objectId, changeId, signal }) => {
    const body = await http.get(/* detail route */, { signal });
    return mapToDetail(body);
  },
  restoreChange: async ({ objectId, changeId, signal }) => {
    try {
      await http.post(/* restore route */, { signal });
    } catch (error) {
      throw mapChangeHistoryHttpError(error);
    }
  },
});
```

### 2. Wire the provider and modal

```tsx
import { QueryClientProvider } from '@kbn/react-query';
import {
  ChangeHistoryModal,
  ChangeHistoryProvider,
  ChangeHistoryTrigger,
  registerChangeHistoryTelemetryEvents,
} from '@kbn/change-history-ui';

// plugin setup()
registerChangeHistoryTelemetryEvents(analytics);

// plugin UI
<QueryClientProvider client={queryClient}>
  <ChangeHistoryProvider
    objectId={entityId}
    adapter={createMyEntityChangeHistoryAdapter(http)}
    renderPreview={({ change, compareSpec, diffTelemetry }) => (
      <MyEntityPreview change={change} compareSpec={compareSpec} diffTelemetry={diffTelemetry} />
    )}
    labels={{ previewTitle: entityTitle }}
    scope={{ module: 'security', dataset: 'my-feature', objectType: 'my-entity' }}
    features={{ restore: true, unsavedChanges: false }}
    permissions={{ canRestore: canUpdateEntity }}
    analytics={{ reportEvent: core.analytics.reportEvent }}
  >
    <ChangeHistoryTrigger />
    <ChangeHistoryModal />
  </ChangeHistoryProvider>
</QueryClientProvider>
```

## Adapter contract

Implement `ChangeHistoryAdapter`:

| Method | Required | Purpose |
|--------|----------|---------|
| `listChanges` | Yes | Paginated history, **newest first** |
| `getChange` | Yes | Full detail + snapshot for preview/compare |
| `restoreChange` | No | Restore live entity to a prior change |
| `getPendingChange` | No | In-editor unsaved state (`features.unsavedChanges`) |

List rows use `ChangeHistoryListItem`; detail uses `ChangeHistoryDetail` with opaque `snapshot: unknown`.

### Pagination

The UI uses **0-based** `page.index`. Translate to your API in the adapter (e.g. send `page.index + 1` when the API is 1-based).

### When you need more than the minimal adapter

| Need | Approach |
|------|----------|
| Detail embedded in list rows | Adapter-local cache populated by `listChanges`; `getChange` reads cache |
| Cross-page diff updates | Return `updatedItems` from `listChanges` when page boundaries change |
| List-row `changes` computed in the browser | Compute in `listChanges` before mapping rows |
| Host refresh after restore | Call from `restoreChange` (see `onRestored` in the minimal example) |

Workflows (`workflow_change_history_adapter.ts`) is the full reference for cache, cross-page diffs, and YAML list-row summaries.

### Compare

When compare is enabled, the UI may call `getChange` for baseline/target rows. Resolve any requested `changeId` via a detail route or adapter-local cache.

## Entry points

| Component | Use when |
|-----------|----------|
| `ChangeHistoryTrigger` | App header toolbar link |
| `ChangeHistoryListGroupItem` | Overflow / side nav menu item |
| `useChangeHistoryModal()` | Fully custom trigger (pass `openModal` to your own control) |

`ChangeHistoryTrigger` accepts optional `label`, `iconType`, and `data-test-subj`.

## Feature flags

Resolved at provider mount via `features` + adapter + `permissions`:

| `features` | Effect |
|------------|--------|
| `compare: false` | Hide compare actions and preview compare mode |
| `restore: true` + `permissions.canRestore` + `adapter.restoreChange` | Enable restore |
| `unsavedChanges: true` + `adapter.getPendingChange` | Show pending in-editor row |
| `telemetry: false` | Disable EBT reporting |

Use `useChangeHistoryConfig().supports` in custom UI to gate affordances.

## Server routes

Suggested shapes (adapt paths to your plugin). Responses are **domain wire types** — map to UI DTOs in the browser adapter.

| Method | Path | Response |
|--------|------|----------|
| GET | `/api/{plugin}/{entity}/{id}/history` | `{ items: [...], total: number }` |
| GET | `/api/{plugin}/{entity}/{id}/history/{eventId}` | detail row + `snapshot` |
| POST | `/api/{plugin}/{entity}/{id}/history/{eventId}/_restore` | `204` or restore result |

Reference OpenAPI fragments live in [`examples/`](../examples/).

Map from `@kbn/change-history` store documents into your domain HTTP response, then map again in the browser adapter to `ChangeHistoryListItem` / `ChangeHistoryDetail`:

| Store field | UI DTO |
|-------------|--------|
| `event.id` | `id` |
| `@timestamp` | `timestamp` |
| `user.name`, `user.id` | `actor.name`, `actor.profileId` |
| `event.action` | `action` |
| `object.snapshot` | `snapshot` (detail only) |
| `metadata.*` | `metadata` |

Redact or hash secrets before returning snapshots to the browser.

## Telemetry

1. Register once in plugin `setup()`:

```ts
import { registerChangeHistoryTelemetryEvents } from '@kbn/change-history-ui';

registerChangeHistoryTelemetryEvents(analytics);
```

2. Pass `analytics` and `scope` into `ChangeHistoryProvider`.
3. Call `diffTelemetry?.reportDiffViewed()` from `renderPreview` when a non-empty diff renders.

### Lazy registration (bundle size)

```ts
void import('@kbn/change-history-ui/telemetry')
  .then(({ registerChangeHistoryTelemetryEvents }) => {
    registerChangeHistoryTelemetryEvents(analytics);
  })
  .catch(() => {
    // Telemetry registration must not break plugin setup.
  });
```

Use `@kbn/change-history-ui/telemetry` in plugin `setup()` when you want EBT schemas without loading React UI. For tests and runtime reporting, import from `@kbn/change-history-ui` as usual.

## Testing

Import helpers from `@kbn/change-history-ui/mocks`:

```tsx
import {
  TestProvider,
  createMockChangeHistoryAdapter,
  createMockChangeHistoryDetails,
  MOCK_CHANGE_HISTORY_OBJECT_ID,
} from '@kbn/change-history-ui/mocks';

const adapter = createMockChangeHistoryAdapter({
  changes: createMockChangeHistoryDetails(),
  onRestoreChange: jest.fn(),
});
```

Wrap components with `TestProvider` (includes `QueryClientProvider` + i18n).

## Custom layouts

Building blocks for domain-owned pages (e.g. a dedicated history route):

- `ChangeHistoryTimeline`, `ChangeHistoryItem`, `ChangeHistoryFooter`
- Hooks: `useChangeHistoryList`, `useChangeHistoryDetail`, `useChangeHistoryRestore`

Compose these inside your own shell while reusing the same `ChangeHistoryProvider`.

## Checklist for new adopters

- [ ] `ChangeHistoryClient.log()` on all successful mutation paths
- [ ] Monotonic `sequence` policy documented (or accept timestamp ordering)
- [ ] List + detail routes with privilege checks and space scoping
- [ ] Custom `ChangeHistoryAdapter` maps domain wire types to UI DTOs; snapshots redacted
- [ ] Newest-first list order
- [ ] `renderPreview` slot implemented
- [ ] `scope` aligned with server `module` / `dataset` / `objectType`
- [ ] Telemetry registered + `analytics` passed to provider
- [ ] Unit tests using `@kbn/change-history-ui/mocks`

## Appendix: HTTP adapter starter

`createChangeHistoryHttpAdapter` is optional — use it only when list, detail, and restore routes already return JSON that maps cleanly to UI DTOs with minimal transformation.

**Use the factory when:**

- List and detail responses map directly to `ChangeHistoryListItem` / `ChangeHistoryDetail`
- Pagination differs only by index base (`pageIndexBase`)
- Restore is a single POST with standard error bodies

**Prefer a custom adapter when:** caching, cross-page diffs, browser-computed list-row changes, or non-standard restore bodies are required (most production domains).

```ts
import { createChangeHistoryHttpAdapter, mapChangeHistoryHttpError } from '@kbn/change-history-ui';

createChangeHistoryHttpAdapter({
  http,
  listPath: '/api/my_plugin/entity/{objectId}/history',
  detailPath: '/api/my_plugin/entity/{objectId}/history/{eventId}',
  restorePath: '/api/my_plugin/entity/{objectId}/history/{eventId}/_restore',
  pageIndexBase: 1,
  mapListItem: mapMyEntityHistoryListItem,
  mapDetail: mapMyEntityHistoryDetail,
  // mapHttpError: mapChangeHistoryHttpError, // default
});
```

## Out of scope (v1)

- Time range / actor filter toolbar (post-v1)
- Dedicated history page or URL sync (domain-owned)
- Browser access to `@kbn/change-history` or Elasticsearch
