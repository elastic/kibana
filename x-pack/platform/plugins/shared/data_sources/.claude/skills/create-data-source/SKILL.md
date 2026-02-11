---
name: create-data-source
description: Creates a new Data Source for Workplace AI. Use when asked to create (or add) a new "fetcher", Data Source, or connector.
allowed-tools: WebFetch, WebSearch, Read, Grep, Glob, Write, Edit, Bash, Skill
context: fork
argument-hint: [3rd-party-data-source-name]
---

# Create a Data Source for Workplace AI

We're going to create a new Data Source connector for **$0**. The intent is to provide connectors that enable "federated search" of third-party systems through Kibana's Workplace AI.

## Reference Materials

Before starting, familiarize yourself with these reference materials:
- **[reference/data-source-patterns.md](reference/data-source-patterns.md)** - Directory structure, file templates, and registration patterns
- **Workflow YAML syntax** - When you need to write or understand workflow YAML files, invoke the `workflows-yaml-reference` skill (use the Skill tool with `skill: "workflows-yaml-reference"`). It has comprehensive schema docs, Liquid templating reference, and examples from the `elastic/workflows` library.

## Step 1: Determine the Connector Strategy

First, check if $0 has a suitable connector already available.
If not, we will create one.

### MANDATORY: Run the Scaffold Generator First

**Regardless of which strategy you choose (MCP or custom connector), you MUST start by running the scaffold generator.** This creates documentation, icon placeholder, test stub, registry entries (all_specs.ts, connector_icons_map.ts, CODEOWNERS), snippet file entry, and TOC entry — all of which are required and tedious to create manually.

```bash
node scripts/generate connector <name> --id ".<id>" --owner "@elastic/workchat-eng"
```

The generator creates the following files:
- `src/platform/packages/shared/kbn-connector-specs/src/specs/<name>/<name>.ts` — connector spec stub
- `src/platform/packages/shared/kbn-connector-specs/src/specs/<name>/<name>.test.ts` — test stub
- `src/platform/packages/shared/kbn-connector-specs/src/specs/<name>/icon/index.tsx` — icon placeholder
- `docs/reference/connectors-kibana/<kebab-name>-action-type.md` — documentation page

And updates these existing files:
- `src/platform/packages/shared/kbn-connector-specs/src/all_specs.ts` — export
- `src/platform/packages/shared/kbn-connector-specs/src/connector_icons_map.ts` — icon mapping
- `.github/CODEOWNERS` — ownership rule
- `docs/reference/connectors-kibana/_snippets/elastic-connectors-list.md` — connectors list
- `docs/reference/toc.yml` — table of contents

**After running the generator, go through each generated/updated file and fill in the TODO placeholders.**

### Option A: Use an Official MCP Server
Search for an official, hosted MCP server for $0. If one exists, we can use the `.mcp` connector type.

**IMPORTANT for MCP-based connectors:** After running the generator:
1. The generator creates a connector spec with `actions: {}`. Since MCP connectors don't define their own actions, you **MUST remove** the generated export from `src/platform/packages/shared/kbn-connector-specs/src/all_specs.ts` — otherwise Kibana will crash with `No actions defined`.
2. Fill in the generated documentation files (remove all `TODO:` placeholders).
3. Update `minimumLicense` in the generated spec to `'enterprise'` (the generator defaults to `'basic'`).
4. Use the connector's `listTools` sub-action to discover the **exact MCP tool names** before writing workflows. Tool names often use underscores (e.g., `tavily_search`) even when documentation shows hyphens. The `listTools` call is only possible after activation, so during initial creation, use names from MCP server documentation but be prepared to fix them during testing.

### Option B: Create a New Connector
If no MCP server is available, implement a custom connector spec. After running the generator (see above), fill in the generated spec stub with actions, handlers, auth config, and tests.

When implementing the new connector:
- **Choose the right auth type for the service:**
  - `'bearer'` — for services where the user provides a pre-obtained OAuth access token or API token (e.g., Google APIs, Notion, GitHub). This is the simplest option and works with the data source activation flow.
  - `'api_key_header'` — for services that use API key authentication via a custom header.
  - `'oauth_client_credentials'` — for services that use OAuth 2.0 Client Credentials flow (e.g., Microsoft/Azure services like SharePoint). **Note:** this requires the data source activation UI to support multi-field credential input (clientId, clientSecret, tenantId).
- **IMPORTANT:** Check which auth types the `buildSecretsFromConnectorSpec` function in `x-pack/platform/plugins/shared/data_sources/server/utils/create_stack_connector.ts` supports before choosing. Currently it only handles `bearer` and `api_key_header` for non-MCP connectors.
- Create subActions for federated search (search, list, get, download attachments as base64, etc)
- Limit to 5 high-level, generically useful subActions

**CRITICAL - Connector ID Naming:**
- All connector IDs MUST start with a leading dot (e.g., `.servicenow`, `.notion`, `.github`)
- Before choosing an ID, search for existing connectors with that name: `grep -r "id: '.servicenow'" --include="*.ts"`
- If a connector with that ID already exists (e.g., the old `.servicenow` ITSM connector), you MUST use a different ID like `.servicenow_search`
- The ID must be unique across all connectors in the codebase

