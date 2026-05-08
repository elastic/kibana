# Alerting Plugin

## Architecture

Three main layers:
- **Routes** (`server/routes/rule/apis/`) — HTTP handlers, request validation, response transformation
- **Application** (`server/application/rule/`) — Business logic and rules client methods
- **Alerts Service** (`server/alerts_service/`) — Alert-as-data indexing and lifecycle

## Rules to Follow

### Breaking Changes

- Never add required fields to existing request schemas (body, params, query) without a deprecation path — existing API callers will break
- Never change the type of an existing field in a request or response schema
- Always ask: "Does existing usage of this API still work after this change?"
- Changing HTTP methods or status codes requires API versioning
- Internal APIs have more flexibility but still need migration paths

### Security

- Platform test code cannot import from solution plugins (e.g., don't import securitySolution in platform tests)
- Feature privileges are split between `rule` and `alert` entities
- When checking authorization, distinguish between feature being disabled vs user lacking permission
- Use `alerting:rule` and `alerting:alert` privilege strings correctly
