# @kbn/alerting-v2-rule-form

This package provides UI components for creating and editing v2 alerting rules with queries.

## Quick Start

### For Discover Integration

Use `DynamicRuleFormFlyout` when the form needs to react to external query changes:

```tsx
import { DynamicRuleFormFlyout } from '@kbn/alerting-v2-rule-form';

function MyComponent({ services, query, isQueryInvalid, onClose }) {
  return (
    <DynamicRuleFormFlyout
      services={services}
      query={query}
      defaultTimeField="@timestamp"
      isQueryInvalid={isQueryInvalid}
      onClose={onClose}
    />
  );
}
```

### For Plugin Integration

Use `StandaloneRuleFormFlyout` for a classic flyout where the user controls everything:

```tsx
import { StandaloneRuleFormFlyout } from '@kbn/alerting-v2-rule-form';

function MyComponent({ services, initialQuery, onClose }) {
  return (
    <StandaloneRuleFormFlyout
      services={services}
      query={initialQuery}
      defaultTimeField="@timestamp"
      onClose={onClose}
    />
  );
}
```

## Architecture

The package uses a composable architecture with multiple layers:

| Export | Use Case |
|--------|----------|
| `DynamicRuleFormFlyout` | Complete flyout that syncs with external query changes (Discover) |
| `StandaloneRuleFormFlyout` | Complete flyout with static initialization (plugins) |
| `RuleFormFlyout` + `DynamicRuleForm` | Composable pattern for custom flyout behavior |
| `RuleFormFlyout` + `StandaloneRuleForm` | Composable pattern for custom flyout behavior |
| `RuleFields` | Low-level fields for fully custom form implementations |

## Composable Pattern

For advanced customization, use the composable pattern with the base `RuleFormFlyout`:

### Dynamic Form (Syncs with Props)

```tsx
import { RuleFormFlyout, DynamicRuleForm } from '@kbn/alerting-v2-rule-form';

function DiscoverRuleFlyout({ services, query, isQueryInvalid, onClose }) {
  return (
    <RuleFormFlyout
      services={{
        http: services.http,
        notifications: services.notifications,
      }}
      onClose={onClose}
      push={true}
    >
      <DynamicRuleForm
        query={query}
        defaultTimeField="@timestamp"
        isQueryInvalid={isQueryInvalid}
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

function PluginRuleFlyout({ services, initialQuery, onClose }) {
  return (
    <RuleFormFlyout
      services={{
        http: services.http,
        notifications: services.notifications,
      }}
      onClose={onClose}
      push={true}
    >
      <StandaloneRuleForm
        query={initialQuery}
        defaultTimeField="@timestamp"
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

## Custom Form Implementation

For advanced use cases where you need complete control over form handling, use `RuleFields` directly:

```tsx
import { useForm, FormProvider } from 'react-hook-form';
import { RuleFields, type FormValues } from '@kbn/alerting-v2-rule-form';

function MyCustomForm({ services, query }) {
  const methods = useForm<FormValues>({
    defaultValues: {
      kind: 'alert',
      name: '',
      description: '',
      tags: [],
      schedule: { custom: '5m' },
      enabled: true,
      query: query,
      timeField: '@timestamp',
      lookbackWindow: '5m',
      groupingKey: [],
    },
  });

  const onSubmit = (data: FormValues) => {
    console.log(data);
  };

  return (
    <FormProvider {...methods}>
      <form onSubmit={methods.handleSubmit(onSubmit)}>
        <RuleFields
          services={{
            http: services.http,
            data: services.data,
            dataViews: services.dataViews,
          }}
          query={methods.watch('query')}
        />
        <button type="submit">Save Rule</button>
      </form>
    </FormProvider>
  );
}
```

## FormValues Type

```typescript
interface FormValues {
  kind: 'signal' | 'alert';
  name: string;
  description: string;
  tags: string[];
  schedule: {
    custom: string; // Duration string like '5m', '1h'
  };
  enabled: boolean;
  query: string;
  timeField: string;
  lookbackWindow: string; // Duration string
  groupingKey: string[]; // Columns to group alerts by
}
```

## Required Services

All flyout components require:

| Service | Description |
|---------|-------------|
| `http` | Core HTTP service for rule creation API |
| `data` | Data plugin for query column fetching |
| `dataViews` | Data views plugin for time field options |
| `notifications` | For success/error toasts |

## Development

### Storybook

This package includes Storybook stories for visual development and testing.

```bash
yarn storybook alerting_v2_rule_form
```

Stories are located in `flyout/__stories__/`.
