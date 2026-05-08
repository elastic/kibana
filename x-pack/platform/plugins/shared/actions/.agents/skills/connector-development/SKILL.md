---
name: connector-development
description: Adding or modifying connector types in the Kibana actions/stack_connectors plugins. Use when creating a new connector type, adding auth patterns, working with connector UI components, or writing connector tests.
---

# Connector Development

## Adding a New Connector Type

Each connector type lives in `stack_connectors/server/connector_types/{name}/`:

```
server/connector_types/email/
├── index.ts              # Connector definition (schema, executor)
├── index.test.ts         # Unit tests
├── service.ts            # External service interaction (optional)
├── service.test.ts       # Service tests
└── types.ts              # TypeScript types
```

UI components live in `stack_connectors/public/connector_types/{name}/`.

### Connector Definition Pattern

```typescript
export function getConnectorType(): ConnectorType<Config, Secrets, Params, unknown> {
  return {
    id: '.my-connector',
    name: i18n.translate('...'),
    minimumLicenseRequired: 'gold',
    supportedFeatureIds: [AlertingConnectorFeatureId],
    schema: {
      config: ConfigSchema,
      secrets: SecretsSchema,
      params: ParamsSchema,
    },
    validate: { config: { schema: ConfigSchema }, secrets: { schema: SecretsSchema }, params: { schema: ParamsSchema } },
    executor,
  };
}
```

## Auth Patterns

Connectors support multiple auth types (basic, bearer, header-based, SSL):
- Auth configuration uses `auth_config.tsx` for the UI
- Secret fields (passwords, tokens) go in `secrets` not `config`
- Encrypted headers are stored separately from plain config headers
- The `hasAuth` boolean controls whether auth fields are shown/validated

## Headers

- Config headers: visible, stored in saved object `config` attribute
- Secret headers: encrypted, stored in saved object `secrets` attribute
- Maximum header count is enforced — check `MAX_HEADER_COUNT` constant
- ES keyword fields ignore values exceeding 32766 UTF-8 encoded bytes

## Testing Requirements

- **Unit tests**: Every connector needs tests for validation, execution, and error cases
- **Integration tests**: API integration tests in `x-pack/platform/test/alerting_api_integration/`
- **Config tests**: Changes to `actions/server/config.ts` require tests in `config.test.ts`
- **UI tests**: Use React Testing Library for all new component tests

## UI Patterns

- Use EUI components for all form fields
- Header fields component: use the shared `HeaderFields` from `stack_connectors/public/common/auth/`
- Show loading spinners while fetching secret fields on slow connections
- The `data-test-subj` attribute is required on all interactive elements

## Key Utilities

- `ActionsConfigurationUtilities` — shared config validation helpers
- `getConnectorType()` factory pattern — follow for all new connectors
- `AuthFormFields` / `HeaderFields` — shared auth UI components (don't recreate)
- `validateEmailAddresses` — email validation in actions config
- Well-known email services: `getWellKnownEmailService()` route
