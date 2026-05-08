# Alerting Plugin

## Architecture

Three main layers:
- **Routes** (`server/routes/rule/apis/`) — HTTP handlers, request validation, response transformation
- **Application** (`server/application/rule/`) — Business logic and rules client methods
- **Alerts Service** (`server/alerts_service/`) — Alert-as-data indexing and lifecycle

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
