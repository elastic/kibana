# PR #259692 — multi-user conversation dependency

**PR:** [elastic/kibana#259692](https://github.com/elastic/kibana/pull/259692)  
**Author:** Pierre Gayvallet (`pgayvallet`)  
**Status:** Open (not on `main` as of implementation)

## What the PR targets

- Timeline model: `UserMessageEvent` + `AgentExecutionEvent` alongside legacy `conversation_rounds`
- `AgentTriggerHook`: single-user (always run) vs group (`@agent` mention)
- Planned persistence: `events`, `conversation_mode`, `execution_state`
- Planned ACL: group conversations visible to all participants

## What shipped in the scoped PR diff (verify on merge)

- Execution-layer refactor (`AgentExecution`, timeline converters)
- **May not include:** full persistence schema, `queued_trigger`, shared list/get ACL

## Impact on Cases/AB convergence

| Feature | Blocked on #259692? |
|---------|---------------------|
| Phase 1: Add to Chat + case attachment | No |
| Phase 2: case-typed Project (owner-scoped conversations) | No |
| Shared conversations inside a Project | **Yes** — needs group ACL + timeline persistence |
| AI as case participant (Cases UserAction) | No |

## Action items

1. Re-read PR diff on merge; update this doc with actual fields and hooks.
2. Wire Project `conversation_ids` to shared conversations when `conversation_mode=group` is available.
3. Align `@agent` trigger with Cases `@mention` on comments if both land.
