# Documentation for Transforms UI developers

This plugin provides access to the transforms features provided by Elasticsearch. It follows Kibana's standard plugin architecture, originally the plugin boilerplate code was taken from the snapshot/restore plugin.

## Structure

- **common**: Shared constants, types, and utilities used by both client and server
- **server**: license checking, API routes
- **public**: UI components for transform management and creation

## Server Components

- Plugin setup with license verification (requires Basic+)
- REST API endpoints for transform CRUD operations
- Security privilege checks and feature registration
- Transform health monitoring and alerting

## Client Components

- Management section integration
- Transform listing and management UI
- Multi-step wizard for transform creation
- Edit/clone functionality for existing transforms

## Key Features

- Pivot transforms for data aggregation
- Latest transforms for retrieving most current values
- Transform management with performance statistics and health monitoring

## Coding style / design patterns

- No legacy React class based components, all components use React hooks.
- Tanstack Query for data fetching and caching (useQuery) and CRUD (useMutation)
- Redux used in the "Edit Transform" flyout. Other sections use plain React state tools.

## Code structure

```
transform/
├── common/                    # Shared code between client and server
│   ├── constants.ts           # Shared constants
│   ├── types/                 # TypeScript type definitions
│   └── utils/                 # Shared utility functions
│
├── public/                    # Client-side code
│   ├── alerting/              # Transform alerting integration
│   ├── app/                   # Main application code
│   │   ├── common/            # Client-side utilities and constants
│   │   ├── components/        # Shared UI components
│   │   ├── hooks/             # React hooks for data fetching/actions
│   │   ├── sections/          # Main UI sections
│   │   │   ├── clone_transform/     # Clone transform UI
│   │   │   ├── create_transform/    # Transform creation wizard
│   │   │   ├── edit_transform/      # Transform editing UI
│   │   │   └── transform_management/ # List and management UI
│   │   └── services/          # Client-side services
│   └── plugin.ts              # Client plugin definition
│
└── server/                    # Server-side code
    ├── lib/                   # Server utilities and services
    ├── routes/                # API route definitions
    │   ├── api/               # API endpoints
    │   │   ├── audit_messages/    # Audit messages API
    │   │   ├── delete_transforms/ # Delete transforms API
    │   │   └── ...
    │   └── api_schemas/       # Request/response schemas
    ├── services/              # Server-side services
    ├── usage/                 # Usage tracking
    └── plugin.ts              # Server plugin definition
```

## Overview of some relevant files and their purpose

### Core Plugin Files

- **`public/plugin.ts`**: Client-side plugin definition, registers UI elements and defines start/setup contracts
- **`server/plugin.ts`**: Server-side plugin definition, registers routes and services
- **`common/index.ts`**: Exports shared utilities and types for use by both client and server

### Client-Side

- **`public/app/app.tsx`**: Main React component that bootstraps the UI
- **`public/app/mount_management_section.ts`**: Registers the transform management section in Kibana
- **`public/app/sections/transform_management/transform_management_section.tsx`**: Main transform listing page
- **`public/app/sections/create_transform/components/wizard/wizard.tsx`**: Multi-step transform creation wizard
- **`public/register_feature.ts`**: Registers the transform feature with Kibana's feature catalog

### Server-Side

- **`server/routes/index.ts`**: Registers all API routes
- **`server/capabilities.ts`**: Defines user capabilities for transform actions
- **`server/lib/alerting/transform_health_rule_type/transform_health_service.ts`**: Service for transform health monitoring
- **`server/usage/collector.ts`**: Collects usage data for telemetry

### Misc

- **`public/app/hooks/use_create_transform.tsx`**: Handles transform creation API interactions
- **`public/app/hooks/use_get_transforms.ts`**: Fetches transform data from the API
- **`server/routes/api/transforms_create/route_handler_factory.ts`**: Creates and validates transforms
- **`common/types/transform.ts`**: Core transform type definitions
- **`public/app/common/transform.ts`**: Client-side transform utility functions

## Requirements

To use the transforms feature, you must have at least a Basic license. For more
info, refer to [Set up transforms](https://www.elastic.co/guide/en/elasticsearch/reference/current/transform-setup.html).

## Running tests

### Jest tests

```
node scripts/jest --config=x-pack/platform/plugins/private/transform/jest.config.js
```

### Functional tests

Before running the test server, make sure to quit all other instances of
Elasticsearch.

Run the following commands from the `x-pack` directory and use separate terminals
for test server and test runner. The test server command starts an Elasticsearch
and Kibana instance that the tests will be run against.

Functional tests are broken up into independent groups with their own configuration.
Test server and runner need to be pointed to the configuration to run. The basic
commands are

    node scripts/functional_tests_server.js --config PATH_TO_CONFIG
    node scripts/functional_test_runner.js --config PATH_TO_CONFIG

With PATH_TO_CONFIG and other options as follows.

1.  Functional UI tests with `Trial` license:

    | Group                                       | PATH_TO_CONFIG                                                                                 |
    | ------------------------------------------- | ---------------------------------------------------------------------------------------------- |
    | creation - index pattern                    | `src/platform/test/functional/apps/transform/creation/index_pattern/config.ts`                 |
    | creation - runtime mappings, saved searches | `src/platform/test/functional/apps/transform/creation/runtime_mappings_saved_search/config.ts` |
    | edit, clone                                 | `src/platform/test/functional/apps/transform/edit_clone/config.ts`                             |
    | feature controls                            | `src/platform/test/functional/apps/transform/feature_controls/config.ts`                       |
    | permissions                                 | `src/platform/test/functional/apps/transform/permissions/config.ts`                            |
    | actions                                     | `src/platform/test/functional/apps/transform/actions/config.ts`                                |

1.  Functional UI tests with `Basic` license:

    | Group                                       | PATH_TO_CONFIG                                                                          |
    | ------------------------------------------- | --------------------------------------------------------------------------------------- |
    | creation - index pattern                    | `test/functional_basic/apps/transform/creation/index_pattern/config.ts`                 |
    | creation - runtime mappings, saved searches | `test/functional_basic/apps/transform/creation/runtime_mappings_saved_search/config.ts` |
    | edit, clone                                 | `test/functional_basic/apps/transform/edit_clone/config.ts`                             |
    | feature controls                            | `test/functional_basic/apps/transform/feature_controls/config.ts`                       |
    | permissions                                 | `test/functional_basic/apps/transform/permissions/config.ts`                            |
    | actions                                     | `test/functional_basic/apps/transform/actions/config.ts`                                |

1.  API integration tests with `Trial` license:

    - PATH_TO_CONFIG: `src/platform/test/api_integration/apis/transform/config.ts`

1.  API integration tests with `Basic` license:

    - PATH_TO_CONFIG: `test/api_integration_basic/config.ts`
    - Add `--include-tag transform` to the test runner command

1.  Accessibility tests:

    We maintain a suite of accessibility tests (you may see them referred to elsewhere as `a11y` tests). These tests render each of our pages and ensure that the inputs and other elements contain the attributes necessary to ensure all users are able to make use of Transforms (for example, users relying on screen readers).

         node scripts/functional_tests_server --config src/platform/test/accessibility/config.ts
         node scripts/functional_test_runner.js --config src/platform/test/accessibility/config.ts --grep=transform

    Transform accessibility tests are located in `x-pack/test/accessibility/apps/group2`.
