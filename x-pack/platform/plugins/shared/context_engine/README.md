# Context Engine

Server-side plugin for the Context Engine.

## AI Indices API

AI indices attach a logical name to an existing user index pattern or data
stream. AI index records are stored in a hidden Kibana system index
(`.contextengine-ai-indices`), separate from the backing data.

| Method   | Path                                  | Description                     |
| -------- | ------------------------------------- | ------------------------------- |
| `PUT`    | `/api/context_engine/ai_index/{id}`   | Create or update an AI index    |
| `GET`    | `/api/context_engine/ai_index/{id}`   | Get an AI index by id           |
| `GET`    | `/api/context_engine/ai_index`        | List AI indices (max 100)       |
| `DELETE` | `/api/context_engine/ai_index/{id}`   | Delete an AI index              |

Notes:

- The API is gated behind the `contextEngine:enabled` advanced setting
  (disabled by default). All routes return 404 while the setting is off.
- The backing store is set via `dest`, an object of the form
  `{ "type": "data_stream" | "index", "value": "<data stream or index>" }`.
  `dest.value` must match `dest.type`. Every
  expression in `dest.value` must start with `ai-index-ds-` for data streams or
  `ai-index-idx-` for indices (e.g. `ai-index-ds-foo`, `ai-index-idx-foo*`);
  system indices are not allowed.
- `automations` is an array of `{ "type": "workflow", "value": "<name>" }`
  objects, and `sources` is an array of
  `{ "type": "esql", "value": "<ES|QL query>" }` objects. Both are required and
  may be empty arrays.
- Deleting an AI index deletes **only** the AI index entry. Backing indices
  are left untouched and must be removed with the Delete index API if desired.
