---
name: connector-development
description: Adding or modifying connector types in the Kibana connectors system. Use when creating a new connector type, choosing between connector specs vs sub-action framework vs legacy registerType, adding auth patterns, working with connector UI, or writing connector tests.
---

# Connector Development

## Choosing a Registration Path

### Connector Specs (preferred for new connectors)

Single-file declarative specs in `@kbn/connector-specs` (`src/platform/packages/shared/kbn-connector-specs/`). Uses Zod schemas, auto-generates UI, and registers automatically.

- Spec files live in `kbn-connector-specs/src/specs/{name}/{name}.ts`
- Export from `src/all_specs.ts` to enable automatic discovery
- Server registration: `actions.registerType(createConnectorTypeFromSpec(spec, actions))`
- Feature-flagged via `experimentalFeatures.connectorsFromSpecs` in stack_connectors
- See the `@kbn/connector-specs` README and its skills (`/build-connector`, `/create-connector`) for the full workflow

### Sub-Action Framework

For connectors needing custom service classes — extend `SubActionConnector` or `CaseConnector` (for Cases integration).

- Register via `actions.registerSubActionConnectorType()`
- Service class lives alongside the connector definition
- Sub-actions are registered with `this.registerSubAction({ name, method, schema })`
- See `actions/server/sub_action_framework/README.md` for the full API

### Legacy registerType (stack_connectors)

Direct `ActionType` registration with explicit executor and `@kbn/config-schema` validators. This is the older pattern — avoid for new connectors.

Each legacy connector type lives in `stack_connectors/server/connector_types/{name}/`:

```
server/connector_types/email/
├── index.ts              # Connector definition (schema, executor)
├── index.test.ts         # Unit tests
├── service.ts            # External service interaction (optional)
├── service.test.ts       # Service tests
└── types.ts              # TypeScript types
```

UI components live in `stack_connectors/public/connector_types/{name}/`.

## Auth Patterns

Connectors support multiple auth types (basic, bearer, header-based, SSL):
- Connector specs: use the `auth.types` field (e.g., `['basic', 'bearer']`)
- Sub-action / legacy: auth configuration uses `auth_config.tsx` for the UI
- Secret fields (passwords, tokens) go in `secrets` not `config`
- The `hasAuth` boolean controls whether auth fields are shown/validated

## Testing Requirements

- **Unit tests**: Every connector needs tests for validation, execution, and error cases
- **Integration tests**: API integration tests in `x-pack/platform/test/alerting_api_integration/`
- **Config tests**: Changes to `actions/server/config.ts` require tests in `config.test.ts`
- **UI tests**: Use React Testing Library for all new component tests
- **Platform tests**: Stub or register a test connector type — don't import from stack_connectors or connector specs

## Key Utilities

Before creating new helpers, check whether one already exists:

- `createConnectorTypeFromSpec()` — converts a `ConnectorSpec` to an `ActionType` for registration
- `ActionsConfigurationUtilities` — shared config validation helpers
- `SubActionConnector` / `CaseConnector` — base classes for sub-action connectors
- `AuthFormFields` / `HeaderFields` — shared auth UI components in `stack_connectors/public/common/auth/`
- `validateEmailAddresses` — email validation in actions config
- `getWellKnownEmailService()` — well-known email service lookup route
- `getConnectorType()` — factory pattern all connectors should follow
- `buildHeaderRecords()` / `toHeaderArray()` — header serialization in `stack_connectors/public/common/`
