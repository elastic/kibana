## Saved Objects Tagging API migration

The legacy tag CRUD endpoints under `/api/saved_objects_tagging` are deprecated. Use the new `/api/tags` endpoints instead.

### Endpoint mapping

| Legacy endpoint | New endpoint |
| --- | --- |
| `GET /api/saved_objects_tagging/tags` | `GET /api/tags` |
| `GET /api/saved_objects_tagging/tags/{id}` | `GET /api/tags/{id}` |
| `POST /api/saved_objects_tagging/tags/create` | `POST /api/tags` |
| `POST /api/saved_objects_tagging/tags/{id}` | `PUT /api/tags/{id}` *(upsert)* |
| `DELETE /api/saved_objects_tagging/tags/{id}` | `DELETE /api/tags/{id}` |

### Behavioral differences

- **Create**
  - **Legacy**: `POST /api/saved_objects_tagging/tags/create` returns **200**
  - **New**: `POST /api/tags` returns **201**
  - **Response shape**:
    - **Legacy**: `{ "tag": { "id", "name", "description", "color", "managed" } }`
    - **New**: `{ "id", "data": { "name", "description", "color" }, "meta": { ... } }`
- **Update / Upsert**
  - **Legacy**: `POST /api/saved_objects_tagging/tags/{id}` is **update-only** and returns **404** if the tag does not exist
  - **New**: `PUT /api/tags/{id}` is an **upsert**
    - returns **200** when updating an existing tag
    - returns **201** when creating a tag at the provided `{id}`
- **Search**
  - **Legacy**: `GET /api/saved_objects_tagging/tags` returns `{ "tags": [ { "id", "name", "description", "color", "managed" } ] }`
  - **New**: `GET /api/tags` returns `{ "data": [ { "id", "data": { ... }, "meta": { ... } } ], "meta": { "page", "per_page", "total" } }`
- **Delete**
  - **Legacy**: `DELETE /api/saved_objects_tagging/tags/{id}` returns **200**
  - **New**: `DELETE /api/tags/{id}` returns **204**

