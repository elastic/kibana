# Alerting V2 Plugin

## Architecture

Alerting V2 is the next-generation alerting system using data streams and ESQL.

Key modules:
- **setup/** — Plugin initialization, resource creation, route binding
- **routes/** — HTTP handlers with Zod schemas
- **lib/** — Business logic clients (alert_actions_client, rule executor, director)
- **resources/** — Data stream definitions, index mappings, constants

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

## Testing Requirements

- **Unit tests**: Required for all client methods (e.g., `alert_actions_client.test.ts`)
- **Integration tests**: Deployment-agnostic API integration tests in `x-pack/platform/test/api_integration_deployment_agnostic/apis/alerting_v2/`
- **Test fixtures**: Import types from the plugin where possible — don't duplicate type definitions in test fixtures
- Unit tests complement integration tests — they test mocks yes, but catch type-level issues faster

## ESQL Patterns

- Use ESQL composers for building queries — not raw strings
- ESQL returns flattened objects — use `queryResponseToRecords` from the shared utility to unflatten
- Handle the discrepancy between mapping schemas and ESQL result shapes explicitly
- For bulk operations, write a single ESQL query that handles both single and bulk (same code path)

## Data Streams

- Use constants from `resources/` (e.g., `ALERT_ACTIONS_DATA_STREAM`) — never hardcode data stream names
- Data streams require `create` op (not `index`) for new documents
- Tags, reason, and metadata fields must be in the mappings if they'll be searched

## Rules to Follow

### Design Principles

- One client per resource domain (alerts client, actions client, director)
- Clients are scoped to the user (respect RBAC via feature privileges)
- Services handle ES interaction — clients handle business logic and authorization
- For user info, create a user service rather than inline calls to security plugin

### Naming Conventions

- Client methods: `createAction`, `bulkCreateActions` (camelCase, descriptive verb)
- Schema types: `CreateAlertActionBodySchema`, `CreateAlertActionParamsSchema`
- Route files: `create_alert_action_route.ts` (snake_case with verb prefix)

### Error Handling

- Use typed error classes (e.g., `isResponseError(error)` guard)
- Protected methods for error classification: `isRetryableError(error): boolean`
- Return 404 when resources not found — don't throw generic errors
- Use discriminated error types with clear messages

### Follow-up Pattern

- Mark TODOs for future work but don't block PRs on them
- "Internal API" means more flexibility but still needs a migration path later
- Group routes by resource when the list grows: `routes/rules/`, `routes/alerts/`
