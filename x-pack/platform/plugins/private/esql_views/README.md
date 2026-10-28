# ES|QL Views

The ES|QL Views plugin provides the Stack Management UI for creating and managing ES|QL views.

## Privileges

UI capabilities are derived from ES|QL view index privileges on `*`:

| Index privilege on `*`               | Effect                                                                        |
| ------------------------------------ | ----------------------------------------------------------------------------- |
| `read_view_metadata`                 | Management navigation, page rendering, and the resource-browser View category |
| `read_view_metadata` + `create_view` | Create and Edit controls                                                      |
| `read_view_metadata` + `delete_view` | Row delete, row selection, and bulk delete controls                           |

`manage_view`, `manage`, and `all` imply all three view privileges.
