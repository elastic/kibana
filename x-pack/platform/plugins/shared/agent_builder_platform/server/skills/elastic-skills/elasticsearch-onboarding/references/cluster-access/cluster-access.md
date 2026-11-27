---
name: cluster-access
description:
  Cluster access patterns and the read/write separation model for the onboarding playbook. Covers which reads to perform
  automatically, the write confirmation protocol, documentation lookup for verifying API syntax, and an optional
  appendix for wiring the developer's own IDE to Elastic over MCP.
---

# Cluster Access

The onboarding skill separates cluster interaction into **reads** and **writes**. Reads happen automatically to keep the
agent informed. Writes require explicit developer approval so the experience stays educational.

The runtime already binds this skill to the developer's cluster, so there is no connection step for the agent. Reference
every call in HTTP-shorthand form and let the `Operations` table in `SKILL.md` translate it. Never ask the developer for
an endpoint or a credential to perform a read you can perform yourself.

## Reading: Inspect Before You Ask

Ground every recommendation in the developer's actual cluster instead of asking them to describe it. These reads are
cheap, safe, and should happen proactively throughout onboarding:

| Goal                                      | Call                    |
| ----------------------------------------- | ----------------------- |
| Detect version and deployment flavor      | `GET /`                 |
| List existing indices                     | `GET /_cat/indices`     |
| Read field names and types                | `GET /{index}/_mapping` |
| Check how much data exists                | `GET /{index}/_count`   |
| Inspect real documents and test relevance | `POST /{index}/_search` |
| Aggregate or explore tabular results      | `POST /_query`          |

`GET /` is the first call worth making. `version.number` drives which field types and features are available, and
`version.build_flavor` is `serverless` on Elastic Cloud Serverless — which tells you `semantic_text` works with no
inference endpoint setup. Tell the developer what you found rather than asking them to look it up.

Before proposing any mapping change, read the current mapping with `GET /{index}/_mapping`. Before claiming a query is
slow or a result set is wrong, run it with `POST /{index}/_search` and quote the actual response.

**If a read fails**, say so plainly and name what you could not determine. Do not silently guess a version or a field
type — an unverified assumption here produces a mapping the developer has to rebuild later. Ask the developer only for
what you genuinely could not read.

**Do not front-load connection state.** A failed or unconfigured connection is worth one sentence at the moment it
actually blocks you, attached to the question you were already asking. It is never the opening move, and the developer
does not need to hear about credentials or config files before they have said what they want to build. This restraint
applies to _your_ access only — when the developer asks how to connect their own IDE, answer that directly from the
appendix below.

## Writing: Confirmation Protocol

When the agent needs to change the cluster, **never execute silently**. Follow this protocol:

