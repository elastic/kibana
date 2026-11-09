# Connector memory (prototype)

Agents that read files through a content connector leave something behind: a cached summary of each
file, readable by later questions. The next question starts from what was learned instead of from scratch, and says
where the answer came from and when it was cached.

## The one idea

Everything memory does with a connector is one workflow step, `connector-memory.crawl`, with different inputs:

| What | Inputs |
| --- | --- |
| A scheduled crawl (the Context tab) | `folder`, `max_depth`, `max_items`, `mode`, on a `scheduled` trigger |
| An agent read a file | `files: [id]`, `file_mode`, and `around` (levels of its folder to also remember, the same way as the file) |
| Run now | the saved crawl's workflow, run once |

The saved crawl is a workflow attached to the `connector-memory` AI index as an automation, so the Context page shows
it. An agent's read runs the very same workflow, rendered without the schedule, as that user. A step runs as the user
the workflow runs as, so a connector that authorizes each user separately is read with that user's own access, and what
is cached is visible only to the users who proved they can open the file.

## Parts (`server/`)

- `sources.ts`: list, stat, read text, "can this user open it", over any connector whose spec declares `contentSource` (the `contextList`, `contextGetMetadata` and `contextGetContent` actions). Knows no connector by name. A file is the connector's own entry id.
- `crawl.ts`: one pass over a plan (a folder, files, the folder around them): what to write and how.
- `summarize.ts`: readable text, credential redaction, a model summary or the start of the file.
- `memory.ts`: the AI index: cached files (one KI per file, rank `names` < `excerpt` < `llm`), per-connector settings,
  readers, the index's sources and automations.
- `workflow.ts`: the saved crawl, the one-off run, and the step itself.
- `learn.ts`: the `afterToolCall` hook that turns an agent's download into a run.
- `lookup.ts`: the agent tool. One query, then a live "can this user open it" check for per-user files.
- `settings.ts`, `routes.ts`, `config.ts`, `plugin.ts`.

The browser (`public/`) is the Context tab on the Edit connector flyout (settings and crawl, saved with the flyout's
own Save, through `registerConnectorFlyoutTab` in `triggers_actions_ui`) and a Stack Management page listing the
connectors.

## Enable

```yaml
xpack.connectorMemory.enabled: true
xpack.connectorMemory.inferenceConnectorId: <a chat connector id>   # summaries; otherwise the start of the file
xpack.connectorMemory.maxConcurrentSummaries: 2                  # files read and summarized at once, across all runs
xpack.connectorMemory.maxSummariesPerMinute: 30                  # model calls per minute; a failure pauses summaries for a minute
xpack.connectorMemory.learn.reach: area                             # direct | siblings | area (default: direct)
xpack.connectorMemory.learn.summarize: true
xpack.connectorMemory.learn.sampleSize: 20                        # files remembered by name from one listing or search (beyond direct hits)
uiSettings.overrides:
  contextEngine:enabled: true
```

An agent learns only if it has the `platform.context_engine.lookup_connector_memory` tool (or `*`).

## What it does not do

- It reads only what an agent downloads. Listings and searches teach it nothing.
- Only connectors that declare `contentSource` (today Google Drive and Amazon S3); a new one adds the three `context*` actions and the marker in its spec, with no change here.
- It does not remove what a deleted connector or file leaves behind before the cached file's expiry (`ttlDays`).
