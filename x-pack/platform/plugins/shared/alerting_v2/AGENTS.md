# Alerting V2 Plugin

## Architecture

Next-generation alerting system using data streams and ESQL.

Key modules:
- **setup/** — Plugin initialization, resource creation, route binding
- **routes/** — HTTP handlers with Zod schemas
- **lib/** — Business logic clients (alert_actions_client, rule executor, director)
- **resources/** — Data stream definitions, index mappings, constants

## Rules to Follow

### Design Principles

- One client per resource domain (alerts client, actions client, director)
- Clients are scoped to the user (respect RBAC via feature privileges)
- Services handle ES interaction — clients handle business logic and authorization
- For user info, create a user service rather than inline calls to security plugin

### Data Streams

- Use constants from `resources/` (e.g., `ALERT_ACTIONS_DATA_STREAM`) — never hardcode data stream names
- Data streams require `create` op (not `index`) for new documents

### Error Handling

- Use typed error classes (e.g., `isResponseError(error)` guard)
- Return 404 when resources not found — don't throw generic errors

## Before Declaring Done

After making changes, run these validation steps before reporting completion:
- `node scripts/jest <path-to-changed-test-files>` — run affected unit tests
- `node scripts/eslint --fix <changed-files>` — lint and auto-fix only changed files
- `node scripts/check_mappings_update --fix` — if you touched saved object schemas or mappings
