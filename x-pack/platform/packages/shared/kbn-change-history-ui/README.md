# @kbn/change-history-ui

Shared browser package for **change history** UI in Kibana. Domains integrate via `ChangeHistoryAdapter`; the package ships a **fullscreen modal** shell and reusable timeline components.

List, detail, and restore flows use **react-query** (`@kbn/react-query`) for caching and invalidation. The package does not create its own `QueryClient` — the host app must provide one.

## Integration (4 steps)

1. **Mount `QueryClientProvider`** — once at the app root (or any ancestor of change history UI). Most Kibana apps already do this; if yours does not, add it before `ChangeHistoryProvider`.
2. **Implement `ChangeHistoryAdapter`** — `listChanges` and `getChange`, optional `restoreChange`.
3. **Wrap with `ChangeHistoryProvider`** — pass adapter, `renderPreview`, `labels.previewTitle`, **`scope`**, optional `renderBadge`, `features`, `permissions`, and optional `analytics` for telemetry.
   Enable restore with **both** `features={{ restore: true }}` and `permissions={{ canRestore: true }}`.
4. **Render `ChangeHistoryTrigger` + `ChangeHistoryModal`** — modal overlay; no dedicated route required.

```tsx
import { QueryClientProvider } from '@kbn/react-query';
import {
  ChangeHistoryProvider,
  ChangeHistoryModal,
  ChangeHistoryTrigger,
} from '@kbn/change-history-ui';

<QueryClientProvider client={queryClient}>
  <ChangeHistoryProvider
    objectId={workflowId}
    adapter={workflowChangeHistoryAdapter}
    renderPreview={renderWorkflowYamlPreview}
    renderBadge={renderWorkflowBadge}
    labels={{ previewTitle: workflowName }}
    scope={{
      module: 'stack',
      dataset: 'workflows',
      objectType: 'workflow',
    }}
  >
    <ChangeHistoryTrigger />
    <ChangeHistoryModal />
  </ChangeHistoryProvider>
</QueryClientProvider>
```

### Tests

Wrap components under test with a `QueryClientProvider`. See `src/test_utils/create_query_client_wrapper.tsx`.

## React-query cache

Hooks read from the nearest `QueryClientProvider`. Multiple consumers in the same app **share one client**; cache entries are isolated by query key, not by adapter instance.

Query keys are namespaced by **change-history scope** and `objectId`:

```
['change-history', module, dataset, objectType, objectId, 'list', pageSize]
['change-history', module, dataset, objectType, objectId, 'detail', changeId]
```

- Pass **`scope`** to `ChangeHistoryProvider` — same triple as telemetry and `@kbn/change-history` server clients (`module` / `dataset` / `objectType`). Workflows: `stack` / `workflows` / `workflow`.
- **`objectId`** must be unique within that scope under the shared `QueryClient`.
- **`adapter` is not part of the key** — do not reuse the same `objectId` + `scope` with different adapters.
- After a successful restore, `useChangeHistoryRestore` calls `useInvalidateChangeHistory(objectId)` to refetch active list and detail queries. Consumers do not need to call invalidation unless they mutate history outside the restore button.

## HTTP adapter

`createChangeHistoryHttpAdapter` sends **0-based** `page` query params, matching the package's internal pagination (`page.index` starts at `0`).

Domains with **1-based** list APIs that embed detail in each row (e.g. workflows) should implement a custom `ChangeHistoryAdapter` instead of the generic HTTP helper.

For list-backed adapters, ensure `getChange` can resolve while the list is refetching (e.g. do not clear an in-memory detail cache until new list data has arrived).

## EBT telemetry

The package emits **browser EBT** events when `ChangeHistoryProvider` receives **`scope`** and **`analytics`** (`Pick<AnalyticsServiceStart, 'reportEvent'>`). Set `features={{ telemetry: false }}` to disable reporting (UI behavior is unchanged).

### Register event types

Consuming plugins must register schemas once at setup:

```tsx
import { changeHistoryTelemetryEvents } from '@kbn/change-history-ui';

analytics.registerEventType(changeHistoryTelemetryEvents[0]);
// or register all:
changeHistoryTelemetryEvents.forEach((event) => analytics.registerEventType(event));
```

Export `changeHistoryTelemetryEvents`, `changeHistoryTelemetryEventSchemas`, `ChangeHistoryTelemetryEventTypes`, and `changeHistoryTelemetryEventNames` from this package.

### Wire the provider

```tsx
<ChangeHistoryProvider
  scope={{ module: 'stack', dataset: 'workflows', objectType: 'workflow' }}
  analytics={{ reportEvent: telemetry.reportEvent }}
  /* … */
>
```

Every payload includes `eventName`, `module`, `dataset`, and `objectType` (from `scope`).

### Events

| Event type | `eventName` | When emitted | Notable properties |
| --- | --- | --- | --- |
| `change_history_opened` | Change history opened | First open of the modal per object | — |
| `change_history_change_selected` | Change history change selected | User selects a timeline row or auto-selects latest | `selectionSource` (`user_click` \| `auto_latest`), `hasSequence`, optional `eventAction` |
| `change_history_filter_applied` | Change history filter applied | Filter UI applies a change *(not wired yet)* | `filterType` (`timeRange` \| `actor`), optional `hasActiveTimeRange`, `activeActorCount` |
| `change_history_diff_viewed` | Change history diff viewed | User views a diff *(not wired yet)* | `comparisonType` (`vs_current` \| `vs_previous`), optional `versionDistance`, `compareMode`, `hasSemanticSummary` |
| `change_history_restore_confirmed` | Change history restore confirmed | User confirms restore in the dialog | optional `restoredFromSequence`, `currentSequence`, `rollbackDistance` |
| `change_history_restore_completed` | Change history restore completed | Restore API succeeds | same sequence fields + optional `newSequence`, `durationMs` (confirm → API success) |
| `change_history_restore_failed` | Change history restore failed | Restore API fails | optional `errorCode` (e.g. `RESTORE_CONFLICT`) |

`rollbackDistance` is `currentSequence - restoredFromSequence` when both are present. Sequence fields are omitted when list rows lack `object.sequence`.

Use `useChangeHistoryConfig().telemetry` to emit custom events (e.g. filters or diff) from domain-specific UI built on this package.

## Running tests

```bash
node scripts/jest x-pack/platform/packages/shared/kbn-change-history-ui/src/hooks/use_change_history_list.test.ts
node scripts/jest x-pack/platform/packages/shared/kbn-change-history-ui/src/components/modal/change_history_modal.test.tsx
```

## Exports

- Types (`ChangeHistoryAdapter`, DTOs, …)
- `ChangeHistoryProvider`, `useChangeHistoryConfig`, `useChangeHistoryList`, `useChangeHistoryDetail`, `useChangeHistoryRestore`
- `useInvalidateChangeHistory`, `useChangeHistoryAutoSelection`
- Query key helpers (`changeHistoryListQueryKey`, `changeHistoryDetailQueryKey`, `changeHistoryObjectQueryKeyPrefix`, `changeHistoryScopeQueryKeyPrefix`, …)
- `ChangeHistoryModal`, `ChangeHistoryTrigger`, `ChangeHistoryPreviewPanel`
- `createChangeHistoryHttpAdapter`
- Telemetry (`changeHistoryTelemetryEvents`, `ChangeHistoryTelemetryEventTypes`, `createChangeHistoryTelemetryReporter`, …)