1. **Verify the API first.** Look up the correct syntax, required fields, and version-specific behavior before proposing
   the call. See [Documentation Lookup](#documentation-lookup) below for how, and
   [code-generation.md](../code-generation/code-generation.md) for the code standards.
2. **Show the developer what you plan to do:**
   > I'll create the index with this API call:
   >
   > ```http
   > PUT /products-v1
   > { "mappings": { ... }, "aliases": { "products": {} } }
   > ```
   >
   > Want me to execute this, or would you prefer a code snippet in [their language] you can run yourself?
3. **Wait for confirmation.** If they say yes, execute it. If they want the code snippet instead, generate it using the
   standards in [code-generation.md](../code-generation/code-generation.md). Remember their choice on whether they want
   a code snippet or not. If not, then future permission requests should not offer code snippets unless the user
   explicitly asks for it.

This ensures the developer understands what is being created and learns the underlying APIs.

**When to use reads vs. writes:**

| Action                        | Read or Write | Call                           |
| ----------------------------- | ------------- | ------------------------------ |
| Check version                 | Read          | `GET /`                        |
| List indices                  | Read          | `GET /_cat/indices`            |
| Inspect mappings              | Read          | `GET /{index}/_mapping`        |
| Check document count          | Read          | `GET /{index}/_count`          |
| Run a test search query       | Read          | `POST /{index}/_search`        |
| Explore tabular results       | Read          | `POST /_query`                 |
| Create an index               | Write         | `PUT /{index}`                 |
| Point an alias at a new index | Write         | `POST /_aliases`               |
| Ingest documents              | Write         | `POST /_bulk`                  |
| Configure ingest pipeline     | Write         | `PUT /_ingest/pipeline/{name}` |
| Create/update synonym set     | Write         | `PUT /_synonyms/{id}`          |

Reads need no confirmation. Every write in the lower half of that table needs the protocol above.

## Documentation Lookup

Reading the cluster tells you what the developer has. It does not tell you whether the API call you are about to write
is correct for their version. Verify syntax, field types, model IDs, and client method signatures against Elastic
documentation before generating code or proposing a write — API surfaces change across versions, and inference and ML
APIs change fastest.

Elastic publishes a documentation MCP server at `https://www.elastic.co/docs/_mcp/`. It serves public documentation and
needs no credentials. Its tools are `search_docs` (search by topic) and `get_document_by_url` (fetch a page by URL). If
the runtime supports MCP and the server is not yet configured, adding it is one block:

```json
{
  "mcpServers": {
    "elastic-docs": {
      "url": "https://www.elastic.co/docs/_mcp/"
    }
  }
}
```

VS Code uses a different key and requires an explicit transport:

```json
{
  "servers": {
    "elastic-docs": {
      "type": "http",
      "url": "https://www.elastic.co/docs/_mcp/"
    }
  }
}
```

**The obligation is to verify, not to use any particular tool.** Runtimes that do not support MCP — or that already ship
their own documentation retrieval — satisfy this by fetching the documentation URLs listed in the playbook directly.
Never skip verification and generate from memory instead; that is how version-wrong code reaches the developer.

## Appendix: Connecting the Developer's Own IDE Over MCP

**This appendix is not part of the agent's access path.** The agent already reaches the cluster through the runtime, and
nothing here is required for onboarding to work. Use it only when the developer explicitly asks how to wire _their_ IDE
or chat client to Elastic — for example, so they can query their data from a client that has no Elastic binding of its
own. Treat it as a task you are helping the developer complete, not as setup you need.

The supported path is the
[Agent Builder MCP server](https://www.elastic.co/docs/explore-analyze/ai-features/agent-builder/mcp-server), which
exposes Agent Builder's read-only built-in tools over MCP from Kibana. Availability:

| Deployment                       | Status              |
| -------------------------------- | ------------------- |
| Elastic Cloud Serverless         | Generally available |
| Elastic Stack 9.3+ (any hosting) | Generally available |
| Elastic Stack 9.2                | Technical preview   |
| Elastic Stack below 9.2          | Not available       |

Self-managed deployments are supported — the gate is version and subscription tier, not where Elasticsearch runs. Agent
Builder requires the appropriate Elastic Stack subscription or Serverless feature tier.

Point the developer at these steps rather than reproducing credentials in the conversation:

1. **Copy the MCP server URL** from Kibana: **Agent Builder → Tools → Manage MCP → Copy MCP Server URL**. This gets the
   path and Kibana space right, which hand-assembling often does not.
2. **Create an API key** with Kibana application privileges for Agent Builder. The key needs `feature_agentBuilder.read`
   and `feature_actions.read` on the `kibana-.kibana` application, plus `read` and `view_index_metadata` on the indices
   they want exposed. Tools run with the key's scope, so restrict it to those indices. Elastic's
   [API key guide](https://www.elastic.co/docs/explore-analyze/ai-features/agent-builder/mcp-server-api-keys) has the
   exact request body.
3. **Add the server to their client config** — `.cursor/mcp.json`, `.vscode/mcp.json`, `.mcp.json` for Claude Code, or
   the client's documented location. Clients bridge to the HTTP endpoint with `mcp-remote`, passing the key in an
   `Authorization` header. The guide above shows the full block.
4. **Tell them to reload MCP connections** and to add the config file to `.gitignore`, since it holds a credential.

If they hit `403 Forbidden`, it is one of three things: the key lacks `feature_agentBuilder.read`, the deployment's
subscription tier does not include Agent Builder, or the Kibana space in the URL does not match the space in the key's
privileges.

The older standalone Elasticsearch MCP server (`docker.elastic.co/mcp/elasticsearch`) connects straight to Elasticsearch
with no Kibana involved, which makes it the only MCP option below Stack 9.2 or where Kibana is absent. It is
[deprecated](https://github.com/elastic/mcp-server-elasticsearch/issues/219) and receives critical security updates
only. Mention it only for those cases, and say plainly that it will not gain features and that upgrading moves them onto
the supported path.

Both MCP servers are read-only. Neither one changes the write confirmation protocol above.

## Agent Builder

If the developer wants to go further — build custom agents, define custom tools over their indices, or expose those
tools to other clients — point them to the **kibana-agent-builder** skill
(`skills/kibana/kibana-agent-builder/SKILL.md`).
