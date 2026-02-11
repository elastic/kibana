# AGENTS.md

This file provides detailed guidance to AI coding agents when working with the Data Sources plugin.

For a high-level overview, see [README.md](./README.md).

## Adding a New Data Source

To add support for a new external service, follow these steps:

### 1. Create the Data Source Directory

Create a new directory under `server/sources/`:

```
server/sources/
└── my_service/
    ├── index.ts           # Re-exports the data source
    ├── data_type.ts       # Data source definition
    └── workflows/         # Workflow YAML files
        ├── search.yaml
        └── get_item.yaml
```

### 2. Define the Data Source Type

Create `data_type.ts` with your `DataSource` definition:

```typescript
import { i18n } from '@kbn/i18n';
import type { DataSource } from '@kbn/data-catalog-plugin';

export const myServiceDataSource: DataSource = {
  // Unique identifier for this data source type
  id: 'my-service',

  // Display name shown in the UI
  name: 'My Service',

  // Icon identifier - must match a key in @kbn/connector-specs ConnectorIconsMap
  // Common pattern: '.my-service' (prefixed with dot)
  iconType: '.my-service',

  // Stack connector configuration
  stackConnector: {
    // The connector type ID (must be registered in the actions plugin)
    type: '.my-service',
    // Default config values for the connector
    config: {},
    // Optional: For MCP connectors, list of tools to import
    // importedTools: ['tool1', 'tool2'],
  },

  // Workflows configuration
  workflows: {
    // Path to the directory containing workflow YAML files
    directory: __dirname + '/workflows',
  },

  // Optional: OAuth configuration for EARS-supported providers
  // oauthConfiguration: {
  //   provider: EARSSupportedOAuthProvider.MY_SERVICE,
  //   initiatePath: '/oauth/start/my-service',
  //   fetchSecretsPath: '/oauth/fetch_request_secrets',
  //   oauthBaseUrl: 'https://oauth.example.com',
  // },
};
```

### 3. Export from index.ts

Create `index.ts`:

```typescript
export { myServiceDataSource } from './data_type';
```

### 4. Register the Data Source

Add your data source to `server/sources/index.ts`:

```typescript
import { myServiceDataSource } from './my_service';

export function registerDataSources(dataCatalog: DataCatalogPluginSetup) {
  // ... existing registrations
  dataCatalog.register(myServiceDataSource);
}
```

### 5. Create Workflow YAML Files

Each workflow defines an action that can be performed against the external service. Workflows tagged with `agent-builder-tool` are automatically exposed as AI agent tools.

For the full Workflow YAML schema, see the [Workflows schema reference](https://github.com/elastic/workflows/blob/main/docs/schema.md).

Create workflow files in `workflows/`. Example `search.yaml`:

```yaml
version: '1'
name: 'sources.my_service.search'
description: 'Search for items in My Service'
tags: ['agent-builder-tool']  # Makes this available as an AI tool
enabled: true
triggers:
  - type: 'manual'
inputs:
  - name: query
    type: string
    description: 'Search query'
  - name: limit
    type: number
    default: 10
    required: false
steps:
  - name: search-items
    type: my-service.search        # Step type defined by the connector
    connector-id: <%= stackConnectorId %>  # Injected at creation time
    with:
      query: "${{inputs.query}}"
      limit: "${{inputs.limit}}"
```

#### Template Variables

The following variables are automatically injected into workflow YAMLs:

| Variable | Description |
|----------|-------------|
| `<%= stackConnectorId %>` | ID of the stack connector created for this active source |

### 6. Ensure Stack Connector Exists

Your data source requires a corresponding stack connector type registered in the Actions plugin. The connector type ID in `stackConnector.type` must match a registered connector.

For connectors using the Connector v2 spec, ensure the spec is registered in `@kbn/connector-specs`.

### 7. Add Icon (if needed)

If your service needs a custom icon, add it to the `ConnectorIconsMap` in `@kbn/connector-specs`.

## MCP-Based Data Sources

For services that expose an MCP (Model Context Protocol) server, you can use the `.mcp` connector type with `importedTools`:

```typescript
export const myMcpServiceDataSource: DataSource = {
  id: 'my-mcp-service',
  name: 'My MCP Service',
  // ...
  stackConnector: {
    type: '.mcp',
    config: {
      serverUrl: 'https://api.example.com/mcp/',
      hasAuth: true,
      authType: MCPAuthType.Bearer,
    },
    // Tools to import from the MCP server
    importedTools: [
      'search',
      'get_item',
      'list_items',
    ],
  },
  // ...
};
```

MCP connector auth types:
- `bearer` - Bearer token authentication
- `apiKey` - API key in custom header
- `basic` - HTTP Basic authentication
- `none` - No authentication
