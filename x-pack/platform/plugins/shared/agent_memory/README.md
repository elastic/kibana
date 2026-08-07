# Agent memory

A persistent, agent-writable knowledge base for Agent Builder agents.

Memory is a wiki: pages have a stable UUID, a mutable unique name, markdown content, and
many-to-many categories (nestable with `/`, e.g. `services/checkout`). Every write appends a
new version, so history and diffs are available and deletes are tombstones.

The editorial rule the skills enforce: memory is not a mirror of data that lives elsewhere.
Store what is hard to reconstruct later — above all **how sources compose** (which stream maps
to which service, which service to which repo, which alerts route to which channel) — and
record *where* to fetch anything a connected source can answer on demand.

## What this plugin owns

| Surface | Notes |
|---|---|
| `MemoryService` | Versioned CRUD, keyword/semantic/hybrid search, category tree, history |
| Data streams | `.agent-memory-pages` and `.agent-memory-history`, both hidden. Neither name may be a prefix of the other — index templates match on `<name>*`. |
| Tools | 7 registered Agent Builder tools under `platform.memory.*`, so they appear in the tool picker and over MCP |
| Skills | `agent-memory`, plus curation skills for consolidation, conversation scraping, and gap detection |
| Workflows | Managed curation workflows owned by `agentMemory` |
| HTTP API | `/internal/agent_memory/*`, authorised with `agentMemory:read` / `agentMemory:write` |

The UI lives in the Context app (`context_engine`), not here — this plugin is server-only.

## Enabling

Memory is off by default. Enable it in `kibana.yml`:

```yaml
xpack.agentMemory.enabled: true
```

and turn on the global advanced setting `agentMemory:enabled` to surface it in the UI.

## Agents

An agent gets the memory tools by setting `enable_memory: true` in its configuration (or by
selecting individual `platform.memory.*` tools). That grants search/read/write/patch/list;
`delete` and `recent_changes` stay opt-in and are requested explicitly by the curation skills.

## Pre-GA leftovers

Memory previously lived in the `significant_events` plugin and wrote to
`.significant_events-memories` / `.significant_events-memory-history`. Those data streams are no
longer read or written; they age out on their own retention and are safe to delete manually.
