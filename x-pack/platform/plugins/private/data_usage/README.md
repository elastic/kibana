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

Functional

- [[Data Usage] functional tests #203166](https://github.com/elastic/kibana/pull/203166)
- [[Data Usage] add functional tests for privileges](https://github.com/elastic/kibana/pull/199377)

API Integration tests

- [[Data Usage] setup integration tests #197112](https://github.com/elastic/kibana/pull/197112)

Unit tests

- Route handlers
- Utils
- Hooks
