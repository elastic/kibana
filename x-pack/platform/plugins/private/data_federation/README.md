# Data Federation

Management UI for ES|QL data federation — the Elasticsearch feature that lets you query external object storage directly from ES|QL without ingesting data first.

## What it does

Exposes two management screens under **Stack Management > Data**:

- **Data sources** — connections to external storage (S3, GCS, Azure Blob, etc). Each data source holds the credentials and endpoint config Elasticsearch needs to read files. Supports access key, federated identity (keyless), and anonymous access.
- **Data sets** — named references to a path or glob pattern within a data source, plus optional file format settings (Parquet, CSV, NDJSON, etc.). A data set is what you reference in an ES|QL `FROM` clause.

The plugin proxies create/read/delete operations through Kibana's server to the Elasticsearch `/_query/datasource` and `/_query/data_sets` APIs.

## Federated identity auth

When running on Elastic Cloud, data sources can authenticate using the workload identity issuer instead of static credentials. The creation flyout shows the JWT issuer URL and deployment/project ID that the user needs to configure the trust policy on the CSP side (AWS IAM, GCP workload identity, Azure federated credentials).

The issuer URL is injected by the kibana-controller via `xpack.dataFederation.workloadIdentityIssuerUrl`. If that config key is absent the read-only fields are hidden — no derived URL is shown.

## Connection testing

The data source flyout has a **Test connection** action that checks the configuration currently in the form without saving it. Elasticsearch answers with one of three statuses: `success`, `failure` (with a reason), or `untestable` — the settings are valid but cannot be verified at the data source level, for example anonymous or bucket-scoped credentials.

The Kibana route proxies to Elasticsearch `POST /_query/data_source/_test` ([elasticsearch#157686](https://github.com/elastic/elasticsearch/pull/157686)), which only the cluster `manage` privilege grants: users who manage data sources through `global.data_source` get a 403 from the test even though they can save.

Secrets of a saved data source are read back redacted, so a test started from the edit flyout only covers the credentials the user re-entered.

## Feature flags

| Key | Default | Description |
|-----|---------|-------------|
| `xpack.dataFederation.enabled` | `true` | Enables data federation management app |
| `xpack.dataFederation.enableFederatedIdentityAuth` | `false` | Enable federated identity auth option |
| `xpack.dataFederation.enableGoogleCloudStorageDataSourceType` | `false` | Show GCS as a data source type |
| `xpack.dataFederation.enableAzureDataSourceType` | `false` | Show Azure Blob as a data source type |

## Config

`xpack.dataFederation.workloadIdentityIssuerUrl` - JWT issuer URL used by federated identity
