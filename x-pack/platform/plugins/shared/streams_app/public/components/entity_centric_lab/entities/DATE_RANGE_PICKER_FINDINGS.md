# Date Range Picker — Audit & 3-Day Constraint

## Context

The Entity Centric Lab has two rendering paths for the date picker depending on the `isElasticOn` feature flag:

| Branch | Component | Location |
|---|---|---|
| **ElasticOn** (default) | `unifiedSearch.ui.SearchBar` with built-in date picker | ~line 2206 |
| **Non-ElasticOn** | Standalone `<EuiSuperDatePicker>` | ~line 2590 |

## `EuiSuperDatePicker` — What Can Be Customised

| Prop | Type | Effect |
|---|---|---|
| `commonlyUsedRanges` | `Array<{ start, end, label }>` | Replaces the "Commonly used" quick-select presets (e.g. "Last 15 min", "Last 1 hour") |
| `minDate` | `Moment` | Greys out calendar dates before this. Only affects the **Absolute** tab calendar — does **not** block the Relative tab or typed input |
| `maxDate` | `Moment` | Greys out calendar dates after this |
| `customQuickSelectRender` | `(props) => ReactNode` | Completely replace the quick-select panel content |
| `customQuickSelectPanels` | `QuickSelectPanel[]` | Add extra panels to the quick-select popover |
| `isQuickSelectOnly` | `boolean` | Hides Absolute/Relative/Now tabs entirely; only shows quick-select |
| `dateFormat` | `string` | Display format for dates |
| `isAutoRefreshOnly` | `boolean` | Only shows the auto-refresh controls |
| `isDisabled` | `boolean` | Disables the entire picker |
| `showUpdateButton` | `boolean \| 'iconOnly'` | Controls the "Update"/"Refresh" button |
| `width` | `'auto' \| 'restricted' \| 'full'` | Layout width |

### What CANNOT be natively customised

- **Cannot hide the Absolute / Relative / Now tabs** individually (only all-or-nothing via `isQuickSelectOnly`)
- **Cannot restrict max range span** (e.g. "no more than 3 days") — `minDate`/`maxDate` only constrain individual date boundaries, not the delta between start and end
- **Cannot restrict the Relative tab** inputs (a user can type "10 months ago" and it'll accept it)
- **Cannot add validation feedback** inside the popover (no `isInvalid` prop or validation callback)

## `unifiedSearch.ui.SearchBar` — Date Picker Props

The unified `SearchBar` component wraps `QueryBarTopRow`, which internally renders its own `EuiSuperDatePicker`. Relevant props:

| SearchBar Prop | Purpose |
|---|---|
| `showDatePicker` | `boolean` — show/hide the built-in date picker |
| `dateRangeFrom` / `dateRangeTo` | Current range values |
| `isRefreshPaused` / `refreshInterval` | Auto-refresh state |
| `showAutoRefreshOnly` | Only show auto-refresh controls |

### What it does NOT expose

- **No `minDate` / `maxDate` passthrough** to the inner `EuiSuperDatePicker`
- **No `commonlyUsedRanges` prop** — the quick-select presets come from `uiSettings` (`timepicker:quickRanges`) which is a global Kibana setting, not per-component
- **No `customQuickSelectRender`** passthrough
- **No date validation callback**

In short: **the unified SearchBar's date picker cannot be constrained per-component**. The only way to customise it is through global Kibana advanced settings.

## Implemented Strategy (Belt & Suspenders)

### 1. Prevention — Make it hard to pick > 3 days

- Set `showDatePicker={false}` on the unified `SearchBar` to hide its unconstrained picker
- Render a standalone `<EuiSuperDatePicker>` alongside it with:
  - `minDate={moment().subtract(3, 'days')}` — greys out old calendar dates
  - `commonlyUsedRanges` limited to ≤ 3-day presets only

### 2. Validation — Catch anything that slips through

The Relative tab and typed input can still bypass `minDate`, so `handleTimeChange` validates before applying:

```typescript
const MAX_RANGE_DAYS = 3;
const handleTimeChange = useCallback(
  ({ start, end }: { start: string; end: string }) => {
    const parsedStart = datemath.parse(start);
    const parsedEnd = datemath.parse(end, { roundUp: true });
    if (parsedStart && parsedEnd) {
      const diffDays = parsedEnd.diff(parsedStart, 'days', true);
      if (diffDays > MAX_RANGE_DAYS) {
        notifications.toasts.addWarning({
          title: 'Date range limited to 3 days',
          text: 'Please select a date range of 3 days or less.',
        });
        return; // reject the change
      }
    }
    updateTimeRange({ from: start, to: end });
  },
  [updateTimeRange, notifications.toasts]
);
```

Uses `@kbn/datemath` to parse relative expressions like `now-7d` into absolute moments, then checks the span.

### 3. What's NOT covered

- If a user sets the range via the **browser URL** (`?rangeFrom=now-30d&rangeTo=now`), the validation doesn't fire (no `onTimeChange` event). This could be addressed by adding a `useEffect` that checks `rangeFrom`/`rangeTo` on mount and clamps them.
- If `datemath.parse` returns `undefined` (invalid input), we allow the change through rather than blocking — this is intentional to avoid false negatives.

## Alternative Approaches Considered

| Approach | Pros | Cons |
|---|---|---|
| `isQuickSelectOnly={true}` | Hides Absolute/Relative tabs entirely | Too restrictive; users can't pick a custom time at all |
| Global `uiSettings` (`timepicker:quickRanges`) | Works for SearchBar's built-in picker | Affects ALL date pickers in Kibana, not just this page |
| `customQuickSelectRender` | Full control over quick-select UI | Doesn't affect Absolute/Relative tabs |
| Validation in `handleTimeChange` (chosen) | Catches all paths including Relative tab | Toast appears after the fact, not inline |
| `useEffect` clamp on mount | Catches URL-based overrides | Extra complexity; not needed for prototype |
