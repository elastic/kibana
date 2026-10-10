# Data Federation

Management UI for ES|QL data federation — the Elasticsearch feature that lets you query external object storage directly from ES|QL without ingesting data first.

## What it does

Exposes two management screens under **Stack Management > Data**:

- **Data sources** — connections to external storage (S3, GCS, Azure Blob, etc). Each data source holds the credentials and endpoint config Elasticsearch needs to read files. Supports access key, federated identity (keyless), and anonymous access.
- **Data sets** — named references to a path or glob pattern within a data source, plus optional file format settings (Parquet, CSV, NDJSON, etc.). A data set is what you reference in an ES|QL `FROM` clause.

The plugin proxies create/read/delete operations through Kibana's server to the Elasticsearch `/_query/datasource` and `/_query/data_sets` APIs.

## Federated identity auth

When running on Elastic Cloud, data sources can authenticate using the workload identity issuer instead of static credentials. The creation flyout shows the JWT issuer URL and deployment/project ID that the user needs to configure the trust policy on the CSP side (AWS IAM, GCP workload identity, Azure federated credentials).

The issuer URL is injected by the kibana-controller via `xpack.dataFederation.workloadIdentityIssuerUrl`. If that config key is absent, the federated identity auth option is hidden and the read-only fields are not shown.

## Advanced setting

`dataFederation:enabled` (registered by this plugin, disabled by default) controls whether the management app is enabled in the browser. The app also requires the `manageFederatedData` capability and, in stateful, an Enterprise license. It only affects the UI: data sources and datasets keep working through the API and in ES|QL queries. It is the user-facing switch, as opposed to `xpack.dataFederation.enabled`, which is a deploy-time kill switch resolved by core: when it is `false` the plugin is not loaded at all, so neither the routes nor the advanced setting exist.

## Feature flags

| Key | Default | Description |
|-----|---------|-------------|
| `xpack.dataFederation.enabled` | `true` | Loads the plugin. The management UI is hidden until the `dataFederation:enabled` advanced setting is turned on |
| `xpack.dataFederation.enableFederatedIdentityAuth` | `false` | No effect; federated identity auth is controlled by `xpack.dataFederation.workloadIdentityIssuerUrl` |
| `xpack.dataFederation.enableGoogleCloudStorageDataSourceType` | `false` | Show GCS as a data source type |
| `xpack.dataFederation.enableAzureDataSourceType` | `false` | Show Azure Blob as a data source type |

## Config

`xpack.dataFederation.workloadIdentityIssuerUrl` - JWT issuer URL used by federated identity
