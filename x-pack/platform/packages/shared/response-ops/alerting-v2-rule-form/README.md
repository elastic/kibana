# @kbn/alerting-v2-rule-form

This package provides UI components for creating and editing v2 alerting rules with ES|QL queries.

## Quick Start

### For Discover Integration

Use `DynamicRuleFormFlyout` when the form needs to react to external query changes. The query editor is hidden since the query is controlled externally:

```tsx
import { DynamicRuleFormFlyout } from '@kbn/alerting-v2-rule-form';

function MyComponent({ services, query, onClose }) {
  return (
    <DynamicRuleFormFlyout
      services={services}
      query={query}
      onClose={onClose}
    />
  );
}
```

### For Plugin Integration

Use `StandaloneRuleFormFlyout` for a classic flyout where the user controls everything, including the ES|QL query via a built-in editor:

```tsx
import { StandaloneRuleFormFlyout } from '@kbn/alerting-v2-rule-form';

function MyComponent({ services, initialQuery, onClose }) {
  return (
    <StandaloneRuleFormFlyout
      services={services}
      query={initialQuery}
      onClose={onClose}
    />
  );
}
```

### For Page Integration with Internal Submission

Use `StandaloneRuleForm` with `includeSubmission` to let the form handle the API call internally:

```tsx
import { StandaloneRuleForm } from '@kbn/alerting-v2-rule-form';

function CreateRulePage({ services, onSuccess, onCancel }) {
  return (
    <StandaloneRuleForm
      query="FROM logs-*"
      services={services}
      includeSubmission
      includeYaml
      onSuccess={onSuccess}
      onCancel={onCancel}
      submitLabel="Create rule"
    />
  );
}
```

## Architecture

The package uses a composable architecture with multiple layers:

| Export | Query Editor | Use Case |
|--------|--------------|----------|
| `DynamicRuleFormFlyout` | Hidden | Complete flyout that syncs with external query changes (Discover) |
| `StandaloneRuleFormFlyout` | Visible | Complete flyout with static initialization and editable query (plugins) |
| `RuleFormFlyout` + `DynamicRuleForm` | Hidden | Composable pattern for custom flyout behavior |
| `RuleFormFlyout` + `StandaloneRuleForm` | Visible | Composable pattern for custom flyout behavior |
| `StandaloneRuleForm` with `includeSubmission` | Visible | Standalone form that handles API call internally |

## Composable Pattern

For advanced customization, use the composable pattern with the base `RuleFormFlyout`:

### Dynamic Form (Syncs with Props)

```tsx
import { RuleFormFlyout, DynamicRuleForm } from '@kbn/alerting-v2-rule-form';

function DiscoverRuleFlyout({ services, query, onClose, onSubmit }) {
  return (
    <RuleFormFlyout
      onClose={onClose}
      push={true}
    >
      <DynamicRuleForm
        query={query}
        onSubmit={onSubmit}
        services={{
          http: services.http,
          data: services.data,
          dataViews: services.dataViews,
        }}
      />
    </RuleFormFlyout>
  );
}
```

The `DynamicRuleForm` uses react-hook-form's `values` prop with `resetOptions: { keepDirtyValues: true }` to:
- Automatically sync form state when `query` prop changes
- Preserve user-modified fields (dirty values) during sync

### Standalone Form (Static Initialization)

```tsx
import { RuleFormFlyout, StandaloneRuleForm } from '@kbn/alerting-v2-rule-form';

function PluginRuleFlyout({ services, initialQuery, onClose, onSubmit }) {
  return (
    <RuleFormFlyout
      onClose={onClose}
      push={true}
    >
      <StandaloneRuleForm
        query={initialQuery}
        onSubmit={onSubmit}
        services={{
          http: services.http,
          data: services.data,
          dataViews: services.dataViews,
        }}
      />
    </RuleFormFlyout>
  );
}
```

The `StandaloneRuleForm` uses react-hook-form's `defaultValues` for static initialization - prop changes after mount are ignored.

## FormValues Type

```typescript
interface FormValues {
  kind: RuleKind;
  metadata: {
    name: string;
    enabled: boolean;
    description?: string;
    owner?: string;
    labels?: string[];
  };
  timeField: string;
  schedule: {
    every: string;    // Duration string like '5m', '1h'
    lookback: string; // Duration string
  };
  evaluation: {
    query: {
      base: string;   // The ES|QL query
    };
  };
  grouping?: {
    fields: string[]; // Columns to group alerts by
  };
}
```

## Required Services

All flyout components require:

| Service | Description |
|---------|-------------|
| `http` | Core HTTP service for rule creation API |
| `data` | Data plugin for query column fetching |
| `dataViews` | Data views plugin for time field options |
| `notifications` | For success/error toasts (required for flyouts, optional for forms when using `includeSubmission`) |

## Development

### Storybook

This package includes Storybook stories for visual development and testing.

```bash
yarn storybook alerting_v2_rule_form
```

Stories are located in `flyout/__stories__/`.
