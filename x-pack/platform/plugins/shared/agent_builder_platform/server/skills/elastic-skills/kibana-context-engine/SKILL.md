---
name: kibana-context-engine
description: >
  Query Elastic Context Engine AI Indices, and the Knowledge Indicators (KIs) they store. Use when asked to search,
  explore, count, or answer questions from an AI Index / KI / Context Engine knowledge index, or when you need the
  `list_ai_indices`, `describe_ai_index`, or `query_ai_indices` tools, and when writing the ES|QL those tools run.
metadata:
  author: context-eng
  version: 0.1.0
  visibility: internal
  universal: true
compatibility:
  Kibana 9.6 or later with matching Elasticsearch, or an Elastic Serverless project, with Agent Builder enabled and the
  `contextEngine:enabled` advanced setting turned on in the target space. Runs against the Context Engine HTTP APIs, or
  against the equivalent `platform_context_engine_*` tools where a runtime exposes them over MCP. The caller needs Agent
  Builder `read` and Context Engine `read`, plus Elasticsearch `read` and `view_index_metadata` on the backing
  `ai-index-*` indices.
---

# Query Context Engine AI Indices

<!-- begin-partial: preamble -->

## Environment Configuration

This skill runs inside Agent Builder, bound to the Elastic deployment that serves the current conversation. Routing and
credentials are already handled: never ask the user for a URL, an API key, or any other credential, and do not shell out
to the `elastic` CLI.

Reach the Elasticsearch and Kibana HTTP APIs through the built-in API tools:

- `discover_apis` — find an operation's `api` identifier for a `target` of `elasticsearch` or `kibana`.
- `describe_api` — inspect the parameters that operation accepts.
- `execute_api` — run it, passing every value as a flat `params` map.

