# @kbn/change-history-ui

Shared browser package for **change history** UI in Kibana. Domains integrate via `ChangeHistoryAdapter`; the package ships a **fullscreen modal** shell and reusable timeline components.

The host app must provide **`QueryClientProvider`** (`@kbn/react-query`). This package does not create its own `QueryClient`.

## Integration

1. Implement **`ChangeHistoryAdapter`** — `listChanges`, `getChange`, optional `restoreChange`, optional `getPendingChange`.
2. Wrap with **`ChangeHistoryProvider`** — adapter, `renderPreview`, `labels.previewTitle`, **`scope`**, optional `renderBadge`, optional `renderChangesSummary`, `features`, `permissions`, optional `listPageSize` (defaults to `DEFAULT_CHANGE_HISTORY_PAGE_SIZE`, currently 20), and optional `analytics`.
   Enable restore with **both** `features={{ restore: true }}` and `permissions={{ canRestore: true }}`.
   Enable unsaved in-editor state with **`features={{ unsavedChanges: true }}`** when the adapter implements `getPendingChange`.
   Disable compare with `features={{ compare: false }}` (enabled by default).
3. Render **`ChangeHistoryTrigger`** and **`ChangeHistoryModal`**.

### Minimal (domain-neutral)

```tsx
import { QueryClientProvider } from '@kbn/react-query';
import {
  ChangeHistoryProvider,
  ChangeHistoryModal,
  ChangeHistoryTrigger,
} from '@kbn/change-history-ui';

<QueryClientProvider client={queryClient}>
  <ChangeHistoryProvider
    objectId={documentId}
    adapter={documentChangeHistoryAdapter}
    renderPreview={({ change, compareSpec, diffTelemetry }) => (
      <pre>{JSON.stringify(compareSpec?.target.snapshot ?? change.snapshot, null, 2)}</pre>
    )}
    labels={{ previewTitle: documentTitle }}
    scope={{
      module: 'stack',
      dataset: 'documents',
      objectType: 'document',
    }}
    analytics={{ reportEvent: core.analytics.reportEvent }}
  >
    <ChangeHistoryTrigger />
    <ChangeHistoryModal />
  </ChangeHistoryProvider>
</QueryClientProvider>
```

Implement `ChangeHistoryAdapter.listChanges` / `getChange` against your domain API. Snapshots are opaque (`unknown`); map your entity shape in the adapter. Call `diffTelemetry?.reportDiffViewed()` from `renderPreview` when your diff UI shows a non-empty comparison.

**Compare:** When compare is enabled, `getChange` supplies baseline/target snapshot detail as needed. Implementations should resolve any requested `changeId`. List rows must stay newest-first.

**`scope`** — `{ module, dataset, objectType }`, aligned with `@kbn/change-history` server clients and telemetry payloads. **`objectId`** must be unique within that scope when multiple domains share one `QueryClient`.

In `renderPreview`, call `diffTelemetry?.reportDiffViewed()` when your consumer shows a non-empty diff. Use `diffTelemetry.reportDiffChangeNavigated(source)` for in-diff navigation (e.g. hunk prev/next).

## HTTP adapter

`createChangeHistoryHttpAdapter` uses **0-based** `page` query params. Domains with **1-based** list APIs or detail embedded in list rows should implement a custom `ChangeHistoryAdapter`.

## Telemetry

Register EBT event types once in the consuming plugin's `setup()`:

```tsx
import { registerChangeHistoryTelemetryEvents } from '@kbn/change-history-ui';

registerChangeHistoryTelemetryEvents(analytics);
```

For bundle size, lazy-load registration:

```tsx
void import('@kbn/change-history-ui/src/telemetry/register_change_history_telemetry_events').then(
  ({ registerChangeHistoryTelemetryEvents }) => registerChangeHistoryTelemetryEvents(analytics)
);
```

Pass **`analytics={{ reportEvent: core.analytics.reportEvent }}`** and **`scope`** into `ChangeHistoryProvider`. Set `features={{ telemetry: false }}` to disable reporting.

Registration is idempotent: call from each consumer's `setup()`; Core rejects duplicate event types and other errors are rethrown. First successful registration wins for schema ownership.

Every payload includes `eventName`, `module`, `dataset`, and `objectType` (from `scope`). Use `useChangeHistoryConfig().telemetry` to emit additional events from custom UI.

### Events

| Event type | `eventName` | When emitted | Notable properties |
| --- | --- | --- | --- |
| `change_history_opened` | Change history opened | Each time the modal is opened (closed → open) | — |
| `change_history_change_selected` | Change history change selected | User selects a timeline row or auto-selects latest | `selectionSource` (`user_click` \| `auto_latest`), `hasSequence`, optional `eventAction` |
| `change_history_filter_applied` | Change history filter applied | Filter UI applies a change *(not wired yet)* | `filterType` (`timeRange` \| `actor`), optional `hasActiveTimeRange`, `activeActorCount` |
| `change_history_diff_viewed` | Change history diff viewed | Preview consumer calls `diffTelemetry.reportDiffViewed()` when a non-empty diff is shown | `comparisonType` (`vs_previous` \| `vs_row`), optional `versionDistance` (from `metadata.version` when both rows include it), `compareMode`, `hasChangesSummaryTooltip` |
| `change_history_diff_change_navigated` | Change history diff change navigated | Preview consumer reports diff navigation (e.g. hunk prev/next) | `navigationSource` (consumer-defined keyword) |
| `change_history_restore_confirmed` | Change history restore confirmed | User confirms restore in the dialog | optional `restoredFromSequence`, `currentSequence`, `rollbackDistance`, `hadUnsavedLocalEdits` |
| `change_history_restore_completed` | Change history restore completed | Restore API succeeds | same sequence fields + optional `hadUnsavedLocalEdits` + optional `durationMs` (confirm → API success) |
| `change_history_restore_failed` | Change history restore failed | Restore API fails | optional sequence fields + optional `hadUnsavedLocalEdits` + optional `errorCode` (e.g. `RESTORE_CONFLICT`) |

`rollbackDistance` is `currentSequence - restoredFromSequence` when both are present. Sequence fields are omitted when list rows lack `object.sequence`.
