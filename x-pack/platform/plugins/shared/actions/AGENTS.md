# Connectors (Actions) Plugin

## Architecture

- **actions** (`x-pack/platform/plugins/shared/actions/`) — Framework: execution engine, sub-action framework, connector client, config, types
- **@kbn/connector-specs** (`src/platform/packages/shared/kbn-connector-specs/`) — Declarative single-file connector specs (preferred for new connectors)
- **stack_connectors** (`x-pack/platform/plugins/shared/stack_connectors/`) — Legacy connector implementations; new connectors should use connector specs or the sub-action framework instead

### Choosing a registration path

- **Connector specs** (`@kbn/connector-specs`): preferred for new HTTP-based connectors. Single-file `ConnectorSpec` with Zod schemas, auto-generated UI, and automatic registration. See the package README.
- **Sub-action framework** (`actions/server/sub_action_framework/`): use when you need custom service classes (e.g., `CaseConnector` for Cases integration). Register via `actions.registerSubActionConnectorType()`.
- **Direct `registerType`**: legacy path for simple `ActionType` connectors. Only use for framework-level or internal connectors.

## Rules to Follow

### Schema Validation — Breaking Changes

This is the single most common source of review friction in connectors:

- **NEVER add required validation to existing connector schemas.** If a connector previously accepted `{ host: "foo.com" }` without a field, making that field required breaks existing saved connectors.
- **NEVER change the type of an existing field.** Changing a field from `string` to `number`, or from optional to required, breaks existing saved connectors.
- To add validation to existing fields: make it **conditional** — only validate when the field is provided.
- To add new required fields: provide a **default value** in the schema or make the field optional.
- Always ask: "Would an existing connector created before this PR still load and execute? Would existing API calls still succeed unchanged?"

### Config vs Secrets

- **Config**: Non-sensitive settings visible in UI and API responses (URL, port, from address)
- **Secrets**: Sensitive data encrypted at rest (passwords, API keys, tokens)
- Never store secrets in config — they'll appear in API responses and logs

### Testing

- The actions plugin provides the execution framework but not connector implementations. Platform tests that need a connector should stub or register a test connector type — never import a specific connector from stack_connectors or connector specs into platform-level tests.

## Before Declaring Done

After making changes, run these validation steps before reporting completion:
- `node scripts/jest <path-to-changed-test-files>` — run affected unit tests
- `node scripts/eslint --fix <changed-files>` — lint and auto-fix only changed files
