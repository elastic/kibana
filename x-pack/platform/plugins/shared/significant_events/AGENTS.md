# Significant Events Plugin — Agent Context

Significant Events is the name for a set of functionalities meant to derive useful information from Streams, related to incident monitoring, investigation and remediation.

It used to be part of the Streams plugin, now it is in its own dedicated plugin.

## Naming conventions

Never abbreviate "significant" in identifiers, file names, or folder names:

| ✅ Correct            | ❌ Avoid      |
| --------------------- | ------------- |
| `significantEvent`    | `sigEvent`    |
| `SignificantEvent`    | `SigEvent`    |
| `significant_event_*` | `sig_event_*` |
| `SIGNIFICANT_EVENT_*` | `SIG_EVENT_*` |

As Significant Events used to be co-located inside Streams, a lot of symbols were prefixed with `SignificantEvents`. Now that there is a separate plugin, consider removing it.

The guideline is: if a concept is meant to be used outside the context of the plugin, consider prefixing it with `SignificantEvents` or `significantEvents`. If it is not, it is safe to not include the prefix.

When something is related to the Knowledge Indicator (KI) system, it should be indicated as such. `KnowledgeIndicator` (or `knowledgeIndicator`), or the use of `KI` are ok. `Ki` is not.

## Cross-package ownership

KI feature extraction, query generation, KI search, token helpers, and diverse
sampling live in `@kbn/nightshift-ai`
(`x-pack/platform/packages/shared/kbn-nightshift-ai`), owned by `@elastic/nightshift-sre-agent-team`. This
plugin adapts stream definitions through `streamToAnalysisTarget` before calling
into that package.

## Knowledge indicator storage

KIs are keyed by Nightshift **source id** (`source.id` in the data stream, `source_id` on the
wire) and scoped to the Kibana space they were written from (`kibana.space_ids`, stamped by the
data-stream client). `KnowledgeIndicatorClient` is built per request with `request.spaceId`;
every read filters on that space and never falls back to unscoped documents. Alerting v2 rules
for a KI live in the same space and carry the `nightshift:source:<sourceId>` tag.

Until the sources catalog replaces streams as the onboarding unit, callers pass the stream name
as the source id, so route paths still say `{streamName}` while the storage says `source.id`.
Documents written before this keying (`stream.name`, no space) are invisible to every reader;
`POST /internal/significant_events/knowledge_indicators/_reset` is the only path that removes them.

## Keeping this file current

Update this file when you make a change that would mislead an agent reading it: cross-package ownership changes, pipeline restructuring, addition or removal of concepts relevant to the pipeline, or naming convention updates. Do not update it for type field additions or directory reorganisations within a package — those are discoverable from the code.
