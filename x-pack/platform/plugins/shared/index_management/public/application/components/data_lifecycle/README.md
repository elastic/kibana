# Data lifecycle (Index Management)

Shared UI building blocks for configuring **Data Stream Lifecycle (DLM)** in Index Management.

## `EditDataLifecycleFlyout`

The top-level flyout for editing a data stream's lifecycle. Combines DLM phase configuration, ILM policy selection, and failed-data retention in a tabbed UI.

`onApply` receives `{ successfulData, failedData }` where `successfulData` is one of:

| Case | Shape |
|------|-------|
| Inheriting from index template | `{ inheritLifecycle: true }` |
| DLM with phase durations | `{ inheritLifecycle: false, method: 'dlm', frozenAfter?: '30d', dataRetention?: '60d' }` |
| ILM with a selected policy | `{ inheritLifecycle: false, method: 'ilm', ilmPolicyName: string }` |
| ILM but no policy chosen yet | `undefined` |

And `failedData` is `{ inheritLifecycle: true }` or `{ inheritLifecycle: false, failureStoreEnabled: boolean }`.

```tsx
import { EditDataLifecycleFlyout } from './edit_data_lifecycle_flyout';

<EditDataLifecycleFlyout
  onClose={() => setOpen(false)}
  onApply={({ successfulData, failedData }) => {
    // persist successfulData and failedData
  }}
  successfulData={{
    inheritLifecycle,
    onInheritLifecycleChange: setInherit,
    dlm: { hasEnterpriseLicense, hasDefaultSnapshotRepository, ... },
  }}
  failedData={{
    inheritLifecycle: inheritFailed,
    onInheritLifecycleChange: setInheritFailed,
    failureStoreEnabled,
    onFailureStoreChange: setFailureStoreEnabled,
    deletePhase: { value: deletePhase, onChange: setDeletePhase },
  }}
/>;
```

### Key design decisions

- **`onApply` is the single source of truth** for DLM durations. The flyout tracks phase changes internally and includes `frozenAfter` / `dataRetention` in the `successfulData` payload — callers do not need to subscribe to any separate `onChange`.
- `successfulData.dlm.onChange` is intentionally omitted from the prop type; use `onApply` instead.
- `onInheritLifecycleChange` is optional on both `successfulData` and `failedData`. Omitting it hides the inherit toggle entirely.

---

## `DlmPhasesSelector`

Low-level phase selector used internally by `EditDataLifecycleFlyout`. Use this directly only when you need the phase picker without the flyout shell.

Configure DLM phase timings:

- **Hot**: required
- **Frozen**: optional (gated by license + default snapshot repository)
- **Delete**: optional

```tsx
import { DlmPhasesSelector } from './dlm_phases_selector';

<DlmPhasesSelector
  hasEnterpriseLicense={hasEnterpriseLicense}
  hasDefaultSnapshotRepository={hasDefaultSnapshotRepository}
  defaultSnapshotRepository={defaultSnapshotRepositoryName}
  onRefreshDefaultSnapshotRepository={refreshDefaultSnapshotRepository}
  onChange={(value, serialized, isValid) => {
    // value: normalized UI state
    // serialized: { frozen_after?: '30d', data_retention?: '90d' }
    // isValid: duration + ordering validation
  }}
/>;
```

### Props

- `hasEnterpriseLicense` / `hasDefaultSnapshotRepository`: required booleans used to gate the frozen phase toggle.
- `onRefreshDefaultSnapshotRepository`: optional revalidation handler for the default repository modal.
- `defaultValue`: optional initial values (defaults: frozen disabled `30d`, delete disabled `60d`).
- `isDisabled`: disables editing.
- `defaultSnapshotRepository`: optional default repository name shown in the frozen phase "Searchable snapshot" info.
- `manageRepositoriesUrl`: URL for the "manage your repositories" link.
- `onChange(value, serializedValue, isValid)`: called on any change.

Note: this component uses `@kbn/i18n-react`. In Jest/component tests wrap with `__IntlProvider` (see `dlm_phases_selector/dlm_phases_selector.test.tsx`).

### Phase cards (internal building blocks)

`DlmPhasesSelector` is composed of three "card" components under `dlm_phases_selector/`. These are **internal** (not exported from `dlm_phases_selector/index.ts`) but are useful to understand when updating the UX.

- **`HotPhaseCard`** (`dlm_phases_selector/hot_phase_card.tsx`)
  - **Purpose**: renders the required **Hot** phase as always enabled.
  - **Behavior**: `checked` is always true and the card is `disabled`; shows a "Required" badge.
  - **Props**: `id` (checkbox id) and `color` (phase dot color from `usePhaseColors()`).

- **`FrozenPhaseCard`** (`dlm_phases_selector/frozen_phase_card.tsx`)
  - **Purpose**: optional **Frozen** phase configuration (move-to-frozen after a duration).
  - **Gating/disable behavior**:
    - The parent selector computes a `disabledReason` when either:
      - **No Enterprise license** → badge label "Enterprise required" with `iconType: 'lock'`.
      - **No default snapshot repository** → badge label "Default repository required" with `iconType: 'warning'`.
    - When a `disabledReason` is present, the card is disabled and the config UI is hidden even if `duration.enabled` is true.
  - **What it renders when enabled**:
    - `DurationFields` labeled "Move after …"
    - A "Searchable snapshot" info row plus `SearchableSnapshotRepositoryInfo` when `defaultSnapshotRepository` is provided.
  - **Props**: `duration`/`durationError`/`helpText`/`onChange`, `disabled` + optional `disabledReason`, `isFormDisabled`, plus `defaultSnapshotRepository` and `manageRepositoriesHref`.

- **`DeletePhaseCard`** (`dlm_phases_selector/delete_phase_card.tsx`)
  - **Purpose**: optional **Delete** phase configuration (delete after a duration).
  - **Behavior**:
    - Uses a trash icon and a checkbox to toggle `duration.enabled`.
    - The card is disabled via `isCardDisabled` (the selector passes `isDisabled`).
    - `DurationFields` are disabled when either `isFormDisabled` or `isCardDisabled` is true.
  - **Props**: `duration`/`durationError`/`helpText`/`onChange`, `isCardDisabled`, `isFormDisabled`, `id`.

## Development

### Storybook

From the Kibana repo root, run:

```bash
yarn storybook index_management
```
