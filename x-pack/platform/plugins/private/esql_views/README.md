# ES|QL Views

The ES|QL Views plugin provides the Stack Management UI for creating and managing ES|QL views.

## Configuration

| Setting | Default | Description |
| --- | --- | --- |
| `xpack.esqlViews.managementUi.enabled` | `false` | Registers the ES|QL Views Stack Management application and navigation when enabled. |

Disabling the management UI does not disable the shared ES|QL routes, resource-browser integration,
or Elasticsearch-backed ES|QL Views capabilities. Elasticsearch privileges continue to control
access to those features.

## Privileges

UI capabilities are derived from ES|QL view index privileges on `*`:

| Index privilege on `*`               | Effect                                                                        |
| ------------------------------------ | ----------------------------------------------------------------------------- |
| `read_view_metadata`                 | Management navigation, page rendering, and the resource-browser View category |
| `read_view_metadata` + `create_view` | Create and Edit controls                                                      |
| `read_view_metadata` + `delete_view` | Row delete, row selection, and bulk delete controls                           |

`manage_view`, `manage`, and `all` imply all three view privileges.
