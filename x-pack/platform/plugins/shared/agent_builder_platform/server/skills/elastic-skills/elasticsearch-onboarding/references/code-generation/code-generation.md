---
name: code-generation
description:
  Guide for generating Elasticsearch code during onboarding. Covers documentation verification before generating, the
  write confirmation protocol, client library references, and idiomatic code generation principles. Focused on
  Elasticsearch resource operations, not generic application code.
---

# Elasticsearch Code Generation

This reference applies to all code the agent generates during onboarding that interacts with Elasticsearch resources:
index creation, mapping configuration, ingestion, queries, pipelines, synonym sets, and API key management. It does
**not** cover generic application setup (frameworks, routing, project scaffolding) — the agent's default tools handle
that.

## Verify API Docs Before Generating

Before generating any Elasticsearch code, verify the API syntax against the developer's cluster version. Generating from
memory produces code that is wrong for the version the developer is actually running.

Use whatever documentation retrieval the runtime provides. The **Elastic Docs MCP server** is the preferred source where
MCP is available — see the Documentation Lookup section in
[cluster-access](../cluster-access/cluster-access.md#documentation-lookup) for the endpoint, its tools, and the config
block. Runtimes without MCP fetch the documentation URLs directly.

Verify these before generating:

- **Elasticsearch REST API syntax** — Endpoint paths, request body structure, required vs. optional fields. APIs change
  across versions; do not assume syntax from memory.
- **Client library methods** — Method signatures, connection patterns, and constructor arguments for the developer's
  chosen language.
- **Inference and ML APIs** — Model IDs, inference endpoint configuration, `semantic_text` field syntax. These evolve
  rapidly.
- **Ingest pipeline processors** — Available processors, their parameters, and version availability.

## Client Library References

Generate code using the official Elasticsearch client for the developer's language. Look up current method signatures;
do not rely on memorized APIs.

| Language              | Client docs                                                                                 |
| --------------------- | ------------------------------------------------------------------------------------------- |
| Python                | [Python client](https://www.elastic.co/docs/reference/elasticsearch/clients/python)         |
| JavaScript/TypeScript | [JavaScript client](https://www.elastic.co/docs/reference/elasticsearch/clients/javascript) |
| Java                  | [Java client](https://www.elastic.co/docs/reference/elasticsearch/clients/java)             |
| Go                    | [Go client](https://www.elastic.co/docs/reference/elasticsearch/clients/go)                 |
| .NET                  | [.NET client](https://www.elastic.co/docs/reference/elasticsearch/clients/dotnet)           |
| Ruby                  | [Ruby client](https://www.elastic.co/docs/reference/elasticsearch/clients/ruby)             |
| PHP                   | [PHP client](https://www.elastic.co/docs/reference/elasticsearch/clients/php)               |

For the full client overview: [Elasticsearch clients](https://www.elastic.co/docs/reference/elasticsearch-clients)

## Write Confirmation Protocol

Before executing any write operation against the cluster (creating an index, ingesting documents, configuring a
pipeline, creating a synonym set), follow this protocol:

1. Verify the correct API syntax for the developer's Elasticsearch version against the documentation.
2. Show the developer the exact API call:
   > I'll create the index with this call:
   >
   > ```http
   > PUT /products-v1
   > { "mappings": { ... }, "aliases": { "products": {} } }
   > ```
   >
   > Want me to execute this, or would you prefer a code snippet in [their language] you can run yourself?
3. Wait for confirmation before executing. If they want a code snippet, generate it following the principles below.

## Code Generation Principles

### Explain the API pattern, then implement it

When generating Elasticsearch code, briefly explain the language-agnostic API pattern before showing the
language-specific implementation. The developer should understand the underlying REST operation so they can adapt it to
any client or run it from Kibana Dev Tools themselves. Keep the explanation to one or two sentences — don't lecture.

### Generate focused, minimal code

Each snippet should do one thing well. Avoid combining unrelated operations into a single block. If the developer needs
index creation, ingestion, and a search endpoint, generate them as separate, clearly labeled snippets — not a monolithic
script.

### Write idiomatic code for the developer's language

Use the conventions of the developer's chosen language and its Elasticsearch client:

- Python — `elasticsearch-py`, async patterns where appropriate, context managers
- JavaScript/TypeScript — `@elastic/elasticsearch`, promises/async-await, proper error types
- Java — `elasticsearch-java`, builder patterns, typed responses
- Go — `go-elasticsearch`, idiomatic error handling

Do not transliterate Python into another language. Look up the client's actual API surface in its documentation.

### Connection setup

This section is about the **application you generate for the developer**, which has to open its own connection. It does
not describe how this skill reaches the cluster — that binding is handled by the runtime, and you should never ask the
developer for an endpoint or key in order to perform a read yourself.

Use the Elasticsearch URL + `api_key` for connection. Include self-managed alternatives in a comment.

When generated code includes a connection block, tell the developer where to find their credentials:

- **Elasticsearch URL** — In Kibana: help icon (?) → **Connection details**. Also at <https://cloud.elastic.co> →
  deployment overview.
- **API key** — In Kibana: **Management → Security → API keys → Create API key**. Copy the **Encoded** value.
- **Self-managed** — Point `hosts` at their cluster endpoint with `api_key` or `basic_auth`.

The developer already has a cluster — never suggest signing up.

### Use versioned index names with aliases

Create indices with a versioned name (e.g., `products-v1`) and an alias (`products`). All queries and writes go through
the alias. This enables zero-downtime reindexing when mappings change.

### Bulk operations for ingestion

Use the Bulk API for any multi-document write. Single-document indexing is acceptable only for one-off examples.

### Error handling

Include error handling relevant to the Elasticsearch operation: bulk API partial failures, index-not-found, version
conflicts, timeouts. Don't add generic try/catch boilerplate unrelated to the Elasticsearch interaction.
