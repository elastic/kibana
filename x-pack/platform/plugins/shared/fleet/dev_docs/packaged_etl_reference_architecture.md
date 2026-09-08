# Reference architecture: packaged multi-source ETL on Kibana

**Status:** implemented
**Audience:** architects and package authors

One page describing the platform shape for integrations that ingest from remote
APIs and analyse the result entirely within the Elastic Stack — no Elastic Agent
involved.

This page is **product-agnostic**. A concrete implementation appears in the
appendix as an example, not as the definition.

## The shape

```
                         ┌──────────────────────────────────┐
                         │  Fleet package                   │
                         │  assets + manifest vars          │
                         └────────────────┬─────────────────┘
                                          │ install
             ┌────────────────────────────┼────────────────────────────┐
             ▼                            ▼                            ▼
   ┌──────────────────┐        ┌────────────────────┐       ┌────────────────────┐
   │  Connectors      │        │  Workflows         │       │  Alerting rule     │
   │  (ingest plane)  │◀───────│  (scheduled ETL)   │       │  templates         │
   └────────┬─────────┘  calls └─────────┬──────────┘       └─────────┬──────────┘
            │                            │ writes                     │ creates
            ▼                            ▼                            ▼
   ┌──────────────────┐        ┌────────────────────┐       ┌────────────────────┐
   │  Remote APIs     │        │  Elasticsearch     │       │  Rules             │
   │                  │        │  indices + ES|QL   │       │  (disabled)        │
   └──────────────────┘        └─────────┬──────────┘       └────────────────────┘
                                         │ reads
                          ┌──────────────┴───────────────┐
                          ▼                              ▼
                ┌────────────────────┐        ┌────────────────────┐
                │  Agent Builder     │        │  Dashboards        │
                │  (analysis)        │        │                    │
                └────────────────────┘        └────────────────────┘
```

## Components

| Component | Role | Owns |
| --- | --- | --- |
| **Fleet package** | Unit of distribution and upgrade | Assets, manifest vars, install lifecycle |
| **Connectors** | Ingest plane — authenticated transport to remote APIs | Auth, transport, rate-limit surface |
| **Workflows** | Scheduled ETL — query, map, write | Checkpoints, pagination, document shape |
| **Elasticsearch** | Storage and query | Indices, mappings, ES\|QL views |
| **Agent Builder** | Analysis over stored data | Instructions, tool bindings |
| **Alerting** | Notification on stored data | Rule params, actions |
| **Dashboards** | Visualisation | Panels |

## Design rules

**1. Connectors transport; workflows map.**
A connector must not emit a product's document shape. The mapping from an API
record to an index document belongs in the workflow, or the connector becomes
usable by exactly one consumer and its schema changes ship on the platform
release cadence.

**2. The package ships placeholders, never IDs.**
A package cannot know the connector IDs of its target stack. Assets ship
placeholder tokens resolved at install from package policy vars, with
already-resolved values carried forward on upgrade.

**3. Analysis reads storage, never the source.**
Agents and dashboards query Elasticsearch, not the remote API. This keeps
analysis fast, offline-capable, and free of rate-limit coupling. Ingest is the
only component that talks to the source.

**4. Nothing notifies until an operator opts in.**
Rules install disabled with no actions. The package cannot know where alerts
should go or whether its thresholds suit the deployment.

**5. Every scheduled path is bounded and idempotent.**
Concurrency guards, iteration caps, timeouts, and ID-keyed bulk writes are
mandatory, not optional hardening. Scheduled work that overlaps or retries
without idempotence corrupts data quietly.

## Extension points

| To add… | Do this |
| --- | --- |
| A new data source | Add a connector spec + ingest workflows to the package |
| A new query against an existing source | Register a package-shipped query template |
| New analysis | Add an agent asset binding platform tools |
| New notification | Add an alerting rule template |
| A new derived view | Add an ES\|QL view or index template |

The point of the shape is that each of these is an **asset in a package**, not a
platform code change.

## What this is not

- **Not agent-based collection.** No Elastic Agent participates. Use a standard
  integration when data originates on a host you control.
- **Not hosted agentless.** Hosted agentless still runs an agent that Elastic
  operates. Here there is no agent at all.
- **Not a content sync.** For bulk corpus search, an Elasticsearch content
  connector is the right tool.

## Appendix: SDLC Intelligence as an example

One implementation of this architecture ingests software delivery activity:

| Generic component | SDLC instance |
| --- | --- |
| Fleet package | `sdlc_intel` |
| Connectors | GitHub (GraphQL action connector), plus other SDLC sources |
| Workflows | ~19 scheduled ingest workflows, checkpointed per source and entity type |
| Indices | Issues, pull requests, comments, relationships |
| Agent Builder | Delivery-analysis agents over those indices |
| Alerting | Delivery-health rule templates |

Its choices are illustrative. The GraphQL action-connector plane was required
because the source exposes some data (Projects V2) only over GraphQL — a
source-specific constraint, not an architectural rule.

## Related

- [Fleet package authoring guide (Kibana-only ETL)](./kibana_only_etl_package_authoring.md)
- [Workflow ETL cookbook](./workflow_etl_cookbook.md)
- [Placeholder substitution convention](./placeholder_substitution_convention.md)
- [Agent Builder fleet agent authoring guide](./agent_builder_fleet_agents.md)
- [GitHub action-connector vs content-connector decision guide](./github_connector_decision_guide.md)
- [Integration alerting templates enablement guide](./integration_alerting_templates.md)
