# Streams App Plugin — Agent Context

For domain concepts, pipeline description, cross-package placement rules, and naming conventions, see [`x-pack/platform/plugins/shared/streams/AGENTS.md`](../streams/AGENTS.md).

## UI conventions

- Use `@elastic/eui` components with Emotion (`@emotion/react`) for styling; avoid inline styles.
- Keep data-fetching logic in hooks; components should remain presentational.
- Never abbreviate "significant" in component names, hook names, or file names.
