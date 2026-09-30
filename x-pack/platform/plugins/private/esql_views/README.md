# ES|QL Views

The ES|QL Views plugin provides the Stack Management UI for creating and managing ES|QL views.

## Configuration

| Setting | Default | Description |
| --- | --- | --- |
| `xpack.esqlViews.managementUi.enabled` | `false` | Registers the ES|QL Views Stack Management application and navigation when enabled. |

Disabling the management UI does not disable the shared ES|QL routes, resource-browser integration,
or Elasticsearch-backed ES|QL Views capabilities. Elasticsearch privileges continue to control
access to those features.
