# Alerting Plugin

## Architecture

Three main layers:
- **Routes** (`server/routes/rule/apis/`) — HTTP handlers, request validation, response transformation
- **Application** (`server/application/rule/`) — Business logic and rules client methods
- **Alerts Service** (`server/alerts_service/`) — Alert-as-data indexing and lifecycle

For route patterns, rules client conventions, index templates, testing requirements, and key utilities, see the development skill at `.agents/skills/alerting-development/SKILL.md`.

## Rules to Follow

### Breaking Changes

- Never add required fields to existing request schemas (body, params, query) without a deprecation path — existing API callers will break
- Never change the type of an existing field in a request or response schema
- Always ask: "Does existing usage of this API still work after this change?"
- Changing HTTP methods or status codes requires API versioning
- Internal APIs have more flexibility but still need migration paths

### Security and Audit

- Platform test code cannot import from solution plugins (e.g., don't import securitySolution in platform tests)
- Feature privileges are split between `rule` and `alert` entities
- When checking authorization, distinguish between feature being disabled vs user lacking permission
- Use `alerting:rule` and `alerting:alert` privilege strings correctly
- Always include `name` in audit events using `SavedObjectsUtils.getName()` — missing names silently break audit log consumers

## Before Declaring Done

After making changes, run these validation steps before reporting completion:
- `node scripts/jest <path-to-changed-test-files>` — run affected unit tests
- `node scripts/eslint --fix <changed-files>` — lint and auto-fix, then commit the result before pushing
- `node scripts/check_mappings_update --fix` — required if you touched saved object schemas or mappings
- If CI fails on an FTR config your PR doesn't touch, retry — it's likely a flaky infrastructure test

### PR Guidelines

- Target <500 lines changed and <20 files per PR. Split large features into schema → server logic → tests → UI.
- Include a "why this approach" note in the PR description when there are multiple valid approaches
