# dataUsage

Serverless-only plugin for users to view data usage. Available in all 3 solutions.

# API

- **/api/data_usage/data_streams**

  - Calls `/_metering/stats` to get list of data streams and size in bytes
  - Filters out system data streams and empty data streams (0 bytes)
  - Returns list of data streams sorted by storage size (highest)

- **/api/data_usage/usage_metrics**
  - With list of data streams, date range, and metric types
  - Only two metric types right now, data ingested and data retained
  - Requests data streams in chunks of 50 from es client with the internal user
  - Call AutoOps API and return time series data

# Integration with AutoOps

- Plugin enforces mutual TLS (mTLS) when communicating with AutoOps
- `appContextService` started in server-side plugin provides kibana config, cloud data, kibana data for communicating with AutoOps API
- In serverless projects, Kibana config is controlled by the project-controller. We set the Data Usage AutoOps configuration for Kibana instances in all Serverless projects in the kibana controller.

# Kibana config

```
xpack.dataUsage.autoops.enabled
xpack.dataUsage.autoops.api.url
xpack.dataUsage.autoops.api.tls.certificate
xpack.dataUsage.autoops.api.tls.key
```

# Privileges

Plugin only displays if user has cluster: `['monitor']` privilege in Elasticsearch (eg built in admin, developer or custom role).

# Tests

Scout (UI and API)

- `test/scout`: UI privileges per role and the data streams API, on the default Scout servers.
- `test/scout_data_usage_autoops`: the Data Usage page and the usage metrics API, on the `data_usage_autoops` server config set, which points AutoOps at a mock server started by the tests on port 9000.

```
node scripts/scout.js run-tests --arch serverless --domain security_complete --config x-pack/platform/plugins/private/data_usage/test/scout/ui/playwright.config.ts
node scripts/scout.js run-tests --arch serverless --domain security_complete --config x-pack/platform/plugins/private/data_usage/test/scout/api/playwright.config.ts
node scripts/scout.js run-tests --arch serverless --domain security_complete --config x-pack/platform/plugins/private/data_usage/test/scout_data_usage_autoops/ui/playwright.config.ts
node scripts/scout.js run-tests --arch serverless --domain security_complete --config x-pack/platform/plugins/private/data_usage/test/scout_data_usage_autoops/api/playwright.config.ts
```

To iterate on the `scout_data_usage_autoops` specs without restarting the servers on every run, start them once and then run Playwright against them:

```
node scripts/scout.js start-server --arch serverless --domain security_complete --serverConfigSet data_usage_autoops
node scripts/playwright test --config x-pack/platform/plugins/private/data_usage/test/scout_data_usage_autoops/ui/playwright.config.ts --project local --grep @local-serverless-security_complete
```

Unit tests

- Route handlers
- Utils
- Hooks
