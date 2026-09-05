# Registering a Rule Builder from your plugin

A rule builder lets users create ES|QL rules from structured form fields instead of writing
queries by hand. The server validates the fields, generates the query, and keeps them in sync on
every save — so the stored rule is always the source of truth.

This guide walks through the five steps to add a builder from your plugin. For a complete working
example, see `x-pack/examples/alerting_v2_rule_builder_example/`.

## Step 1: Define your builder fields schema

The schema is the trust boundary for what reaches your query generator. It must be **fully
bounded** (every string needs `max()`, every array needs `max()`, every object needs `.strict()`).

```typescript
// common/my_builder/schema.ts

import { z } from '@kbn/zod/v4';

export const myBuilderFieldsSchema = z
  .object({
    indexPattern: z.string().min(1).max(256),
    timeField: z.string().min(1).max(128),
    metric: z.string().min(1).max(128),
    aggregation: z.enum(['avg', 'sum', 'min', 'max', 'count']),
    threshold: z.number().min(0).max(1e15),
    groupByFields: z.array(z.string().min(1).max(128)).max(10).optional(),
  })
  .strict();

export type MyBuilderFields = z.infer<typeof myBuilderFieldsSchema>;
```

## Step 2: Implement the query generator

The function receives validated fields and returns a `GeneratedQuery`.

```typescript
// common/my_builder/generate_query.ts

import { BuilderQueryGenerationError, type GeneratedQuery } from '@kbn/alerting-v2-rule-builders';
import type { MyBuilderFields } from './schema';

export const generateMyQuery = (fields: MyBuilderFields): GeneratedQuery => {
  const agg = `${fields.aggregation.toUpperCase()}(${fields.metric})`;

  return {
    query: {
      format: 'composed' as const,
      base: `FROM ${fields.indexPattern} | STATS metric_value = ${agg}`,
      breach: { segment: `| WHERE metric_value > ${fields.threshold}` },
    },
    time_field: fields.timeField,
    ...(fields.groupByFields?.length
      ? { grouping: { fields: fields.groupByFields } }
      : {}),
  };
};
```

Use the `composed` format for rules that need breach and recovery segments, or `standalone` when
a single query is enough. Signal rules automatically flatten a composed query onto its breach
segment.

Throw `BuilderQueryGenerationError` for fields your schema accepts but you cannot render as valid
ES|QL — the server turns it into a `400`.

## Step 3: Wire up the definition

```typescript
// common/my_builder/definition.ts

import { defineBuilderType } from '@kbn/alerting-v2-rule-builders';
import { myBuilderFieldsSchema } from './schema';
import { generateMyQuery } from './generate_query';

export const myBuilderDefinition = defineBuilderType({
  type: 'my_builder',
  builderFieldsSchema: myBuilderFieldsSchema,
  generateQuery: generateMyQuery,
});
```

`defineBuilderType` type-checks the internals against your concrete field type while producing a
shape the registry accepts.

## Step 4: Register in your plugin

```typescript
// server/plugin.ts

import type { AlertingServerSetup } from '@kbn/alerting-v2-plugin/server';
import { myBuilderDefinition } from '../common/my_builder/definition';

export class MyPlugin {
  setup(core: CoreSetup, { alertingVTwo }: { alertingVTwo: AlertingServerSetup }) {
    alertingVTwo.registerBuilderType(myBuilderDefinition);
  }
}
```

Registration must happen during `setup()`. The type must be unique across all plugins.

## Step 5: Register the builder UI (client-side)

To show your builder in the rule creation menu and provide a form for editing, register a
`RuleBuilderDefinition` on the public side:

```typescript
// public/plugin.ts

import type { AlertingV2PublicSetup } from '@kbn/alerting-v2-plugin/public';
import { myRuleBuilder } from './my_builder/builder';

export class MyPlugin {
  setup(core: CoreSetup, { alertingVTwo }: { alertingVTwo: AlertingV2PublicSetup }) {
    alertingVTwo.registerRuleBuilder(myRuleBuilder);
  }
}
```

The builder definition includes the create-option card metadata, the form component, and a
`toFields` adapter that converts the form state into `metadata.builder_fields`:

```typescript
// public/my_builder/builder.ts

import React from 'react';
import type { RuleBuilderDefinition } from '@kbn/alerting-v2-rule-form';
import type { MyBuilderFields } from '../../common/my_builder/schema';

const MyBuilderStep = React.lazy(() => import('./my_builder_step'));

export const myRuleBuilder: RuleBuilderDefinition<MyBuilderFields> = {
  type: 'my_builder',
  createOption: {
    title: 'My Builder',
    description: 'Create rules using my builder.',
    iconType: 'myIcon',
    flyoutTitle: 'Create My Builder rule',
    order: 20,
  },
  stepTitle: 'Configure my builder',
  createDefaultState: () => ({
    indexPattern: '',
    timeField: '@timestamp',
    metric: '',
    aggregation: 'avg',
    threshold: 0,
  }),
  // Maps form state to metadata.builder_fields for storage.
  // Use an identity function when the form state matches the stored shape exactly.
  toFields: (state) => state,
  // Reconstructs form state from stored builder_fields when reopening a rule.
  // Use an identity function when the stored shape matches the form state exactly.
  fromFields: (fields) => fields,
  renderStep: () =>
    React.createElement(React.Suspense, { fallback: null }, React.createElement(MyBuilderStep)),
  validate: (_formValues, builderState) => isMyBuilderFormValid(builderState),
};
```

If your form state contains UI-only concerns (e.g. React list keys, collapsed panel flags) that
shouldn't be stored, use `toFields` to strip them before saving and `fromFields` to restore them
when reopening. When the form shape matches the stored shape exactly, identity functions are
sufficient for both. Builders without `toFields` will not send `builder_fields` on save.

## Key rules

- **`query` and `builder_fields` are mutually exclusive.** A rule is either builder-managed or
  hand-written ES|QL, never both.
- **`builder_fields` requires `builder_type`.** The type names the schema that validates them.
- **The server owns the query.** Callers send `builder_type` + `builder_fields` without a
  `query`; the server generates it.
- **`time_field` and `grouping`** returned by `generateQuery` override what the caller sent, since
  they derive from the same fields as the query.
- **Editing a builder rule's query directly is blocked** unless the caller also sends
  `builder_type: null` to opt out of the builder (which drops `builder_fields` too).

