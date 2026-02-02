# @kbn/response-ops-form-generator

Automatically generates form fields from Zod schemas for use within Kibana's `@kbn/es-ui-shared-plugin` form system.

**Important:** For now, it generates form **fields**, not complete forms. Fields must be rendered within Kibana's `<Form>` component.

## Usage

```typescript
import { Form, useForm } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { generateFormFields } from '@kbn/response-ops-form-generator';

const MyFormComponent = () => {
  const { form } = useForm();

  const schema = z.object({
    username: z.string(),
    apiKey: z.string(),
  });

  return <Form form={form}>{generateFormFields({ schema })}</Form>;
};
```

## Examples

For complete examples:

```sh
node scripts/storybook response-ops
```

## Mental Model

```
Zod Schema → Field Definitions → Widget Components → React Elements
     ↓              ↓                    ↓                  ↓
  z.object()   (validation)        TextWidget       <UseField .../>
               FieldDefinition    (how to render)     (rendered)
```

**Fields** (data layer) define what to validate → **Widgets** (UI layer) define how to render

## Development

```sh
# Run Storybook
node scripts/storybook response-ops

# Run tests
yarn test:jest src/platform/packages/shared/response-ops/form-generator
```

### Extending - Adding a New Widget

1. Create the widget component in `src/widgets/components/`:

```typescript
// my_widget.tsx
import React from 'react';
import type { BaseWidgetProps } from '../types';
import { UseField } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';

export const MyWidget: React.FC<BaseWidgetProps> = ({
  path,
  schema,
  fieldProps,
  fieldConfig,
  formConfig,
}) => {
  return (
    <UseField
      path={path}
      component={MyCustomComponent}
      config={fieldConfig}
      componentProps={fieldProps}
    />
  );
};
```

2. Register it in `src/widgets/registry.ts`:

```typescript
import { MyWidget } from './components/my_widget';

const WIDGET_REGISTRY = {
  // ... existing widgets
  [WidgetType.MyCustomType]: MyWidget,
};
```

3. Add default schema mapping if needed:

```typescript
const getDefaultWidgetForSchema = (schema: z.ZodType) => {
  // ... existing conditions
  if (schema instanceof z.ZodMyCustomType) {
    return WidgetType.MyCustomType;
  }
};
```
