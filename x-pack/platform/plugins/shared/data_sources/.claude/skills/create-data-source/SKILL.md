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

- **[reference/data-source-patterns.md](reference/data-source-patterns.md)** — Directory structure, file templates, and registration patterns
- **Workflow YAML syntax** — When you need to write or understand workflow YAML files, invoke the `workflows-yaml-reference` skill (use the Skill tool with `skill: "workflows-yaml-reference"`)

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

## Step 3: Create Workflows

Create YAML workflow files in the `workflows/` directory. For the full YAML schema, invoke the `workflows-yaml-reference` skill.

Standard workflows:
1. **search.yaml** — Primary search. Focus on high-level metadata and matched text.
2. **get_{item}.yaml** — Retrieve specific items by ID. Include all metadata.
3. **list_{items}.yaml** — List available items/spaces/projects. Focus on high-level metadata.

Remember:
- Tag with `['agent-builder-tool']` to expose as AI tool
- Use `<%= your-source-stack-connector-id %>` for connector-id, where your-source is the id of the newly created data source type
- Use `${{ inputs.param_name }}` for input references

## Step 4: Write Documentation

Create a connector doc page in `docs/reference/connectors-kibana/{name}-action-type.md`.

### Prerequisites

This step requires documentation skills from https://github.com/elastic/elastic-docs-skills. Check availability by invoking `docs-check-style` (use the Skill tool). If it fails with "skill not found", stop and tell the user:

> Documentation skills are not installed. Please install them:
>
> ```bash
> curl -sSL https://raw.githubusercontent.com/elastic/elastic-docs-skills/main/install.sh | bash
> ```
>
> Then re-run this step.

### Write the doc page

1. Read 1–2 existing connector docs from `docs/reference/connectors-kibana/` as templates (for example, `zendesk-action-type.md`, `jira-cloud-action-type.md`). Follow the same structure.
2. Write the new doc page. Use `docs-syntax-help` if unsure about MyST Markdown syntax.
3. Run these skills on the new file and fix any issues:
   - `frontmatter-description` — generate the `description` frontmatter field
   - `page-opening-optimizer` — verify H1 and opening paragraph
   - `applies-to-tagging` — validate `applies_to` block
   - `docs-check-style` — check Elastic style guide compliance

### Update navigation and listings

1. Add an entry in `docs/reference/toc.yml` under the data and context sources connectors section.
2. Add a row in `docs/reference/connectors-kibana/_snippets/data-context-sources-connectors-list.md`.

## Step 5: Tell the user you're done

You do not need to execute tests, linting, type-checking, etc.
Once you are done developing the connector, data source, and documentation, let the user review your work before next steps.

## Important Notes

- **Stop if architectural gaps emerge** — This skill is for additions to the data source catalog, not for enhancing platform features
- **Keep workflows focused on federated search** — Each workflow should help end users search or retrieve data from conversations
- **Follow existing patterns** — Look at Notion, GitHub, and SharePoint data sources for reference
- **DO NOT modify existing documentation** — There may be existing connectors with similar names. Do not modify their documentation files.
