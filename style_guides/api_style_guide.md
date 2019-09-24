
# API Style Guide

## Paths

API routes must start with the `/api/` path segment, and should be followed by the plugin id if applicable:

*Right:* `/api/marvel/nodes`
*Wrong:* `/marvel/api/nodes`

## snake_case

Kibana uses `snake_case` for the entire API, just like Elasticsearch. All urls, paths, query string parameters, values, and bodies should be `snake_case` formatted.

*Right:*
```
POST /api/kibana/index_patterns
{
  "id": "...",
  "time_field_name": "...",
  "fields": [
    ...
  ]
}
```
