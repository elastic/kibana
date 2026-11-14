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

For S3, the user can set up the AWS side either by running the manual AWS CLI steps, or by opening an Elastic-hosted CloudFormation template in the AWS console with the issuer and deployment/project ID prefilled.

## Advanced setting

`dataFederation:enabled` (registered by this plugin, enabled by default) controls whether the management app is enabled in the browser. The app also requires the `manageFederatedData` capability and, in stateful, an Enterprise license. It only affects the UI: data sources and datasets keep working through the API and in ES|QL queries. It is the user-facing switch, as opposed to `xpack.dataFederation.enabled`, which is a deploy-time kill switch resolved by core: when it is `false` the plugin is not loaded at all, so neither the routes nor the advanced setting exist.

## Connection testing

The data source flyout has a **Test connection** action that checks the configuration currently in the form without saving it. Elasticsearch answers with one of three statuses: `success`, `failure` (with a reason), or `untestable` — the settings are valid but cannot be verified at the data source level, for example anonymous or bucket-scoped credentials.

The Kibana route proxies to Elasticsearch `POST /_query/data_source/_test` ([elasticsearch#157686](https://github.com/elastic/elasticsearch/pull/157686)), which only the cluster `manage` privilege grants: users who manage data sources through `global.data_source` get a 403 from the test even though they can save.

Secrets of a saved data source are read back redacted, so a test started from the edit flyout only covers the credentials the user re-entered.

## Feature flags

| Key | Default | Description |
|-----|---------|-------------|
| `xpack.dataFederation.enabled` | `true` | Loads the plugin. The management UI is hidden when the `dataFederation:enabled` advanced setting is turned off |
| `xpack.dataFederation.enableFederatedIdentityAuth` | `false` | No effect; federated identity auth is controlled by `xpack.dataFederation.workloadIdentityIssuerUrl` |
| `xpack.dataFederation.enableGoogleCloudStorageDataSourceType` | `false` | Show GCS as a data source type |
| `xpack.dataFederation.enableAzureDataSourceType` | `false` | Show Azure Blob as a data source type |

## Config

`xpack.dataFederation.workloadIdentityIssuerUrl` - JWT issuer URL used by federated identity

`xpack.dataFederation.awsCloudFormationTemplateUrl` - HTTPS URL of the CloudFormation template the S3 federated identity setup opens in the AWS console. Defaults to the global production template, which is the same for every environment and region. Not meant to be set by users: it only exists so the template can be moved without a Kibana upgrade
