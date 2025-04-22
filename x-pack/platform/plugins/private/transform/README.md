# Documentation for Transforms UI developers

This plugin provides access to the transforms features provided by Elastic. It follows Kibana's standard plugin architecture, originally the plugin boilerplate code was taken from the snapshot/restore plugin.

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
- Data visualization for previewing results

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
info, refer to
[Set up transforms](https://www.elastic.co/guide/en/elasticsearch/reference/current/transform-setup.html).

## Setup local environment

### Kibana

1. Fork and clone the [Kibana repo](https://github.com/elastic/kibana).

1. Install `nvm`, `node`, `yarn` (for example, by using Homebrew). See
   [Install dependencies](https://www.elastic.co/guide/en/kibana/master/development-getting-started.html#_install_dependencies).

1. Make sure that Elasticsearch is deployed and running on `localhost:9200`.

1. Navigate to the directory of the `kibana` repository on your machine.

1. Fetch the latest changes from the repository.

1. Checkout the branch of the version you want to use. For example, if you want
   to use a 7.9 version, run `git checkout 7.9`. (Your Elasticsearch and Kibana
   instances need to be the same version.)

1. Run `nvm use`. The response shows the Node version that the environment uses.
   If you need to update your Node version, the response message contains the
   command you need to run to do it.

1. Run `yarn kbn bootstrap`. It takes all the dependencies in the code and
   installs/checks them. It is recommended to use it every time when you switch
   between branches.

1. Make a copy of `kibana.yml` and save as `kibana.dev.yml`. (Git will not track
   the changes in `kibana.dev.yml` but yarn will use it.)

1. Provide the appropriate password and user name in `kibana.dev.yml`.

1. Run `yarn start` to start Kibana.

1. Go to http://localhost:560x/xxx (check the terminal message for the exact
   path).

For more details, refer to this [getting started](https://www.elastic.co/guide/en/kibana/master/development-getting-started.html) page.

### Adding sample data to Kibana

Kibana has sample data sets that you can add to your setup so that you can test
different configurations on sample data.

1. Click the Elastic logo in the upper left hand corner of your browser to
   navigate to the Kibana home page.

1. Click _Load a data set and a Kibana dashboard_.

1. Pick a data set or feel free to click _Add_ on all of the available sample
   data sets.

These data sets are now ready to be used for creating transforms in Kibana.

## Running tests

### Jest tests

Documentation: https://www.elastic.co/guide/en/kibana/current/development-tests.html#_unit_testing

Run the test following jest tests from `kibana/x-pack/platform/plugins/private/transform.

New snapshots, all plugins:

```
yarn test:jest
```

Update snapshots for the transform plugin:

```
yarn test:jest -u
```

Update snapshots for a specific directory only:

```
yarn test:jest public/app/sections
```

Run tests with verbose output:

```
yarn test:jest --verbose
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
