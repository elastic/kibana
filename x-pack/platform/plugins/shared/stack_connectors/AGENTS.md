# Stack Connectors Plugin

## Architecture

Built-in connector type implementations, built on top of the framework in the `actions` plugin.

- **server/connector_types/{name}/** — Server-side connector definitions (schema, executor, service)
- **public/connector_types/{name}/** — UI components for each connector type
- **common/** — Shared types and constants between server and public

## Rules to Follow

### New Connectors Should Not Go Here

This plugin uses the legacy `registerType` pattern with `@kbn/config-schema` validators. New connectors should use:
1. **Connector specs** (`@kbn/connector-specs`) — preferred for HTTP-based connectors
2. **Sub-action framework** (`actions/server/sub_action_framework/`) — when custom service classes are needed

Only add to stack_connectors if extending an existing legacy connector type.

### Schema Validation

- Use `schema.nullable()` instead of `schema.maybe()` for optional config/secrets properties — `maybe()` allows `undefined` which breaks encrypted saved object updates
- Never add required validation to existing connector schemas — this breaks existing saved connectors
- Never change the type of an existing field

### Testing

- **Simulators**: For HTTP-based connectors, create a simulator in `x-pack/platform/test/alerting_api_integration/common/plugins/actions_simulators/server/`
- **Integration tests**: API integration tests in `x-pack/platform/test/alerting_api_integration/`

## Before Declaring Done

After making changes, run these validation steps before reporting completion:
- `node scripts/jest <path-to-changed-test-files>` — run affected unit tests
- `node scripts/eslint --fix <changed-files>` — lint and auto-fix, then commit the result before pushing
- If CI fails on an FTR config your PR doesn't touch, retry — it's likely a flaky infrastructure test
