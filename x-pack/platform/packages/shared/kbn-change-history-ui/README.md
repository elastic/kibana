# @kbn/change-history-ui

Shared browser package for **change history** UI in Kibana. Domains integrate via `ChangeHistoryAdapter`; the package ships a **fullscreen modal** shell and reusable timeline components.

**Status:** Ready for adoption; workflows is the reference integration.

## Documentation

| Doc | Purpose |
|-----|---------|
| [Integration guide](./dev_docs/integration_guide.md) | Step-by-step adoption checklist (custom adapter first) |
| [Minimal custom adapter](./dev_docs/examples/minimal_custom_adapter.example.ts) | Copy-paste starter adapter |
| [Examples](./examples/) | Reference OpenAPI fragments for list / get / restore routes |
| [`@kbn/change-history`](../kbn-change-history/README.md) | Server storage, write path, and query semantics |

### Package entry points

| Import | Use when |
|--------|----------|
| `@kbn/change-history-ui` | Provider, modal, hooks, adapter types |
| `@kbn/change-history-ui/mocks` | Unit tests and Storybook |
| `@kbn/change-history-ui/telemetry` | Lazy EBT registration in plugin `setup()` |

## Requirements

The host app must provide **`QueryClientProvider`** (`@kbn/react-query`). This package does not create its own `QueryClient`.

## Integration

