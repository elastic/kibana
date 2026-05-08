# Alerting Plugin

## Architecture

The alerting plugin has three main layers:
- **Routes** (`server/routes/rule/apis/`) — HTTP handlers, request validation, response transformation
- **Application** (`server/application/rule/`) — Business logic and rules client methods
- **Alerts Service** (`server/alerts_service/`) — Alert-as-data indexing and lifecycle

## Adding a New Route

Each route lives in its own directory under `server/routes/rule/apis/{action_name}/`:

```
server/routes/rule/apis/create/
├── create_rule_route.ts       # Route handler
├── create_rule_route.test.ts  # Unit test
├── index.ts                   # Re-export
└── transforms/                # Request/response transformers
```

- Schema definitions live in `common/routes/rule/apis/{action_name}/`
- Route handlers call through to the rules client — never contain business logic directly
- Use `verifyAccessAndContext` and `DEFAULT_ALERTING_ROUTE_SECURITY` for all routes
- Register new routes in `server/routes/rule/apis/register_routes.ts`

## Testing Requirements

- **Unit tests**: Every new server file needs a co-located `.test.ts` file
- **Integration tests**: New API endpoints need tests in `x-pack/platform/test/alerting_api_integration/`
- **Scout tests**: Prefer Scout for new API tests: `x-pack/platform/plugins/shared/alerting/test/scout/`
- **Config changes**: When adding config options, add tests in `server/config.test.ts`
- **UI tests**: Use React Testing Library (RTL). Never write new Enzyme tests.

## Common Patterns

### Rules Client Methods

Methods on the rules client follow this pattern:
- Input types defined in `server/application/rule/methods/{method}/types/`
- Schema validation in `server/application/rule/methods/{method}/schemas/`
- Unit tests in `server/application/rule/methods/{method}/{method}.test.ts`

### Alerts Client

The alerts client (`server/alerts_client/alerts_client.ts`) handles alert CRUD.
- Always include audit events for state changes
- Use `SavedObjectsUtils.getName()` for the `name` field in audit events
- Alert data uses index templates with field limits — be aware of `total_fields.limit`

### Index Templates

When updating index templates:
- Strip system-managed read-only properties before PUT (`created_date`, `created_date_millis`, `modified_date`, `modified_date_millis`)
- These fields are returned by GET but rejected by PUT

## Rules to Follow

### Breaking Changes

- Never add required validation to existing schemas without a deprecation path
- Adding a new required field to an existing response is a breaking change
- Changing HTTP methods or status codes requires API versioning
- Internal APIs have more flexibility but still need migration paths

### Security

- Platform test code cannot import from solution plugins (e.g., don't import securitySolution in platform tests)
- Feature privileges are split between `rule` and `alert` entities
- When checking authorization, distinguish between feature being disabled vs user lacking permission
- Use `alerting:rule` and `alerting:alert` privilege strings correctly

### Performance

- Avoid unnecessary ES searches — if the results aren't used, remove the query
- For bulk operations, use a single code path that handles both single and bulk
- Prefer single ESQL queries over multiple sequential ES calls when possible

### Code Style

- Use early returns to reduce nesting
- Extract complex conditions into well-named boolean variables or functions
- Remove dead code — don't leave TODOs for cleanup that won't happen
- Use existing constants (e.g., `ALERT_ACTIONS_DATA_STREAM`) instead of hardcoded strings
- Prefer lodash utilities (`groupBy`, `omit`) over manual implementations

## Key Utilities

- `verifyAccessAndContext` — use for all route authorization
- `transformRuleToRuleResponseV1` — standard rule-to-response mapping
- `handleDisabledApiKeysError` — standard API key error handling
- `validateInternalRuleType` — check if a rule type is internal before mutation
- `countUsageOfPredefinedIds` — telemetry for predefined IDs
