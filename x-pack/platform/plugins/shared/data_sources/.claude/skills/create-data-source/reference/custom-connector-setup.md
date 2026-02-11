# Custom Connector Setup

Instructions for setting up a data source backed by a new custom connector spec (not MCP).

## Run the Scaffold Generator

```bash
node scripts/generate connector <name> --id ".<id>" --owner "@elastic/workchat-eng"
```

The generator creates:
- `src/platform/packages/shared/kbn-connector-specs/src/specs/<name>/<name>.ts` — connector spec stub
- `src/platform/packages/shared/kbn-connector-specs/src/specs/<name>/<name>.test.ts` — test stub
- `src/platform/packages/shared/kbn-connector-specs/src/specs/<name>/icon/index.tsx` — icon placeholder
- `docs/reference/connectors-kibana/<kebab-name>-action-type.md` — documentation page

And updates:
- `src/platform/packages/shared/kbn-connector-specs/src/all_specs.ts` — export
- `src/platform/packages/shared/kbn-connector-specs/src/connector_icons_map.ts` — icon mapping
- `.github/CODEOWNERS` — ownership rule
- `docs/reference/connectors-kibana/_snippets/elastic-connectors-list.md` — connectors list
- `docs/reference/toc.yml` — table of contents

**After running the generator, go through each generated/updated file and fill in the TODO placeholders.**

## Implement the Connector Spec

Fill in the generated spec stub with actions, handlers, auth config, and tests.

### Auth Type Selection

- `'bearer'` — for services where the user provides a pre-obtained OAuth access token or API token (e.g., Google APIs, Notion, GitHub). Simplest option, works with data source activation flow.
- `'api_key_header'` — for services that use API key authentication via a custom header.
- `'oauth_client_credentials'` — for services that use OAuth 2.0 Client Credentials flow (e.g., Microsoft/Azure services like SharePoint). **Note:** requires multi-field credential input (clientId, clientSecret, tenantId).

**IMPORTANT:** Check which auth types the `buildSecretsFromConnectorSpec` function in `x-pack/platform/plugins/shared/data_sources/server/utils/create_stack_connector.ts` supports before choosing. Currently it only handles `bearer` and `api_key_header` for non-MCP connectors.

### SubActions

- Create subActions for federated search (search, list, get, download attachments as base64, etc.)
- Limit to 5 high-level, generically useful subActions

### Connector ID Naming

- All connector IDs MUST start with a leading dot (e.g., `.servicenow`, `.notion`, `.github`)
- Before choosing an ID, search for existing connectors: `grep -r "id: '.servicenow'" --include="*.ts"`
- If a connector with that ID already exists, use a unique variant (like `.servicenow_search`)
- The ID must be unique across all connectors in the codebase

### Simplify the Configuration UI

1. **Schema config fields MUST have `.meta()` with a `label`** — Without a label, the field renders as an unlabeled input. Always chain `.meta({ label: 'Display Name', widget: 'text', placeholder: 'example' })`.
2. **Set sensible OAuth defaults** — Use the `defaults` object to pre-populate fields like `tokenUrl`.
3. **Hide the `scope` field** — Use `overrides.meta` to hide it: `scope: { hidden: true }`.
4. **Add a `placeholder` to `tokenUrl`** — Even with a default value, add a placeholder via `overrides.meta`.

See [data-source-patterns.md](data-source-patterns.md) for the full OAuth configuration pattern with examples.

## Complete the Documentation

The generated documentation file at `docs/reference/connectors-kibana/<kebab-name>-action-type.md` contains TODO placeholders. Fill in:

1. **Connector configuration section** — Describe the credential the user needs to provide.
2. **Actions section** — Document each action with its parameters, types, and descriptions.
3. **Get API credentials section** — Step-by-step instructions for obtaining the credential.

Also update the snippet description in `docs/reference/connectors-kibana/_snippets/elastic-connectors-list.md`.

Additionally, register in the **Data and context sources** section:
- Add an entry to `docs/reference/connectors-kibana/_snippets/data-context-sources-connectors-list.md` under the appropriate category.
- Add a `- file:` entry to `docs/reference/toc.yml` under the `connectors-kibana/data-context-sources-connectors.md` children.

See existing docs (e.g., `google-drive-action-type.md`) for the expected style.

## ID Alignment

The following IDs **MUST all match exactly**:

1. `ConnectorSpec.metadata.id` in the connector spec
2. `DataSource.iconType` in data_type.ts
3. `DataSource.stackConnector.type` in data_type.ts
4. Key in `ConnectorIconsMap` in connector_icons_map.ts

**Before choosing an ID**, search for existing connectors using that ID.