1. Implement a **custom** **`ChangeHistoryAdapter`** — start from the [minimal example](./dev_docs/examples/minimal_custom_adapter.example.ts). Optional: [HTTP adapter starter](./dev_docs/integration_guide.md#appendix-http-adapter-starter) for simple APIs only.
2. Wrap with **`ChangeHistoryProvider`** — adapter, `renderPreview`, `labels.previewTitle`, **`scope`**, optional `renderBadge`, optional `renderChangesSummary`, `features`, `permissions`, optional `listPageSize` (defaults to `DEFAULT_CHANGE_HISTORY_PAGE_SIZE`, currently 20), and optional `analytics`.
   Enable restore with **both** `features={{ restore: true }}` and `permissions={{ canRestore: true }}`.
   Enable unsaved in-editor state with **`features={{ unsavedChanges: true }}`** when the adapter implements `getPendingChange`.
   Disable compare with `features={{ compare: false }}` (enabled by default).
3. Render **`ChangeHistoryTrigger`** (or a custom trigger via `useChangeHistoryModal`) and **`ChangeHistoryModal`**.

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

### Entry points

| Export | Use when |
|--------|----------|
| `ChangeHistoryTrigger` | App header link (custom `label`, `iconType`) |
| `ChangeHistoryListGroupItem` | Overflow / side nav menu |
| `useChangeHistoryModal()` | Fully custom trigger |

### Testing

Use `@kbn/change-history-ui/mocks` for unit tests and Storybook:

```tsx
import {
  TestProvider,
  createMockChangeHistoryAdapter,
  createMockChangeHistoryDetails,
} from '@kbn/change-history-ui/mocks';
```

See the [integration guide](./dev_docs/integration_guide.md) for the full adoption checklist.

Implement `ChangeHistoryAdapter.listChanges` / `getChange` against your domain API. Snapshots are opaque (`unknown`); map your entity shape in the adapter. Call `diffTelemetry?.reportDiffViewed()` from `renderPreview` when your diff UI shows a non-empty comparison.

**Compare:** When compare is enabled, `getChange` supplies baseline/target snapshot detail as needed. Implementations should resolve any requested `changeId`. List rows must stay newest-first.

**`scope`** — `{ module, dataset, objectType }`, aligned with `@kbn/change-history` server clients and telemetry payloads. **`objectId`** must be unique within that scope when multiple domains share one `QueryClient`.

In `renderPreview`, call `diffTelemetry?.reportDiffViewed()` when your consumer shows a non-empty diff. Use `diffTelemetry.reportDiffChangeNavigated(source)` for in-diff navigation (e.g. hunk prev/next).

## Appendix: HTTP adapter starter

`createChangeHistoryHttpAdapter` is optional — for APIs that already return JSON mappable to UI DTOs with minimal work. Most domains need a custom adapter; see the [integration guide appendix](./dev_docs/integration_guide.md#appendix-http-adapter-starter).

- `listPath`, optional `detailPath`, optional `restorePath`
- `pageIndexBase: 0 | 1` (default `0`) — UI `page.index` is always 0-based
- Structured HTTP error mapping via `mapChangeHistoryHttpError` (override with `mapHttpError`)

Adapter DTO types (`ChangeHistoryListItem`, `ChangeHistoryDetail`, error codes, etc.) are exported from this package. Server routes typically use domain-specific wire types; map to these shapes in the browser `ChangeHistoryAdapter`.

## Public API highlights

| Category | Exports |
|----------|---------|
| Shell | `ChangeHistoryProvider`, `ChangeHistoryModal`, `ChangeHistoryTrigger`, `ChangeHistoryListGroupItem` |
| Data | `createChangeHistoryHttpAdapter`, hooks (`useChangeHistoryList`, `useChangeHistoryDetail`, `useChangeHistoryRestore`, …) |
| Timeline | `ChangeHistoryTimeline`, `ChangeHistoryItem`, `ChangeHistoryFooter`, … |
| Telemetry | `registerChangeHistoryTelemetryEvents`, `createChangeHistoryTelemetryReporter` |
| Errors | `getChangeHistoryErrorCode`, `getChangeHistoryErrorMessage`, `isChangeHistoryErrorCode`, `mapChangeHistoryHttpError` |
| Testing | `@kbn/change-history-ui/mocks` — `TestProvider`, `createMockChangeHistoryAdapter`, fixtures |

## Storybook

From the repo root (with dependencies bootstrapped):

```bash
yarn storybook change_history_ui
```

Stories use the in-memory mock adapter — no Kibana server required.

## Telemetry

Register EBT event types once in the consuming plugin's `setup()`:

```tsx
import { registerChangeHistoryTelemetryEvents } from '@kbn/change-history-ui';

registerChangeHistoryTelemetryEvents(analytics);
```

### Lazy registration (bundle size)

To avoid pulling React UI into the plugin page-load bundle, lazy-load the dedicated telemetry entry:

```tsx
void import('@kbn/change-history-ui/telemetry').then(
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
| `change_history_filter_applied` | Change history filter applied | Filter UI applies a change *(post-v1)* | `filterType` (`timeRange` \| `actor`), optional `hasActiveTimeRange`, `activeActorCount` |
| `change_history_diff_viewed` | Change history diff viewed | Preview consumer calls `diffTelemetry.reportDiffViewed()` when a non-empty diff is shown | `comparisonType` (`vs_previous` \| `vs_row`), optional `versionDistance` (from `metadata.version` when both rows include it), `compareMode`, `hasChangesSummaryTooltip` |
| `change_history_diff_change_navigated` | Change history diff change navigated | Preview consumer reports diff navigation (e.g. hunk prev/next) | `navigationSource` (consumer-defined keyword) |
| `change_history_restore_confirmed` | Change history restore confirmed | User confirms restore in the dialog | optional `restoredFromSequence`, `currentSequence`, `rollbackDistance`, `hadUnsavedLocalEdits` |
| `change_history_restore_completed` | Change history restore completed | Restore API succeeds | same sequence fields + optional `hadUnsavedLocalEdits` + optional `durationMs` (confirm → API success) |
| `change_history_restore_failed` | Change history restore failed | Restore API fails | optional sequence fields + optional `hadUnsavedLocalEdits` + optional `errorCode` (e.g. `RESTORE_CONFLICT`) |

`rollbackDistance` is `currentSequence - restoredFromSequence` when both are present. Sequence fields are omitted when list rows lack `object.sequence`.

## Tests

```bash
node scripts/jest x-pack/platform/packages/shared/kbn-change-history-ui
node scripts/type_check --project x-pack/platform/packages/shared/kbn-change-history-ui/tsconfig.json
```
