---
name: alerting-v2-development
description: Adding routes, client methods, or ESQL patterns in the Kibana alerting_v2 plugin. Use when creating new API endpoints with Zod schemas, working with alert actions clients, building ESQL queries, or managing data stream resources.
---

# Alerting V2 Development

## Route Patterns

Routes follow a class-based pattern:

```
routes/
├── create_alert_action_route.ts
├── bulk_create_alert_action_route.ts
├── schemas/
│   └── alert_action_schema.ts
└── index.ts
```

- Schemas use Zod (not `@kbn/config-schema` like v1)
- Route naming: `{verb}_{resource}_route.ts`
- Schema naming: `{resource}_schema.ts`
- Register routes in `setup/bind_routes.ts`
- Use `import type` for types, regular import for schemas

## ESQL Patterns

- Use ESQL composers for building queries — not raw strings
- ESQL returns flattened objects — use `queryResponseToRecords` from the shared utility to unflatten
- Handle the discrepancy between mapping schemas and ESQL result shapes explicitly
- For bulk operations, write a single ESQL query that handles both single and bulk (same code path)

## Naming Conventions

- Client methods: `createAction`, `bulkCreateActions` (camelCase, descriptive verb)
- Schema types: `CreateAlertActionBodySchema`, `CreateAlertActionParamsSchema`
- Route files: `create_alert_action_route.ts` (snake_case with verb prefix)

## Testing Requirements

- **Unit tests**: Required for all client methods (e.g., `alert_actions_client.test.ts`)
- **Integration tests**: Deployment-agnostic API integration tests in `x-pack/platform/test/api_integration_deployment_agnostic/apis/alerting_v2/`
- **Test fixtures**: Import types from the plugin where possible — don't duplicate type definitions in test fixtures

## Follow-up Pattern

- Mark TODOs for future work but don't block PRs on them
- "Internal API" means more flexibility but still needs a migration path later
- Group routes by resource when the list grows: `routes/rules/`, `routes/alerts/`
