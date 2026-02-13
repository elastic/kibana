# @kbn/alerting-v2-rule-form

This package provides UI components for creating and editing v2 alerting rules with ES|QL queries.

## Exports

- `ESQLRuleFormFlyout` - A complete flyout component with form handling and rule creation
- `RuleFields` - Form field components for embedding in your own form
- `FormValues` - TypeScript type for the form data

## Usage

### ESQLRuleFormFlyout

Use this when you want a complete flyout experience with built-in form handling and rule creation.

```tsx
import React from 'react';
import { ESQLRuleFormFlyout } from '@kbn/alerting-v2-rule-form';

function MyComponent({ services, query, onClose }) {
  return (
    <ESQLRuleFormFlyout
      services={{
        http: services.http,
        data: services.data,
        dataViews: services.dataViews,
        notifications: services.notifications,
      }}
      query={query}
      defaultTimeField="@timestamp"
      onClose={onClose}
      isQueryInvalid={false}
      push={true} // Use push flyout (default) or overlay
    />
  );
}
```

### RuleFields

Use this when you want to embed the rule fields in your own form with custom form handling.

```tsx
import React from 'react';
import { useForm } from 'react-hook-form';
import { RuleFields, type FormValues } from '@kbn/alerting-v2-rule-form';

function MyCustomForm({ services, query }) {
  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: {
      name: '',
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
    // Handle form submission
    console.log(data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <RuleFields
        control={control}
        errors={errors}
        setValue={setValue}
        services={{
          http: services.http,
          data: services.data,
          dataViews: services.dataViews,
        }}
        query={query}
      />
      <button type="submit">Save Rule</button>
    </form>
  );
}
```

## FormValues Type

```typescript
interface FormValues {
  name: string;
  tags: string[];
  schedule: {
    custom: string; // Duration string like '5m', '1h'
  };
  enabled: boolean;
  query: string; // ES|QL query
  timeField: string;
  lookbackWindow: string; // Duration string
  groupingKey: string[]; // Columns to group alerts by
}
```

## Required Services

Both components require the following Kibana services:

| Service | Description |
|---------|-------------|
| `http` | Core HTTP service for API calls |
| `data` | Data plugin for ES|QL query column fetching |
| `dataViews` | Data views plugin for time field options |
| `notifications` | (Flyout only) For success/error toasts |

## Development

### Storybook

This package includes Storybook stories for visual development and testing.

To run Storybook:

```bash
yarn storybook alerting_v2_rule_form
```

Stories are located in `flyout/__stories__/`.
