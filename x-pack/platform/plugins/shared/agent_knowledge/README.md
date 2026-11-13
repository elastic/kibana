# Agent Knowledge (Wiki kernel)

Shared platform plugin that owns the **Wiki** product layer for Nightshift and AlertZero.

## Ownership

| Area | Owner |
| --- | --- |
| Plugin + `@kbn/agent-knowledge-common` | `@elastic/nightshift` + `@elastic/alertzero-common-layer` (joint) |
| Nightshift type pack + sandbox hydrate/optimize adapters | `@elastic/nightshift` |
| AlertZero type pack + Rule Tuning wiki optimizer | `@elastic/alertzero-common-layer` |
| Context Engine memory (`remember` / `forget` / dreaming) | Context Engine — **not** extracted here |

## What this plugin owns

- Wiki page store (space-scoped CRUD, OCC, provenance, archive)
- Lifecycle: tentative → established → archived; upsert / corroborate / archive
- Content lint + empty-section cleanup
- Ontology relation kinds (including AlertZero `covers`)
- Product type pack registry
- Workflow steps: `agentKnowledge.recall`, `agentKnowledge.record`

## What it does **not** own

- Nightshift semantic memory / ranking (`nightshift_investigations/server/memory/**`)
- Context Engine `remember` / `forget` / dreaming / Recall API
- Product-specific wiki optimizer prompts
- Sandbox path adapters (stay in Nightshift)

## Consumers

### Nightshift

Registers the Nightshift type pack and binds `nightshift-wiki`. Hydrate/optimize keep sandbox adapters in Nightshift and call the shared store / recall-record APIs.

### AlertZero Rule Tuning

Registers the AlertZero type pack and binds `alertzero-wiki` with `memory_enabled: true` so the same AI index can hold wiki pages and CE session memories.

| Store | Job |
| --- | --- |
| Wiki (this plugin) | Standing, sectioned, corroborated knowledge after the proposal gate |
| CE memory | Tentative facts during/after diagnose; forget or promote into wiki on approve |

## Privileges

Feature id `agentKnowledge`: `read` / `all` for wiki recall/record. CE memory uses Context Engine write privilege + ES write on the backing index.

## Docs

- [CE memory integration](./docs/ce_memory_integration.md) — Wiki vs session memory for Rule Tuning
- Telemetry: `agent_knowledge_wiki_recall`, `agent_knowledge_wiki_record`
