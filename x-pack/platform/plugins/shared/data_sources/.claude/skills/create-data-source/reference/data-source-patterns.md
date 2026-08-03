# Data Source Patterns

This document describes the file structure and patterns for creating new data sources in Kibana's Workplace AI.

## Directory Structure

Data sources live in: `x-pack/platform/plugins/shared/data_sources/server/sources/`

```
data_sources/server/sources/
├── index.ts                    # Registration file - ADD YOUR SOURCE HERE
├── github/
│   ├── index.ts
│   ├── data_type.ts
│   └── workflows/
│       ├── search_code.yaml
│       ├── search_issues.yaml
│       └── ...
├── notion/
│   ├── index.ts
│   ├── data_type.ts
│   └── workflows/
│       ├── search.yaml
│       ├── get_page.yaml
│       └── ...
├── sharepoint_online/
│   ├── index.ts
│   ├── data_type.ts
│   └── workflows/
│       ├── search.yaml
│       ├── list.yaml
│       └── download.yaml
└── {your_source}/              # YOUR NEW SOURCE
    ├── index.ts
    ├── data_type.ts
    └── workflows/
        └── *.yaml
```

## File Templates

### data_type.ts

```typescript
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { DataSource } from '@kbn/data-catalog-plugin';

export const yourSourceDataSource: DataSource = {
  id: 'your-source',                    // Lowercase, use hyphens
  name: 'Your Source',                  // Display name
  description: i18n.translate('xpack.dataSources.yourSource.description', {
    defaultMessage: 'Connect to Your Source to search and retrieve data.',
  }),

  iconType: '.your-source',             // Must match ConnectorIconsMap key

  stackConnectors: [
    {
        type: '.your-source',               // The stack connector type ID
        config: {},
    }
  ],

  workflows: {
    directory: __dirname + '/workflows',
  },
};
```

### index.ts

```typescript
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
export { yourSourceDataSource } from './data_type';
```

### Registration in sources/index.ts

Add your import and registration:

```typescript
import type { DataCatalogPluginSetup } from '@kbn/data-catalog-plugin/server';
import { notionDataSource } from './notion';
import { githubDataSource } from './github';
import { sharepointOnlineDataSource } from './sharepoint_online';
import { yourSourceDataSource } from './your_source';  // ADD IMPORT

export function registerDataSources(dataCatalog: DataCatalogPluginSetup) {
  dataCatalog.register(notionDataSource);
  dataCatalog.register(githubDataSource);
  dataCatalog.register(sharepointOnlineDataSource);
  dataCatalog.register(yourSourceDataSource);          // ADD REGISTRATION
}
```

## Icon Patterns

### Option 1: Reuse Existing Stack Connector Icon

If the stack connector already has a logo, create an icon component that wraps it:

**Path**: `src/platform/packages/shared/kbn-connector-specs/src/specs/{source_name}/icon/index.tsx`

```typescript
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import React from 'react';

import type { ConnectorIconProps } from '../../../types';

export default (props: ConnectorIconProps) => {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32" {...props}>
      {/* SVG paths from the original logo */}
    </svg>
  );
};
```

### Option 2: Use a PNG Image

```typescript
import React from 'react';
import { EuiIcon } from '@elastic/eui';
import type { ConnectorIconProps } from '../../../types';
import iconImage from './icon.png';

export default (props: ConnectorIconProps) => {
  return <EuiIcon type={iconImage} {...props} />;
};
```

### Register the Icon

Add to `src/platform/packages/shared/kbn-connector-specs/src/connector_icons_map.ts`:

```typescript
export const ConnectorIconsMap: Map<
  string,
  React.LazyExoticComponent<React.ComponentType<ConnectorIconProps>>
> = new Map([
  // ... existing entries
  [
    '.your-source',
    lazy(
      () => import(/* webpackChunkName: "connectorIconYourSource" */ './specs/your_source/icon')
    ),
  ],
]);
```

## Where to Find Existing Logos

1. **Stack Connectors** (SVG components):
   `x-pack/platform/plugins/shared/stack_connectors/public/connector_types/{connector}/logo.tsx`

2. **Data Connectors Plugin** (various formats):
   `packages/kbn-data-connectors-plugin/`

## MCP Connector Pattern

For data sources using the MCP connector. **Do NOT run the scaffold generator** — MCP data sources reuse the existing `.mcp` connector type and don't need a connector spec. Instead, manually create just the icon, CODEOWNERS entry, and documentation (see SKILL.md Step 1, Option A).

