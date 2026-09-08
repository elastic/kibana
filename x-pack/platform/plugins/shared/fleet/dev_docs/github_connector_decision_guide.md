# GitHub: action connector vs content connector

**Status:** implemented
**Audience:** authors integrating GitHub data into Elasticsearch

Elastic offers two unrelated ways to get GitHub data into Elasticsearch. They
are not alternatives to each other in the usual sense — they solve different
problems, and picking the wrong one is expensive to unwind.

| | **Action connector** (`kbn-connector-specs` github) | **Content connector** (`es-connectors-github`) |
| --- | --- | --- |
| Plane | GraphQL, called from workflows | Elasticsearch content sync |
| Invoked by | A workflow step (`github.runQueryTemplate`) | The connector service, on its own schedule |
| You control | The exact query, shape, and target index | Which repos to sync; the schema is fixed |
| Best at | Selective, relational, org-scale queries | Bulk repo and code corpus search |
| Output | Whatever your workflow writes | Documents in the connector's schema |

## Decision matrix

| If you need… | Use | Why |
| --- | --- | --- |
| **Projects V2 data** (fields, items, status) | **Action connector** | Only reachable via GraphQL. The content connector cannot express it. |
| **Issue ↔ PR relationship graph** | **Action connector** | Requires traversing linked records in one query and writing edges. |
| **Rate-limited org-scale ETL** | **Action connector** | One scheduled caller with checkpointing and backoff shares the org rate limit predictably. |
| **Incremental sync on a watermark** | **Action connector** | The workflow owns the cursor and watermark. |
| **Cross-source correlation** before indexing | **Action connector** | Join in the workflow; the content connector indexes GitHub in isolation. |
| **Full repo / code corpus search** | **Content connector** | Purpose-built for bulk file and code sync. |
| **Repo content search with no custom schema** | **Content connector** | Zero query authoring; managed sync. |

**Projects V2 requires the action-connector GraphQL plane.** This is the
constraint that most often decides the choice, and it is not a preference: the
data is not exposed on the content-connector path at all.

## Why the distinction is sharp

The content connector answers *"make GitHub content searchable."* It owns its
schema and its sync loop; you choose repos, not queries.

The action connector answers *"call GitHub and do something with the answer."*
It is a transport. It does not know your index schema, and it should not — the
mapping from GitHub records to your documents is workflow logic. Expecting a
connector action to emit your product's document shape couples the connector to
one consumer.

## Dual-pipeline pattern

The two can coexist, and sometimes should:

```
Content connector ──> code/repo corpus index ──┐
                                                ├──> search + agents
Action connector ──> workflow ETL ──> entity/relationship indices ──┘
```

Use the content connector for the searchable corpus and the action connector for
the structured entity graph. Keep them in **separate indices**: they have
different schemas, different freshness guarantees, and different owners.

## Choosing an action: `isTool`

Within the action connector, every action declares `isTool`, and the
classification is enforced.

- `isTool: true` — exposed to Agent Builder agents. Suitable for bounded,
  interactive lookups an agent can reason about.
- `isTool: false` — workflow-only. Correct for heavy paginated ingest actions
  such as `runQueryTemplate`.

Heavy pagination actions must be `isTool: false`. An agent invoking an
unbounded, rate-limit-consuming sync mid-conversation is a failure mode, not a
capability.

## Migration note

Moving from content connector to action connector is not a config change — it is
a re-model. The schemas differ, so plan a reindex into new indices rather than
attempting to convert documents in place.

## Related

- [Workflow ETL cookbook](./workflow_etl_cookbook.md)
- [Agent Builder fleet agent authoring guide](./agent_builder_fleet_agents.md)
- [Reference architecture: packaged multi-source ETL on Kibana](./packaged_etl_reference_architecture.md)
