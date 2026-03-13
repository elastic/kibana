---
name: create-data-source
description: Creates a new Data Source for Workplace AI. Use when asked to create (or add) a new "fetcher", Data Source, or connector.
allowed-tools: WebFetch, WebSearch, Read, Grep, Glob, Write, Edit, Bash, Skill
context: fork
argument-hint: [3rd-party-data-source-name]
---

# Create a Data Source for Workplace AI

We're going to create a new Data Source connector for **$0**. The intent is to provide connectors that enable interaction with third-party systems through Kibana's Workplace AI.

## Reference Materials

- **[reference/data-source-patterns.md](reference/data-source-patterns.md)** — Directory structure, file templates, and registration patterns
- **Workflow YAML syntax** — When you need to write or understand workflow YAML files, invoke the `workflows-yaml-reference` skill (use the Skill tool with `skill: "workflows-yaml-reference"`)

## Step 0: Determine Intended Use

First, check whether the intended use was already provided in `$0`. If `$0` contains an `(intended-use: ...)` clause (e.g., `hubspot (intended-use: C — Full CRUD)`), extract the intended use from it and skip asking the user — use it directly.

Otherwise, ask the user how the data source is intended to be used. Use `AskUserQuestion` to present the following options:

> How do you intend to use the **$0** data source?

| Option | Label | Description |
|--------|-------|-------------|
| A | **Read / Federated Search** | Search and retrieve data from $0 — read-only access (search, get, list). Good for document stores, wikis, code repos. |
| B | **Write / Actions** | Perform write operations on $0 — create, update, delete, or send items. Good for ticketing systems, messaging, CRMs. |
| C | **Full CRUD** | Both read and write — search/retrieve data and also create/update/delete items. |
| D | **Monitoring / Observability** | Fetch recent events, statuses, or alerts from $0 — read-only but time-oriented. Good for monitoring tools, incident trackers. |
| E | **Custom** | Describe specific workflows needed (user provides free-text description). |

Store the user's answer as the **intended use** for this data source. If the user selects **Custom**, ask them to describe what workflows they need (e.g., "I need to search contacts and create deals"). Parse their description into a concrete list of workflow operations before proceeding.

## Step 1: Determine the Connector Strategy

Check if $0 has a suitable connector already available. If not, determine whether an official hosted MCP server exists for $0.

**Use an MCP server?** → Read [reference/mcp-connector-setup.md](reference/mcp-connector-setup.md) and follow its steps.

**No MCP server available?** → Read [reference/custom-connector-setup.md](reference/custom-connector-setup.md) and follow its steps.

Follow only the steps for the chosen path. Do not mix them.

## Step 2: Create the Data Source

Create the data source in `x-pack/platform/plugins/shared/data_sources/server/sources/{source_name}/`.

Follow the patterns in [reference/data-source-patterns.md](reference/data-source-patterns.md):

1. **`data_type.ts`** — DataSource definition with id, name, description, iconType, workflows directory, and:
   - **MCP path:** `stackConnectors` (array) with `type: '.mcp'`, MCP server URL, auth type, and `importedTools`. See the GitHub data source (`server/sources/github/data_type.ts`) for the pattern.
   - **Custom connector path:** `stackConnector` (singular) with `type: '.<connector-id>'` matching the connector spec ID.
2. **`index.ts`** — Re-export the data source
3. **`workflows/`** — YAML files (see Step 3)

Register in `x-pack/platform/plugins/shared/data_sources/server/sources/index.ts`.

Replace the placeholder icon with a proper brand icon. Search for existing SVG/PNG files in:
- `x-pack/platform/plugins/shared/content_connectors/public/assets/icons/`
- `x-pack/platform/plugins/shared/stack_connectors/public/connector_types/{connector}/`

## Step 3: Generate Workflows Based on Intended Use

Invoke the `workflows-yaml-reference` skill first to load YAML syntax and patterns, then create the workflow files in the `workflows/` directory based on the **intended use** determined in Step 0.

Use the mapping below to decide which workflows to generate. For each workflow, adapt the name and inputs to the specific entities and operations that $0 exposes (e.g., for a CRM the entity might be "contact" or "deal", for a code repo it might be "issue" or "file").

### Workflow sets by intended use

**A — Read / Federated Search**
1. `search.yaml` — Primary full-text search. Focus on high-level metadata and matched text snippet.
2. `get_{item}.yaml` — Retrieve a specific item by ID. Include all available metadata and content.
3. `list_{items}.yaml` — List available items, spaces, or collections. Focus on high-level metadata.

**B — Write / Actions**
1. `create_{item}.yaml` — Create a new item (e.g., ticket, message, record). Accept all required and optional fields as inputs.
2. `update_{item}.yaml` — Update an existing item by ID. Accept a partial set of fields to update.
3. `delete_{item}.yaml` — Delete an item by ID. Confirm success in the output.

> If $0 exposes multiple distinct entity types for write (e.g., contacts and deals for a CRM, or issues and comments for a tracker), generate a `create_`, `update_`, and `delete_` workflow for each entity type that makes sense for the user's stated intent.

**C — Full CRUD**
Generate all workflows from both **A** and **B** above, scoped to the entities the user cares about.

**D — Monitoring / Observability**
1. `list_recent_{events}.yaml` — List recent events, alerts, or incidents, with optional time-range and severity filters.
2. `get_{event}.yaml` — Retrieve details for a specific event or alert by ID.
3. `search_{events}.yaml` — Search across events/alerts by keyword, status, or label.

**E — Custom**
Derive the exact workflow set from the user's description. Map each stated operation to a workflow file. Prefer the naming patterns above; invent names only when no pattern fits.

### Common rules for all workflows

- Invoke the `workflows-yaml-reference` skill before writing workflow YAML to ensure correct syntax.
- Tag every workflow with `['agent-builder-tool']` to expose it as an AI tool.
- Use `<%= your-source-stack-connector-id %>` for `connector-id`, where `your-source` is the id of the newly created data source type.
- Use `${{ inputs.param_name }}` for input references in `with:` blocks.
- Add a `description:` field to every workflow that explains its purpose, required inputs, and what it returns — this is what the AI agent reads to decide when to invoke the tool.
- Mark inputs `required: false` when they are optional filters or pagination params.
- Look at existing workflows in `x-pack/platform/plugins/shared/data_sources/server/sources/` for style and structure reference before writing.

## Step 4: Tell the user you're done

You do not need to execute tests, linting, type-checking, etc.
Once you are done developing the connector and data source, let the user review your work before next steps. Include in your summary:
- The intended use that was selected and how it shaped the generated workflows
- The list of workflow files created and what each one does

## Important Notes

- **Stop if architectural gaps emerge** — This skill is for additions to the data source catalog, not for enhancing platform features
- **Match workflows to the actual API surface** — Only generate workflows for operations that the connector actually supports. Don't generate a `delete` workflow if $0's API or MCP server doesn't expose deletion.
- **Follow existing patterns** — Look at Notion, GitHub, Slack, and Jira data sources for reference on read vs. write workflows respectively
- **DO NOT modify existing documentation** — There may be existing connectors with similar names. Do not modify their documentation files.
