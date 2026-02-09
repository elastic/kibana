# Data Sources Plugin

The **Data Sources** plugin manages connections to external data sources for Kibana's Workplace AI solution.
It provides a registry for defining data source types (like GitHub, Notion, SharePoint) and APIs for users to create active connections to those sources.

## Overview

Data sources enable AI agents to interact with external systems through a standardized interface. Each data source type defines:

- **Stack Connector**: How to authenticate and communicate with the external service
- **Workflows**: Actions that can be performed against the external service (exposed as AI agent tools)
- **OAuth Configuration** (optional): How users authenticate with the external service

When a user creates an "active source" from a data source type, the plugin automatically provisions:
1. A stack connector instance for authentication
2. Workflow instances for each defined workflow
3. AI agent tools for workflows tagged with `agent-builder-tool`

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

  // Description shown in the connector selection UI
  description: i18n.translate('xpack.dataSources.myService.description', {
    defaultMessage: 'Connect to My Service to access your data.',
  }),

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

#### Workflow YAML Reference

| Field | Description |
|-------|-------------|
| `version` | Always `'1'` |
| `name` | Unique identifier, convention: `sources.<service>.<action>` |
| `description` | Human-readable description (shown in AI tool descriptions) |
| `tags` | Array of tags; include `agent-builder-tool` to expose as AI tool |
| `enabled` | Whether the workflow is active |
| `triggers` | How the workflow can be triggered (`manual` for AI tools) |
| `inputs` | Parameters the workflow accepts |
| `steps` | Actions to perform |

#### Template Variables

The following variables are automatically injected into workflow YAMLs:

| Variable | Description |
|----------|-------------|
| `<%= stackConnectorId %>` | ID of the stack connector created for this active source |

#### Input Types

| Type | Description |
|------|-------------|
| `string` | Text input |
| `number` | Numeric input |
| `boolean` | True/false |
| `choice` | Enum with `options` array |

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

## Testing

Run unit tests:

```bash
yarn test:jest x-pack/platform/plugins/shared/data_sources
```

Run a specific test file:

```bash
yarn test:jest x-pack/platform/plugins/shared/data_sources/server/utils/create_stack_connector.test.ts
```

## API Reference

Base path: `/api/data_sources`

| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | List all active data sources (paginated) |
| GET | `/{id}` | Get a single active data source |
| POST | `/` | Create a new active data source |
| PUT | `/{id}` | Update an active data source |
| DELETE | `/{id}` | Delete an active data source |
| DELETE | `/` | Bulk delete all active data sources |
| GET | `/_tasks/{taskId}` | Get bulk delete task status |

## Architecture

```
data_sources/
├── common/              # Shared types, constants, routes
├── public/              # UI for managing data sources
└── server/
    ├── plugin.ts        # Server plugin entry point
    ├── routes/          # HTTP API handlers
    ├── saved_objects/   # data_connector saved object type
    ├── sources/         # Data source type definitions
    │   ├── github/
    │   │   ├── data_type.ts
    │   │   └── workflows/
    │   ├── notion/
    │   └── sharepoint_online/
    ├── tasks/           # Background tasks (bulk delete)
    └── utils/           # Stack connector creation utilities
```

## Dependencies

- **actions**: Stack connector creation and execution
- **dataCatalog**: Registry for data source types
- **agentBuilder**: AI tool registration
- **workflowsManagement**: Workflow creation and execution
- **taskManager** (optional): Background task execution