**Simplify the Configuration UI:**

The connector creation form should be as simple as possible for end users. Follow these rules:

1. **Schema config fields MUST have `.meta()` with a `label`** — Without a label, the field renders as an unlabeled input under "Connector settings". Always chain `.meta({ label: 'Display Name', widget: 'text', placeholder: 'example' })` on schema fields.

2. **Set sensible OAuth defaults** — Use the `defaults` object in the auth type definition to pre-populate fields like `tokenUrl` with the service's known OAuth endpoint pattern.

3. **Hide the `scope` field** — Most services don't require the user to configure OAuth scopes. Use `overrides.meta` to hide it: `scope: { hidden: true }`.

4. **Add a `placeholder` to `tokenUrl`** — Even with a default value, add a placeholder via `overrides.meta` so users see the expected URL pattern.

See [reference/data-source-patterns.md](reference/data-source-patterns.md) for the full OAuth configuration pattern with examples.

### Completing the Documentation

The generated documentation file at `docs/reference/connectors-kibana/<kebab-name>-action-type.md` contains TODO placeholders. You **MUST** fill in:

1. **Connector configuration section** — Describe the credential the user needs to provide (e.g., "Bearer Token", "API Key").
2. **Actions section** — Document each action with its parameters, types, and descriptions.
3. **Get API credentials section** — Step-by-step instructions for the user to obtain their credential. Look at the service's official documentation for developer/API access. For Google APIs, reference the [OAuth 2.0 Playground](https://developers.google.com/oauthplayground/).

Also update the snippet description in `docs/reference/connectors-kibana/_snippets/elastic-connectors-list.md` — replace the `TODO: Add brief description.` text with a real description.

See existing docs (e.g., `docs/reference/connectors-kibana/google-drive-action-type.md`) for the expected style and level of detail.

## Step 2: Create the Data Source

Create the data source in `x-pack/platform/plugins/shared/data_sources/server/sources/{source_name}/`:

### Required Files

Follow the patterns in [reference/data-source-patterns.md](reference/data-source-patterns.md):

1. **`data_type.ts`** - DataSource definition with:
   - `id`: lowercase identifier (e.g., 'servicenow')
   - `name`: Display name (e.g., 'ServiceNow')
   - `description`: i18n translated description
   - `iconType`: Icon key matching ConnectorIconsMap - **MUST match the connector ID exactly**
   - `stackConnector.type`: The connector type ID - **MUST match the connector ID exactly**
   - `workflows.directory`: Path to workflows directory

2. **`index.ts`** - Re-export the data source

3. **`workflows/`** directory with YAML files (see Step 3)

### Register the Data Source

Add the import and registration in `x-pack/platform/plugins/shared/data_sources/server/sources/index.ts`

### Update the Icon (Optional)

The generator creates a placeholder icon. Replace it with a proper brand icon:

1. **Find an existing icon** - Search for existing SVG/PNG files:
   ```bash
   find . -name "*servicenow*" \( -name "*.svg" -o -name "*.png" \) 2>/dev/null
   ```
   Common locations:
   - `x-pack/platform/plugins/shared/content_connectors/public/assets/icons/` (preferred - contains clean SVGs)
   - `x-pack/platform/plugins/shared/stack_connectors/public/connector_types/{connector}/`

2. Update the icon component at `src/platform/packages/shared/kbn-connector-specs/src/specs/<name>/icon/index.tsx`

Note: CODEOWNERS, connector_icons_map.ts, and all_specs.ts are already handled by the generator in Step 1.

## Step 3: Create Workflows

Create YAML workflow files in the `workflows/` directory. For the full YAML schema, invoke the `workflows-yaml-reference` skill.

Each workflow becomes an AI tool for federated search. Standard example workflows:
1. **search.yaml** - Primary search functionality. Results should focus on high level metadata (title, name, dates) and the unstructured text values that matched the query.
2. **get_{item}.yaml** - Retrieve specific items by ID. Results should be broader, and include all metadata.
3. **list_{items}.yaml** - List available items/spaces/projects/records/etc. Like `search`, results should focus on high-level metadata.

Remember:
- Tag with `['agent-builder-tool']` to expose as AI tool
- Use `<%= stackConnectorId %>` for connector-id
- Use `${{ inputs.param_name }}` for input references

## Step 4: Tell the user you're done

You do not need to execute tests, linting, type-checking, etc.
Once you are done developing the connector and data source, let the user have the opportunity to review your work before next steps.

## Important Notes

- **Stop if architectural gaps emerge** - This skill is for "brainless" additions to the data source catalog, not for enhancing platform features
- **Keep workflows focused on federated search** - Each workflow should help end users search or retrieve data from conversations
- **Follow existing patterns** - Look at Notion, GitHub, and SharePoint data sources for reference
- **DO NOT modify existing documentation** - There may be existing connectors with similar names (e.g., ServiceNow ITSM connector for alerting). Do not modify their documentation files in `docs/reference/connectors-kibana/`.
- **Ensure all IDs are consistent** - The connector metadata ID, iconType, stackConnector.type, and ConnectorIconsMap key must ALL match exactly
