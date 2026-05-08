# Connectors (Actions) Plugin

## Architecture

- **actions** (`x-pack/platform/plugins/shared/actions/`) — Framework: execution engine, connector client, config, types
- **stack_connectors** (`x-pack/platform/plugins/shared/stack_connectors/`) — Built-in connector implementations

## Rules to Follow

### Schema Validation — Breaking Changes

This is the single most common source of review friction in connectors:

- **NEVER add required validation to existing connector schemas.** If a connector previously accepted `{ host: "foo.com" }` without a field, making that field required is a breaking change that breaks existing saved connectors.
- To add validation to existing fields: make it **conditional** — only validate when the field is provided
- To add new required fields: provide a **default value** in the schema or make the field optional
- When in doubt, ask: "Would an existing connector created before this PR still load and execute?"

### Config vs Secrets

- **Config**: Non-sensitive settings visible in UI and API responses (URL, port, from address)
- **Secrets**: Sensitive data encrypted at rest (passwords, API keys, tokens)
- Never store secrets in config — they'll appear in API responses and logs

### Error Handling

- Connector execution errors should return `{ status: 'error', message: '...', serviceMessage: '...' }`
- Always validate config/secrets before attempting external API calls
- Handle rate limiting and transient failures explicitly
