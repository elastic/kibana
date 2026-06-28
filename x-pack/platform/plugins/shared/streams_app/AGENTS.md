# Streams App Plugin — Agent Context

For domain definitions (Knowledge Indicator, Feature, Query, Detection, Discovery, Significant Event), data stream names, API routes, and naming conventions, see [`x-pack/platform/plugins/shared/streams/AGENTS.md`](../streams/AGENTS.md). This file covers UI-specific conventions only.

## Where to put things (UI)

For cross-package placement decisions, see the full table in [`streams/AGENTS.md`](../streams/AGENTS.md#where-to-put-things). Within `streams_app`, follow the existing directory structure — look at where similar components, hooks, and services already live before creating new files.

## UI conventions

- Use `@elastic/eui` components with Emotion (`@emotion/react`) for all styling; avoid inline styles.
- Use functional React components; type props explicitly.
- Keep data-fetching logic in hooks; components should remain presentational where possible.
- Keep hooks at the top level; avoid conditional hooks.
- Use the full word "significant" in all component names, hook names, and file names — never abbreviate (see naming conventions in the canonical AGENTS.md).
