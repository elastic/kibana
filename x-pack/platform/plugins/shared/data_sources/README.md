# Data Sources Plugin

The **Data Sources** plugin manages connections to external data sources, such as for Kibana's Workplace AI solution.
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
    │   └── etc/
    ├── tasks/           # Background tasks (bulk delete)
    └── utils/           # Stack connector creation utilities
```
