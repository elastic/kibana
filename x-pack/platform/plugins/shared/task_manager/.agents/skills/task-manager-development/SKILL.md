---
name: task-manager-development
description: Working with the Task Manager plugin internals — task store, scheduling, runner lifecycle, health monitoring, or capacity estimation. Use when modifying task persistence, polling, capacity logic, or writing Task Manager integration tests.
---

# Task Manager Development

Note: for registering and scheduling tasks as a *consumer* of Task Manager, use the `task-manager-registration` skill at `.agents/skills/task-manager-registration/SKILL.md` instead.

## Testing Requirements

- **Unit tests**: Required for all new server files (co-located `.test.ts`)
- **Integration tests**: Use the sample task plugin at `x-pack/platform/test/plugin_api_integration/plugins/sample_task_plugin/`
- **Avoid flakiness**: Never use raw `setTimeout`/delays in tests. Prefer waiting for specific conditions.
- When a wait is necessary, extract it into a named constant with a comment explaining why

## Performance

- Task Manager has capacity estimation (`health` endpoint)
- Don't schedule tasks at intervals shorter than the polling interval
- For bulk operations, batch task claims rather than individual queries
- Avoid holding task claims for extended periods

## Code Style

- Follow the existing pattern of using `partialTask` spreads instead of manually picking fields
- Use the existing `createStartServicesMock()` for test setup
- Constants for timeouts and intervals — no magic numbers
- Prefer `optionalPlugin` over `requiredPlugin` when a dependency is not essential for core functionality

## Key Files

- `server/task_scheduling.ts` — Entry point for scheduling operations
- `server/task_store.ts` — All ES interactions for task documents
- `server/task_running/task_runner.ts` — Execution lifecycle
- `server/monitoring/` — Health and capacity monitoring
- `test/plugin_api_integration/` — Integration test patterns
