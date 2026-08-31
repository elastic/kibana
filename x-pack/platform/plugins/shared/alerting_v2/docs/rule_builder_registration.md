# Registering a Rule Builder

A rule builder lets users author an ES|QL rule from structured parameters instead of writing the
query by hand. This guide explains how a plugin contributes one.

A builder has two independent surfaces:

| Surface | Contract | Registered via | Purpose |
|---------|----------|----------------|---------|
| **Server** | `BuilderTypeDefinition` | `alertingV2.registerBuilderType()` in your plugin's `setup()` | Validates `metadata.builder_fields` and generates the rule's ES\|QL query |
| **Client** | `RuleBuilderDefinition` | the rule form package's builder registry | Renders the builder's form in the rule creation flyout |

Most of this guide covers the server surface, which is the one that owns the data: registering it
is enough to author rules of your builder type over the API. [Reopening a rule in the
builder](#reopening-a-rule-in-the-builder-client) covers the part of the client surface that has
to agree with it.

## What the server owns

A builder-authored rule stores the parameters it was configured with in `metadata.builder_fields`,
alongside the `metadata.builder_type` naming the builder that owns them. The query is **not** sent
by the client: the server generates it from those fields on every write, so the stored query cannot
drift away from the parameters that describe it.

```
  Caller (UI or API)                        Server (alerting_v2 plugin)
  ──────────────────                        ───────────────────────────
  metadata.builder_type
        + metadata.builder_fields   ──►     RulesClient
        (no query)                              │
                                                ▼
                                          BuilderTypeRegistry
                                                │
                                     ┌──────────┴──────────┐
                                     │                     │
                              validate(fields)     generateQuery(fields)
                                     │                     │
                                     └──────────┬──────────┘
                                                │
                                                ▼
                                           Saved object:
                                             query (generated)
                                             builder_type
                                             builder_fields
                                                │
        ◄───────────────────────────────────────┘
   API response (query + builder_fields)
```

## Server-side registration

### The `BuilderTypeDefinition` contract

```typescript
import type { z } from '@kbn/zod/v4';
import type { Query } from '@kbn/alerting-v2-schemas';

interface GeneratedQuery {
  query: Query;
  grouping?: { fields: string[] };
  time_field?: string;
}

interface BuilderTypeDefinition<TFields extends object = Record<string, unknown>> {
  /** Unique identifier, matching `metadata.builder_type` on rules. */
  type: string;

  /**
   * Zod schema validating `metadata.builder_fields` for this builder type.
   * Must be fully bounded (`maxLength` on strings, `max` on arrays, `.strict()`
   * objects) to prevent unbounded-input DoS.
   */
  builderFieldsSchema: z.ZodType<TFields>;

  /**
   * Generates the rule's query from validated builder fields. Called on every
   * create and update that writes builder fields. Must be deterministic: the
   * same fields always produce the same query.
   */
  generateQuery: (fields: TFields) => GeneratedQuery;
}
```

`TFields` lets you author a builder against its own field type. Wrap the definition in
`defineBuilderType` from `@kbn/alerting-v2-rule-builders` to type-check its internals while still
fitting the heterogeneous registry:

```typescript
import { defineBuilderType } from '@kbn/alerting-v2-rule-builders';

export const myBuilderType = defineBuilderType<MyBuilderFields>({
  type: 'my_anomaly_detector',
  builderFieldsSchema: myBuilderFieldsSchema,
  generateQuery: generateMyQuery, // receives MyBuilderFields, not a bare record
});
```

### Registering in your plugin

```typescript
// x-pack/plugins/my_plugin/server/plugin.ts

import type { AlertingServerSetup } from '@kbn/alerting-v2-plugin/server';
import { myBuilderType } from './my_builder';

export class MyPlugin {
  setup(core: CoreSetup, { alertingV2 }: { alertingV2: AlertingServerSetup }) {
    alertingV2.registerBuilderType(myBuilderType);
  }
}
```

### Writing the `builderFieldsSchema`

The schema validates `metadata.builder_fields` on every rule create and update, so it is the
trust boundary for the parameters that reach your generator. It must be fully bounded.

```typescript
// x-pack/plugins/my_plugin/server/my_builder.ts

import { z } from '@kbn/zod/v4';

export const myBuilderFieldsSchema = z
  .object({
    indexPattern: z.string().min(1).max(256),
    timeField: z.string().min(1).max(128),
    metric: z.string().min(1).max(128),
    aggregation: z.enum(['avg', 'sum', 'min', 'max', 'count']),
    anomalyThreshold: z.number().min(0).max(100),
    groupByFields: z.array(z.string().min(1).max(128)).max(10).optional(),
  })
  .strict();

export type MyBuilderFields = z.infer<typeof myBuilderFieldsSchema>;
```

### Writing the `generateQuery` function

The function receives already-validated fields and returns a complete `GeneratedQuery`. Its
`query` follows the rule API's own `query` schema, in either `composed` or `standalone` format.

```typescript
import { BuilderQueryGenerationError } from '@kbn/alerting-v2-rule-builders';

export const generateMyQuery = (fields: MyBuilderFields): GeneratedQuery => {
  const base = [
    `FROM ${fields.indexPattern}`,
    `| STATS ${fields.metric}_value = ${fields.aggregation.toUpperCase()}(${fields.metric})`,
    ...(fields.groupByFields?.length ? [`BY ${fields.groupByFields.join(', ')}`] : []),
  ].join('\n  ');

  return {
    query: {
      format: 'composed' as const,
      base,
      breach: { segment: `| WHERE ${fields.metric}_value > ${fields.anomalyThreshold}` },
    },
    time_field: fields.timeField,
    ...(fields.groupByFields?.length ? { grouping: { fields: fields.groupByFields } } : {}),
  };
};
```

Requirements:

- Be **deterministic** — the same fields always produce the same query.
- Return ES|QL that passes the rule query schema. Throw `BuilderQueryGenerationError` for fields
  your schema accepts but you cannot render (the server turns it into a `400`).
- `time_field` and `grouping` returned here override what the caller sent, because they are
  derived from the same fields as the query and would otherwise be free to drift from it.
- Use the `composed` format for rules that need breach and recovery segments, `standalone` when a
  single full query is enough. You need not generate one format per rule kind: a signal rule runs
  only a breach query, so a composed query is flattened onto its breach segment for it. Generating
  a recovery segment for a signal rule is refused, since a signal rule cannot recover.
- The generated query is held to the same cross-field rules as one sent by a caller — for example,
  `recovery_strategy: "query"` requires a recovery block — and a violation is reported against
  your builder.

### Constraints checked at registration

- `type` must be unique across all registered builder types; a duplicate throws.
- `builderFieldsSchema` must be fully bounded; an unbounded string or array throws.
- Registration must happen during `setup()`.

## Authoring rules over the API

### Creating

```
POST /api/alerting/v2/rules
{
  "kind": "alert",
  "metadata": {
    "name": "High error rate (anomaly)",
    "builder_type": "my_anomaly_detector",
    "builder_fields": {
      "indexPattern": "logs-*",
      "timeField": "@timestamp",
      "metric": "error_rate",
      "aggregation": "avg",
      "anomalyThreshold": 75,
      "groupByFields": ["service.name"]
    }
  },
  "schedule": { "every": "5m" }
}
```

`query` is deliberately absent: the server generates it. The response carries both the generated
query and the `builder_fields` that produced it.

### Updating the parameters

```
PATCH /api/alerting/v2/rules/{id}
{
  "metadata": {
    "builder_fields": { ...same shape, anomalyThreshold: 90 }
  }
}
```

The fields are re-validated and the query regenerated.

### Handing the query back to the caller

```
PATCH /api/alerting/v2/rules/{id}
{
  "metadata": { "builder_type": null },
  "query": {
    "format": "composed",
    "base": "FROM logs-* | STATS error_rate = AVG(error_rate) BY service.name",
    "breach": { "segment": "| WHERE error_rate > 90" }
  }
}
```

`builder_type: null` drops the builder association and its parameters together, so the same
request may set `query` directly.

## Write protection

A builder rule's query is derived, so writes that would desynchronize it from the parameters that
describe it are refused:

| Request on a rule with a `builder_type` | Behavior |
|---|---|
| `builder_fields` (no `query`) | Re-validated, query regenerated |
| A `query` that differs from the stored one | **400** `BUILDER_TYPE_NOT_CLEARED` |
| The query the rule already has | Accepted, so the rule form can resubmit what it loaded |
| `query` + `builder_type: null` | Accepted; drops the builder tag and its fields |
| `query` + `builder_fields` | **400** — two sources for one query |
| `builder_fields` + `builder_type: null` | **400** — contradictory intent |
| A different `builder_type` without `builder_fields` | **400** — the stored fields belong to the previous builder |

Requests that touch neither the query nor the builder are never blocked, so a rule whose builder
plugin has since been disabled can still be renamed, retagged, rescheduled, enabled and disabled.

## Reopening a rule in the builder (client)

The builder's form state and its persisted `builder_fields` are related but not identical: a form
row usually carries view-only concerns — a React list key, a collapsed flag — that the server's
strict schema rejects. A client-side `RuleBuilderDefinition` therefore declares how to convert
between the two:

```typescript
const myBuilder: RuleBuilderDefinition<MyFormValues> = {
  type: 'my_anomaly_detector',
  // …form rendering…

  /** Strips the parts of the form the server does not store. */
  toFields: (values) => ({
    indexPattern: values.indexPattern,
    metric: values.metric,
    conditions: values.conditions.map(({ id, ...condition }) => condition),
  }),

  /** Re-keys the rows so the form can render them. Null means "cannot reopen". */
  fromFields: (fields) => {
    const parsed = myBuilderFieldsSchema.safeParse(fields);
    if (!parsed.success) {
      return null;
    }
    return {
      ...parsed.data,
      conditions: parsed.data.conditions.map((condition) => ({ ...condition, id: generateId() })),
    };
  },
};
```

Both are optional: a builder whose form state is already the persisted shape needs neither.

Two rules of thumb keep this honest:

- Validate in `fromFields` against the same schema the server uses, and return `null` when it
  fails. A rule written by a newer Kibana, or by a builder whose fields have since changed shape,
  then opens in ES|QL mode instead of a half-populated form that would silently drop
  configuration on save.
- Keep `toFields` free of the form's transient state. Anything it emits is validated by the
  server's schema on every save, so a stray `id` or `isExpanded` surfaces to the user as a 400.

`parseState` reconstructs form state by parsing a saved ES|QL query. It exists only for rules
saved before `builder_fields`, and remains best-effort: a query the user has since hand-edited
cannot be parsed back. Rules that carry builder fields never take that path.

## Testing

`builderFieldsSchema` and `generateQuery` live in your own package, so test them there — no
alerting test harness needed. `generateQuery` is pure, which makes the assertions exact:

```typescript
describe('generateMyQuery', () => {
  it('generates a breach segment from the threshold', () => {
    const { query } = generateMyQuery(validFields);

    expect(query).toEqual({
      format: 'composed',
      base: 'FROM logs-* | STATS error_rate_value = AVG(error_rate)',
      breach: { segment: '| WHERE error_rate_value > 75' },
    });
  });

  it('rejects fields it cannot render as ES|QL', () => {
    expect(() => generateMyQuery({ ...validFields, metric: '' })).toThrow(
      BuilderQueryGenerationError
    );
  });
});
```

The registration-time guarantees (unique type, fully bounded schema) and the write protection are
covered by the alerting v2 plugin's own tests in `server/lib/builder_types` and
`server/lib/rules_client`, so you do not need to re-test them.

## Checklist

- [ ] Define a `builderFieldsSchema` (Zod, fully bounded, `.strict()`)
- [ ] Implement `generateQuery` (deterministic, valid ES|QL)
- [ ] Wrap both in `defineBuilderType<YourFields>()`
- [ ] Register during `setup()` via `alertingV2.registerBuilderType()`
- [ ] Unit-test the schema and the generator in your own package
