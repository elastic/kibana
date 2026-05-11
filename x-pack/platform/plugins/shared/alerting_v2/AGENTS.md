# Alerting V2 Plugin

## Architecture

Next-generation alerting system using data streams and ESQL.

Key modules:
- **setup/** — Plugin initialization, resource creation, route binding
- **routes/** — HTTP handlers with Zod schemas
- **lib/** — Business logic clients (alert_actions_client, rule executor, director)
- **resources/** — Data stream definitions, index mappings, constants

For route patterns, ESQL conventions, naming rules, and testing requirements, see the development skill at `.agents/skills/alerting-v2-development/SKILL.md`.

## Rules to Follow

### Design Principles

- One client per resource domain (alerts client, actions client, director)
- Clients are scoped to the user (respect RBAC via feature privileges)
- Services handle ES interaction — clients handle business logic and authorization
- For user info, create a user service rather than inline calls to security plugin

### Data Streams

- Use constants from `resources/` (e.g., `ALERT_ACTIONS_DATA_STREAM`) — never hardcode data stream names
- Data streams require `create` op (not `index`) for new documents

### ESQL

- Use ESQL composers for building queries — not raw strings
- For bulk operations, write a single ESQL query that handles both single and bulk (same code path) — don't create separate code paths

### Error Handling

- Use typed error classes (e.g., `isResponseError(error)` guard)
- Return 404 when resources not found — don't throw generic errors

## Before Declaring Done

After making changes, run these validation steps before reporting completion:
- `node scripts/jest <path-to-changed-test-files>` — run affected unit tests
- `node scripts/eslint --fix <changed-files>` — lint and auto-fix, then commit the result before pushing
- `node scripts/check_mappings_update --fix` — required if you touched saved object schemas or mappings
- If CI fails on an FTR config your PR doesn't touch, retry — it's likely a flaky infrastructure test

### PR Guidelines

- Target <500 lines changed and <20 files per PR. Split large features into schema → server logic → tests → UI.
- Include a "why this approach" note in the PR description when there are multiple valid approaches
