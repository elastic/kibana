# Streams Plugin — Agent Context

## Pipeline overview

Significant Events surfaces meaningful occurrences in stream data. The pipeline flows in one direction:

**Feature extraction** → **Query generation** → **Rule backing** → **Detection** → **Discovery** → **Significant Event**

- **Features** are patterns extracted from stream data (log patterns, error clusters, entity types). They are stored as Knowledge Indicators of `type: 'feature'` in `.significant_events-knowledge_indicators`.
- **Queries** are ES|QL queries generated from Features by an LLM task. Stored as Knowledge Indicators of `type: 'query'`. Queries with `severity_score >= 60` are eligible for automatic Kibana rule creation.
- **Detections** are raw alert signals produced when a backed rule fires.
- **Discoveries** are AI-grouped analyses of one or more Detections, capturing root cause, impact, and recommendations.
- **Significant Events** are the user-facing artifacts created from processed Discoveries.

Schemas for all entities live in `@kbn/streams-schema` (`src/sig_events/`, `src/queries/`, `src/feature.ts`). LLM logic lives in `@kbn/streams-ai`.

## Where to put things

| What you are adding | Package | Location |
|---|---|---|
| New domain type, schema, or Zod validator | `kbn-streams-schema` | `src/sig_events/<entity>/`, `src/queries/`, or `src/feature.ts` |
| New API request/response shape | `kbn-streams-schema` | `src/api/significant_events/` |
| New LLM prompt, agent tool, or inference workflow | `kbn-streams-ai` | `src/significant_events/`, `src/features/`, or `src/knowledge_indicators/` |
| New internal HTTP route | `streams` plugin | `server/routes/internal/sig_events/<entity>/route.ts` |
| New public/versioned HTTP route | `streams` plugin | `server/routes/sig_events/<path>/route.ts` |
| New server-side client or service | `streams` plugin | `server/lib/sig_events/<entity>/` |
| Knowledge Indicator read/write logic | `streams` plugin | `server/lib/streams/ki/knowledge_indicator_client/` |
| Any UI component, hook, or service | `streams_app` plugin | Follow existing structure |
| Evaluations | `kbn-evals-suite-significant-events` | See package README |

**Never:**
- Add domain types directly to `streams` or `streams_app` — they belong in `kbn-streams-schema`.
- Add LLM/inference logic to `streams` — it belongs in `kbn-streams-ai`.
- Add UI components to `streams` — all UI lives in `streams_app`.
- Place new routes under the public path without a deliberate API contract — use `internal/` first.

## Naming conventions

Never abbreviate "significant" in identifiers, file names, or folder names:

| ✅ Correct | ❌ Avoid |
|---|---|
| `significantEvent` | `sigEvent` |
| `SignificantEvent` | `SigEvent` |
| `significant_event_*` | `sig_event_*` |
| `SIGNIFICANT_EVENT_*` | `SIG_EVENT_*` |

## Keeping this file current

Update this file when you make a change that would mislead an agent reading it: cross-package ownership changes, new "never" rules, pipeline restructuring, or naming convention updates. Do not update it for type field additions or directory reorganisations within a package — those are discoverable from the code.
