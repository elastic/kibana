# @kbn/data-lifecycle-phases

Canonical phase labels, titles, descriptions, and colors for Elasticsearch data lifecycle phases: `hot`, `warm`, `cold`, `frozen`, `delete`.

Used by both Index Lifecycle Management (ILM) and Data Lifecycle Management (DLM) features.

## Components

### `FlyoutWithTabs`

A generic, reusable flyout shell that renders a title and a tab bar in its header. Tab selection state is managed internally and passed to the `children` render prop, so consumers never need their own tab state.

```typescript
import { FlyoutWithTabs } from '@kbn/data-lifecycle-phases';

const tabs = [
  { id: 'summary', label: 'Summary' },
  { id: 'json', label: 'JSON' },
] as const;

<FlyoutWithTabs
  title="My flyout"
  tabsAriaLabel="My flyout tabs"
  tabs={tabs}
  initialTabId="summary"
  onClose={() => setOpen(false)}
  size={400}
>
  {(selectedTab) => (
    <>
      {selectedTab === 'summary' && <SummaryContent />}
      {selectedTab === 'json' && <JsonContent />}
    </>
  )}
</FlyoutWithTabs>
```

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `title` | `string` | yes | Flyout heading text |
| `tabsAriaLabel` | `string` | yes | Accessible label for the `<EuiTabs>` element |
| `tabs` | `NonEmptyFlyoutTabs<TId>` (`[FlyoutHeaderTab<TId>, ...FlyoutHeaderTab<TId>[]]`) | yes | Tab definitions — must contain at least one entry |
| `initialTabId` | `TId` | no | Tab to select on first render (defaults to first tab) |
| `onClose` | `() => void` | yes | Called when the flyout requests to be closed |
| `size` | `number` | no | Flyout width in pixels (default: `400`) |
| `children` | `(selectedTabId: TId) => ReactNode` | yes | Render prop receiving the active tab ID |

### `InspectIlmPolicyFlyout`

A stateless flyout for inspecting an ILM policy. Displays a **Summary** tab (per-phase accordions with action details) and a **JSON** tab (copyable `PUT _ilm/policy/…` request).

```typescript
import { InspectIlmPolicyFlyout } from '@kbn/data-lifecycle-phases';

<InspectIlmPolicyFlyout
  policyName="my-policy"
  policy={serializedPolicy}
  onBack={() => {}}
  onEditPolicy={(name) => navigateToIlmEditor(name)}
  onSelectAndApply={(name) => applyPolicy(name)}
/>
```

## Development

### Storybook

View and develop the components in Storybook:

```bash
yarn storybook data_lifecycle_phases
```