```typescript
import { i18n } from '@kbn/i18n';
import { MCPAuthType } from '@kbn/connector-schemas/mcp';
import type { DataSource } from '@kbn/data-catalog-plugin';

export const mcpBasedDataSource: DataSource = {
  id: 'mcp-source',
  name: 'MCP Source',
  description: i18n.translate('xpack.dataSources.mcpSource.description', {
    defaultMessage: 'Connect via MCP server.',
  }),

  iconType: '.mcp-source',

  stackConnectors: [
    {
      type: '.mcp',
      config: {
        serverUrl: 'https://mcp-server-url.example.com',
        hasAuth: true,
        authType: MCPAuthType.Bearer,  // Options: Bearer, ApiKey, Basic, None
      },
      // Each tool is an object with a `name` key; can add `description` override
      importedTools: [
        { name: 'search' },
        { name: 'get_item' },
        { name: 'list_items' },
      ],
    },
  ],

  workflows: {
    directory: __dirname + '/workflows',
  },
};
```

## Connector Spec: Schema UI Configuration

Schema config fields define the "Connector settings" section of the creation form. Every field in the `schema` object **must** have `.meta()` with at least a `label`, or the field will render as an unlabeled input.

```typescript
schema: z.object({
  instanceUrl: z
    .string()
    .url()
    .describe('ServiceNow instance URL')
    .meta({
      label: 'Instance URL',           // REQUIRED - displayed as the field label
      widget: 'text',                   // Widget type (text, password, select, etc.)
      placeholder: 'https://your-instance.service-now.com',
    }),
}),
```

Available `.meta()` options: `label`, `widget`, `placeholder`, `helpText`, `hidden`, `sensitive`, `disabled`, `order`.

For URL fields, you can also use the `UISchemas.url()` helper from `connector_spec_ui.ts`:

```typescript
import { UISchemas } from '../../connector_spec_ui';

schema: z.object({
  apiUrl: UISchemas.url('https://api.example.com')
    .describe('API endpoint URL')
    .meta({ label: 'API URL' }),
}),
```

## Connector Spec: OAuth Auth Configuration

When using `oauth_client_credentials`, customize the auth form to minimize user friction. Use `defaults` to pre-populate known values and `overrides.meta` to hide or relabel fields.

**Full pattern** (based on SharePoint Online and ServiceNow):

```typescript
auth: {
  types: [
    {
      type: 'oauth_client_credentials',
      defaults: {
        // Pre-populate the token URL with the service's known OAuth endpoint
        tokenUrl: 'https://{instance}.service-now.com/oauth_token.do',
        // Pre-populate scope if the service requires a fixed value
        // scope: 'https://graph.microsoft.com/.default',
      },
      overrides: {
        meta: {
          // Hide scope when the service doesn't require user-configurable scopes
          scope: { hidden: true },
          // Add a placeholder so users see the expected URL pattern
          tokenUrl: {
            placeholder: 'https://your-instance.service-now.com/oauth_token.do',
          },
        },
      },
    },
  ],
},
```

**OAuth field customization options:**

| Field | Common customizations |
|-------|----------------------|
| `tokenUrl` | `defaults.tokenUrl` for known endpoint pattern; `overrides.meta.tokenUrl.placeholder` |
| `scope` | `defaults.scope` for fixed value; `overrides.meta.scope: { hidden: true }` to hide |
| `clientId` | `overrides.meta.clientId: { label: 'Application ID', placeholder: '...' }` |
| `clientSecret` | Already masked by default; override label if needed |

**Goal**: The user should only need to fill in values they actually know (instance URL, client ID, client secret). Everything else should be pre-populated or hidden.

## Naming Conventions

| Item | Convention | Example                                    |
|------|------------|--------------------------------------------|
| Directory name | snake_case | `sharepoint_online`                        |
| DataSource id | lowercase, no dots | `sharepoint-online` or `servicenow`        |
| Connector ID | **MUST start with dot** | `.sharepoint-online`, `.servicenow-search` |
| Workflow files | snake_case.yaml | `search_code.yaml`                         |
| TypeScript files | snake_case.ts | `data_type.ts`                             |
| Export names | camelCase | `sharepointOnlineDataSource`               |
| i18n keys | `xpack.dataSources.{sourceName}.{field}` | `xpack.dataSources.sharepoint.description` |

## Critical ID Alignment

### Custom Connector Data Sources

The following IDs **MUST all match exactly**:

1. `ConnectorSpec.metadata.id` in the connector spec
2. `DataSource.iconType` in data_type.ts
3. `DataSource.stackConnector.type` in data_type.ts
4. Key in `ConnectorIconsMap` in connector_icons_map.ts

**Before choosing an ID**, search for existing connectors using that ID.

If a connector already exists with that ID (existing `.servicenow`), use a unique variant (like `.servicenow_search`).

### MCP Data Sources

MCP data sources don't have a connector spec (they reuse `.mcp`). The following must be consistent:

1. `DataSource.iconType` in data_type.ts
2. Key in `ConnectorIconsMap` in connector_icons_map.ts

The `stackConnectors[].type` is always `.mcp` — it does not need to match the icon key.
