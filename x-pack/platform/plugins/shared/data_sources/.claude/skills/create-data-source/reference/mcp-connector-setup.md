# MCP Connector Setup

Instructions for setting up a data source backed by an MCP server. The data source reuses the existing `.mcp` connector type — no connector spec is created.

## Do NOT Run the Scaffold Generator

**Do NOT run** `node scripts/generate connector ...` for MCP-based data sources. The generator creates `kbn-connector-specs` files (spec stub, test stub, `all_specs.ts` export) that are not needed. Creating these files and then trying to undo them is error-prone and has caused Kibana crashes (`No actions defined`).

## 1. Icon

Create an icon component at `src/platform/packages/shared/kbn-connector-specs/src/specs/<name>/icon/index.tsx` and register it in `src/platform/packages/shared/kbn-connector-specs/src/connector_icons_map.ts`. See [data-source-patterns.md](data-source-patterns.md) for icon patterns.

**Do NOT** create a connector spec `.ts` file, test stub, or export in `all_specs.ts`.

## 2. CODEOWNERS

Add a CODEOWNERS entry for the icon directory:
```
/src/platform/packages/shared/kbn-connector-specs/src/specs/<name>/ @elastic/workchat-eng
```

## 3. Documentation

Create a documentation page at `docs/reference/connectors-kibana/<kebab-name>-action-type.md`. Use existing data source docs (e.g., `google-drive-action-type.md`, `notion-action-type.md`) as a style reference. The doc should cover:

1. **Overview** — What the data source connects to and what it enables.
2. **Configuration** — What credential the user needs (e.g., "Bearer Token", "API Key") and how the MCP connector is configured behind the scenes.
3. **Available tools** — Document the MCP tools that are imported (from the `importedTools` list in `data_type.ts`), with brief descriptions of what each tool does.
4. **Get API credentials** — Step-by-step instructions for the user to obtain their credential from the third-party service.

Then register the doc in the **Data and context sources** section:
- Add an entry to `docs/reference/connectors-kibana/_snippets/data-context-sources-connectors-list.md` under the appropriate category (e.g., "Third-party search").
- Add a `- file:` entry to `docs/reference/toc.yml` under the `connectors-kibana/data-context-sources-connectors.md` children (alphabetical order).

**Do NOT** add to `elastic-connectors-list.md` — that snippet is for non-data-source connectors.

## 4. MCP Tool Discovery

Use the connector's `listTools` sub-action to discover the **exact MCP tool names** before writing workflows. Tool names often use underscores (e.g., `tavily_search`) even when documentation shows hyphens. The `listTools` call is only possible after activation, so during initial creation, use names from MCP server documentation but be prepared to fix them during testing.

## ID Alignment

MCP data sources don't have a connector spec (they reuse `.mcp`). Only these must match:

1. `DataSource.iconType` in data_type.ts
2. Key in `ConnectorIconsMap` in connector_icons_map.ts

The `stackConnectors[].type` is always `.mcp` — it does not need to match the icon key.
