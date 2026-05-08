# Stack Alerts Plugin

## Architecture

Built-in rule types shipped with Kibana, registered with the alerting plugin.

Key modules:
- **server/rule_types/** — Rule type implementations (index_threshold, es_query, transform_health, etc.)
- **public/** — UI components for rule type configuration forms
- **common/** — Shared types between server and public

Each rule type has its own directory under `server/rule_types/{name}/` with its own README.

## Rules to Follow

### Adding a New Rule Type

- Register rule types using the alerting plugin's `registerType()` API
- Each rule type needs: `id`, `name`, `actionGroups`, `defaultActionGroupId`, `executor`, and parameter schemas
- Follow the index_threshold rule type as a reference implementation

### Testing

- **Unit tests**: Required for all rule type logic (co-located `.test.ts`)
- **Integration tests**: API integration tests in `x-pack/platform/test/alerting_api_integration/`
- **UI tests**: Use React Testing Library (RTL). Never write new Enzyme tests.

## Before Declaring Done

After making changes, run these validation steps before reporting completion:
- `node scripts/jest <path-to-changed-test-files>` — run affected unit tests
- `node scripts/eslint --fix <changed-files>` — lint and auto-fix only changed files