This skill references operations in HTTP-shorthand form (e.g., `GET /`, `GET /_cat/indices`, `POST /_query`). Translate
each one into an `execute_api` call rather than a CLI command: a bare path is a `target` of `elasticsearch`, and a
`kbn:` prefix is a `target` of `kibana`. The [Operations](#operations) table at the end of this document exists for
runtimes that drive the `elastic` CLI; ignore its CLI column here and use the API tools instead.

Prefer parameters that narrow a response (a filter, a `size` or `per_page` limit, an explicit field selection) because
oversized results are truncated before you see them.

<!-- end-partial: preamble -->

### Choosing a binding

Use whichever binding the runtime already provides, in this order:

1. **The three AI-Index tools, when the runtime exposes them.** Prefer these: they carry the space scoping and the row
   cap, and they need no credential handling. The same three tools appear under two names depending on where you run:

   | Operation | Agent Builder agent                         | Third-party harness, over MCP               |
   | --------- | ------------------------------------------- | ------------------------------------------- |
   | List      | `platform.context_engine.list_ai_indices`   | `platform_context_engine_list_ai_indices`   |
   | Describe  | `platform.context_engine.describe_ai_index` | `platform_context_engine_describe_ai_index` |
   | Query     | `platform.context_engine.query_ai_indices`  | `platform_context_engine_query_ai_indices`  |

   Inside an Agent Builder agent they are the agent's own tools, named with dots. In a third-party harness such as
   Claude Code they arrive from a connected Kibana Agent Builder MCP server, which replaces the dots with underscores.
   Nothing else about them differs.

2. **Otherwise, the HTTP APIs**, reached the way your Environment Configuration above describes — the built-in API tools
   inside Agent Builder, or the `elastic` CLI commands in the [Operations](#operations) table elsewhere.

All bindings run the same three operations against the same deployment, and the rest of this skill applies unchanged.

## Concepts

**AI Index** — an Elasticsearch index named `ai-index-idx-*`, or a data stream named `ai-index-ds-*`, registered with
the Context Engine under a logical id. The registration lives in Kibana; the knowledge lives in the backing index. Only
`list_ai_indices` knows which `ai-index-*` indices are registered and what to put in `FROM`; the index name alone does
not tell you.

**Knowledge Indicator (KI)** — one document in an AI Index: context prepared for agents, such as a description of some
data, a summary, an access pattern, a runnable query, or a record of a Kibana resource. A KI may answer a question
outright, or help you locate and use the source that does.

Search the AI Indices before broader retrieval whenever their KIs may cover the question. If they don't, fall back to
ordinary data and tools. This skill reads KIs; generating them belongs to the Context Engine's automations and feedback
loop.

Three read-only operations back this skill. Each is a Context Engine HTTP API, and each is also exposed as an Agent
Builder tool for runtimes that reach Kibana over MCP. The [Operations](#operations) table binds all three forms:

| Operation | HTTP API (shorthand)                                         | Input                        | Returns                                                              |
| --------- | ------------------------------------------------------------ | ---------------------------- | -------------------------------------------------------------------- |
| List      | `GET kbn:/api/context_engine/ai_index`                       | —                            | `{ ai_indices: [{ id, esql_target, description, managed }] }`        |
| Describe  | `GET kbn:/api/context_engine/ai_index/{aiIndexId}/_describe` | `aiIndexId` in the path      | `{ response }`, a free-form context block (fields, counts, examples) |
| Query     | `POST kbn:/api/context_engine/ai_index/_query`               | `{ query, params?, limit? }` | `{ columns, values }`, ES\|QL rows                                   |

Use them in this order: **list → describe → query**. Never guess an index id, a `FROM` target, or a field name;
`describe_ai_index` supplies all three. Nothing else can read an AI Index correctly: a generic ES|QL or list-indices
tool neither knows which indices are registered nor applies the space scoping.

Every call is scoped to one space, and the space comes from the request rather than from anything written into the
query. Point the request at another space to read that space's KIs.

## The canonical KI schema

Elastic's canonical KI indices share these fields. Other AI Indices differ, so treat this as a starting shape and let
`describe_ai_index` settle the fields for any given index.

| Field         | ES\|QL type | Purpose                                                                                                       |
| ------------- | ----------- | ------------------------------------------------------------------------------------------------------------- |
| `type`        | keyword     | Categorization, e.g. `"index_metadata"`, `"document"`, `"entity_profile"`, `"detection"`                      |
| `title`       | text        | Short name of the KI or its backing entity                                                                    |
| `description` | text        | Short description of this KI                                                                                  |
| `content`     | text        | Full text: purpose, questions answered, access patterns                                                       |
| `tags`        | keyword     | Filter facets; multi-valued, so use `MATCH(tags, ?tag)` rather than `==`                                      |
| `attributes`  | flattened   | Structured keyword-queryable metadata (status, themes, entity names). `attributes.esql` holds runnable ES\|QL |

Semantic sub-fields use **dot notation**: `title.semantic`, `description.semantic`, `content.semantic`. They exist only
where the mapping defines them; the describe block's `Semantic fields` section lists the real ones.

### `attributes.esql` — a KI's runnable ES|QL

When a KI carries runnable ES|QL, it lives in `attributes.esql`. That is the canonical location; do not look elsewhere
in `attributes`. The field is optional, so a query must tolerate its absence. The same access pattern is also presented
as prose inside `content` — templates, params, and returns — so reach for `content` when a KI has no `attributes.esql`,
or when the description of the query matters more than the query itself.

`attributes` is `flattened`, so extract the value with `FIELD_EXTRACT` before filtering or keeping it:

```esql
FROM <esql_target>
| WHERE type == "detection"
| EVAL esql = FIELD_EXTRACT(attributes, "esql")
| WHERE esql IS NOT NULL
| KEEP title, description, esql
| LIMIT 5
```

A KI may store an array of queries, making the extracted value multivalued. `IS NOT NULL` still filters correctly, but
scalar comparisons like `==` skip multivalued rows. Add `| MV_EXPAND esql` after the `IS NOT NULL` to get one row per
query.

## Flow

### Step 1 — List the AI indices

Run the **list** tool with no arguments — `platform.context_engine.list_ai_indices` inside an Agent Builder agent,
`platform_context_engine_list_ai_indices` over MCP, or `GET kbn:/api/context_engine/ai_index` over HTTP. Each entry
gives:

- `id`, to pass to describe.
- `esql_target`, the exact string to put after `FROM`. Use it verbatim: it differs from the id (`sales-knowledge` →
  `ai-index-idx-sales-knowledge`) and may be a data stream.
- `description` and `managed`, to choose between entries.
- `assigned_to_agent`, present only when running inside an Agent Builder agent: whether that agent is set up with this
  index.

The list is scoped to the caller's space and to what the caller can read. An entry whose backing index is empty or does
not exist yet is still listed; an index the caller lacks `read` on is silently left out.

Skip this step when your instructions already name the index. Step 2 still applies: describe supplies the `FROM` target
and the field names either way.

### Step 2 — Describe the one you picked

Run the **describe** tool with `{ "ai_index_id": "<id>" }` from Step 1 — `platform.context_engine.describe_ai_index`
inside an Agent Builder agent, `platform_context_engine_describe_ai_index` over MCP, or
`GET kbn:/api/context_engine/ai_index/{aiIndexId}/_describe` over HTTP. The `response` is a text block meant to be
**read, not parsed**: no regexing it into structured data. It contains:

- the `Query with ES|QL against:` line (the `FROM` target),
- `Fields`, every mapped field as `path: type` plus `searchable` / `aggregatable` (capped at 500; a path mapped
  inconsistently across matched indices shows as `conflict`),
- `Semantic fields`, the searchable `semantic_text` fields, when any,
- `Knowledge item types` and `Tags`, the top 20 KI `type` / `tags` values by document count in this space,
- `Example queries`, three ready ES|QL shapes.

The block is capped at ~16k tokens. Read it and use it; do not echo it back to the user.

### Step 3 — Query

Run the **query** tool with `{ query, params?, limit? }` — `platform.context_engine.query_ai_indices` inside an Agent
Builder agent, `platform_context_engine_query_ai_indices` over MCP, or `POST kbn:/api/context_engine/ai_index/_query`
over HTTP. Build the ES|QL from the describe block's field list, starting from its example queries, and pass user input
as named parameters (`?query`, `?type`, `?tag`) rather than interpolating it into the query string. The response is
`{ columns, values }`; summarize it for the user rather than dumping raw rows.

**What the server owns and you cannot override:**

| Constraint   | Behavior                                                                                                                                                    |
| ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Space filter | Applied server-side from the request. **Never write a space condition into the query**: yours does not replace the server's and can silently match nothing. |
| Row limit    | `limit` defaults to 100, max 1000. A smaller trailing `LIMIT` in the query wins; a larger one is capped.                                                    |
| Query size   | 10,000 characters max                                                                                                                                       |
| `params`     | At most 100 entries; keys ≤256 chars, string values ≤4096 chars                                                                                             |
| Index access | The query's `FROM` decides what is read; Elasticsearch index privileges bound it. ES 4xx comes back as-is.                                                  |

There is no `time_range` and no `filter` parameter. Express time windows in the ES|QL itself
(`WHERE @timestamp >= NOW() - 24 hours`) or through `params`.

## Examples

These run as-is against canonical KI indices. For any other AI Index, adapt the field names from the describe block:
`title.semantic` does not exist unless the mapping has it.

### Full-text search, lexical and semantic fused

```esql
FROM ai-index-idx-sales-knowledge METADATA _id, _index, _score
| FORK
    ( WHERE MATCH(title, ?query) OR MATCH(description, ?query) OR MATCH(content, ?query) | SORT _score DESC | LIMIT 20 )
    ( WHERE MATCH(title.semantic, ?query) OR MATCH(description.semantic, ?query) OR MATCH(content.semantic, ?query) | SORT _score DESC | LIMIT 20 )
| FUSE
| SORT _score DESC, _id ASC
| KEEP title, description, content, type, tags
| LIMIT 5
```

Called with the search phrase as a parameter:

```json
{ "query": "<the esql above>", "params": { "query": "refund policy for annual plans" }, "limit": 5 }
```

### Filter by KI type and tag

```esql
FROM ai-index-idx-sales-knowledge
| WHERE type == ?type AND MATCH(tags, ?tag)
| KEEP title, description, content, type, tags
| LIMIT 5
```

### Count KIs by type

A first probe to confirm the index holds KIs visible from this space:

```esql
FROM ai-index-idx-sales-knowledge
| STATS count = COUNT(*) BY type
| SORT count DESC
| LIMIT 20
```

## Diagnosing

These failure modes look alike from the outside and have different fixes. Work down the table.

| Symptom                                                    | Cause                                                                                            | Fix                                                                                                  |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------- |
| The three tools are absent from the tool list              | `contextEngine:enabled` is off **in that space**. Not a permissions problem                      | Turn it on in that space's advanced settings                                                         |
| The tools are absent on every space                        | Kibana predates the AI-index tools, or Agent Builder is not enabled on it                        | Check the version against the compatibility note above                                               |
| Tool runs but returns an **error result** about privileges | Caller has Agent Builder `read` but not Context Engine `read` (each handler fails closed)        | Add Context Engine `read` to the caller's role                                                       |
| ES **403** from query or describe                          | Missing Elasticsearch index privilege on `ai-index-*`                                            | Grant `read` (query) / `view_index_metadata` (describe)                                              |
| Describe returns a block with no counts sections           | The counts aggregation 403'd (no `read`), or `type`/`tags` are not aggregatable `keyword` fields | Expected degradation; the rest of the block is still usable                                          |
| An AI index you expect is not listed                       | No `read` on its backing index, or every document in it belongs to another space                 | Check privileges and the space the request is scoped to                                              |
| `Unknown index` from a query whose id **was** listed       | The AI Index is registered but its backing index does not exist yet                              | Expected for a registration with no data; pick another index                                         |
| Error saying the query response is too large               | The rows exceeded the 20 MB response cap                                                         | Narrow with `KEEP` (drop `content` and other large fields), lower `limit`, or aggregate with `STATS` |
| Query returns nothing but the index has data               | Wrong space: the server-side space filter hides other spaces' documents                          | Scope the request to the right space                                                                 |

## Guidelines

- Never skip describe. A query written from memory could fail, or silently returns nothing.
- Read AI Indices only through `query_ai_indices`. A direct Elasticsearch query or a cluster-wide ES|QL tool bypasses
  the space scoping and the row cap. Consult the `elasticsearch-esql` skill for ES|QL syntax.
- Start at `limit` 5 and narrow the columns with `KEEP`. The whole result enters your context.
- If the top 5 don't answer the question, check how they fall short: on topic but incomplete → raise the limit; off
  topic → the query is wrong, so reword the search terms or loosen the `WHERE` rather than asking for more rows.
- Answer from the rows and cite the KI titles; do not dump the raw result.

## Out of scope

- Creating, updating, or deleting AI indices, and managing their `sources` / `automations` / `feedback_analysis` config.
- Generating Knowledge Indicators, or deciding what an AI Index should contain. That is the Context Engine's automations
  and its analyze-and-improve feedback loop, not query time.

## Operations

| HTTP API (shorthand)                                         | `elastic` CLI command                                                                                  |
| ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------ |
| `GET kbn:/api/context_engine/ai_index`                       | `elastic kb context-engine get-context-engine-ai-index`                                                |
| `GET kbn:/api/context_engine/ai_index/{aiIndexId}/_describe` | `elastic kb context-engine get-context-engine-ai-index-aiindexid-describe --ai-index-id '<id>'`        |
| `POST kbn:/api/context_engine/ai_index/_query`               | `elastic kb context-engine post-context-engine-ai-index-query --body '<json>'`                         |
| `GET kbn:/api/context_engine/ai_index/{aiIndexId}`           | `elastic kb context-engine get-context-engine-ai-index-aiindexid --ai-index-id '<id>'`                 |
| `POST kbn:/api/context_engine/ai_index`                      | `elastic kb context-engine post-context-engine-ai-index --body '<json>'`                               |
| `PUT kbn:/api/context_engine/ai_index/{aiIndexId}`           | `elastic kb context-engine put-context-engine-ai-index-aiindexid --ai-index-id '<id>' --body '<json>'` |
| `DELETE kbn:/api/context_engine/ai_index/{aiIndexId}`        | `elastic kb context-engine delete-context-engine-ai-index-aiindexid --ai-index-id '<id>'`              |
| `POST kbn:/api/agent_builder/tools/_execute`                 | `elastic kb agent-builder post-agent-builder-tools-execute --tool-id '<id>' --tool-params '<json>'`    |

### Tool equivalents

The same three read operations as tools rather than HTTP calls. The Agent Builder tool id is canonical; a Kibana MCP
server exposes it with the dots replaced by underscores.

| HTTP API (shorthand)                                         | Agent Builder tool id                       | MCP tool name                               | Arguments                    |
| ------------------------------------------------------------ | ------------------------------------------- | ------------------------------------------- | ---------------------------- |
| `GET kbn:/api/context_engine/ai_index`                       | `platform.context_engine.list_ai_indices`   | `platform_context_engine_list_ai_indices`   | `{}`                         |
| `GET kbn:/api/context_engine/ai_index/{aiIndexId}/_describe` | `platform.context_engine.describe_ai_index` | `platform_context_engine_describe_ai_index` | `{ ai_index_id }`            |
| `POST kbn:/api/context_engine/ai_index/_query`               | `platform.context_engine.query_ai_indices`  | `platform_context_engine_query_ai_indices`  | `{ query, params?, limit? }` |

`POST kbn:/api/agent_builder/tools/_execute` runs any of them by id over HTTP, passing the Agent Builder tool id in
`tool_id` and the arguments above in `tool_params`.
