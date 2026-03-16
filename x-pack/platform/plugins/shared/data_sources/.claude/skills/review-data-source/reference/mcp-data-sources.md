# MCP data source review

Use this reference when the data source under review is **MCP-based** (uses the MCP connector, no custom connector spec). Apply these checks in addition to the main checklist in the skill.

## Connector spec (MCP)

- The generated connector spec export in `all_specs.ts` has been **removed**. MCP connectors with empty `actions: {}` crash Kibana, so they must not be registered in the "all specs" file.
- If a spec file exists for the MCP server (e.g. for auth/config only), `minimumLicense` is `'enterprise'` (not `'basic'`).

## Data source definition (MCP)

- `stackConnector(s).type` is `.mcp` (not a custom connector ID).
- `importedTools` array uses **exact** MCP tool names. Tool names use **underscores** (e.g. `tavily_search`), not hyphens. Validate against the MCP server's `listTools` response or server docs.
- Data source is imported and registered in the plugin's sources index; `workflows.directory` points to the correct workflows folder; all referenced workflows exist as YAML files.

## Workflows (MCP)

- Step `type` matches the MCP tool name exactly (e.g. `tavily_search`). Use **underscores**, not hyphens.
- Only pass parameters that the MCP tool accepts. Check the tool's `inputSchema`; some params in third-party docs may be outdated or unavailable via MCP. Verify with `listTools` or the MCP server documentation.
- Connector reference uses the repo's template variable for the MCP connector (e.g. `<%= mcp-stack-connector-id %>` or the source-specific variable). Inputs use the correct syntax (e.g. `${{ inputs.query }}`).

## Thorough check (optional)

Run when the user asks for **thorough** or **deep** validation. Same areas as the checklist, with deeper validation:

1. **Vendor API**: Find official API docs for external MCP; map actions to endpoints; confirm auth format and version. Verify auth
   header/body format matches vendor docs exactly.
2. **Input validation**: Compare connector/workflow input schema to the official MCP API — parameter names, required vs
   optional, types, constraints (enums, min/max, format). Report mismatches and suggest fixes.
3. **Output shape**: Compare expected response shape to the actual MCP API response in the docs — top-level shape,
   fields, maps/arrays, pagination fields. Report expected vs actual for any mismatch.
4. **No assumptions**: The API for MCP may not match the REST API, so stick to the MCP API documentation.
