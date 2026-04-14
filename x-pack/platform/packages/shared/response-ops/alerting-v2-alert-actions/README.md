# @kbn/alerting-v2-alert-actions

Declarative alert action type definitions for Alerting V2.

This package is the **single source of truth** for all alert action types. Each action type is defined once with its ID, Zod schema, and ES mapping. The alerting v2 core engine then auto-derives:

- HTTP routes (in `x-pack/platform/plugins/shared/alerting_v2`)
- ES data stream mappings (in `x-pack/platform/plugins/shared/alerting_v2`)
- Discriminated union and bulk schemas (in `@kbn/alerting-v2-schemas`)

## Creating a new action type

### 1. Create a definition file

Add a new file under `src/definitions/`:

```ts
// src/definitions/my_action.ts
import { z } from '@kbn/zod/v4';
import { defineAlertActionType } from '../define';

export const myActionType = defineAlertActionType({
  id: 'my_action',
  description: 'Does something useful.',
  bodySchema: z.object({
    my_field: z.string().describe('Description of the field.'),
  }),
  esMappings: {
    my_field: { type: 'keyword' },
  },
});
```

**Fields:**

| Field | Required | Description |
|---|---|---|
| `id` | Yes | Unique action type identifier. Becomes the `action_type` literal value. |
| `description` | Yes | Human-readable description surfaced in API docs. |
| `bodySchema` | Yes | Zod schema for action-specific body fields. Must **not** include `action_type`. |
| `esMappings` | No | ES mapping properties for fields persisted to the `.alert-actions` data stream. Omit if the action has no extra fields. |
| `pathSuffix` | No | URL path suffix for the route. Defaults to `_${id}`. |

### 2. Register the definition

Add your export and include it in the `alertActionTypeDefinitions` array in `src/index.ts`:

```ts
export { myActionType } from './definitions/my_action';

// ... in the imports section
import { myActionType } from './definitions/my_action';

// ... in the array
export const alertActionTypeDefinitions = [
  // ...existing definitions
  myActionType,
] as const;
```

That's it. Everything else is derived automatically:

- The HTTP route (`POST /api/alerting/v2/alerts/{group_hash}/action/_my_action`) is registered by the alerting v2 plugin automatically.
- The ES mapping is composed into the `.alert-actions` data stream automatically the alerting v2 plugin.
- The discriminated union in `@kbn/alerting-v2-schemas` for the schemas used in routes is built automatically from the `alertActionTypeDefinitions` array.

### 3. (Optional) Export a named per-type body schema

If consumers need a standalone schema/type for this action, add a named export in `@kbn/alerting-v2-schemas` (`src/alert_action_schema.ts`):

```ts
import { myActionType } from '@kbn/alerting-v2-alert-actions';

export const createMyActionAlertActionBodySchema = myActionType.routeBodySchema;
export type CreateMyActionAlertActionBody = z.infer<typeof createMyActionAlertActionBodySchema>;
```

## What gets auto-derived

`defineAlertActionType` produces two additional schemas from your `bodySchema`:

- **`fullSchema`**: your body fields + `action_type: z.literal(id)`. Used as a member of the discriminated union for bulk operations.
- **`routeBodySchema`**: your body fields with `.strict()` applied. Used for HTTP route validation (rejects unknown fields).

## Architecture

```
@kbn/alerting-v2-alert-actions        <-- you are here (definitions)
       |                    \
       v                     v
@kbn/alerting-v2-schemas             alerting_v2 plugin server
(discriminated unions,                (AlertActionTypeRegistry:
 bulk schemas, types)                  routes + ES mappings)
```
