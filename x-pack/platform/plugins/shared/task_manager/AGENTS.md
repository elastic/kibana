# Task Manager Plugin

## Architecture

Task Manager is the background job execution engine for Kibana. It handles scheduling, running, and monitoring asynchronous tasks.

Key server modules:
- **task_store.ts** — ES-backed persistence (CRUD for task documents)
- **task_scheduling.ts** — Scheduling logic, `ensureScheduled`, recurring vs one-time
- **task_running/task_runner.ts** — Execution lifecycle (claim → run → report)
- **lib/** — Supporting utilities (capacity estimation, intervals, retries)

## Testing Requirements

- **Unit tests**: Required for all new server files (co-located `.test.ts`)
- **Integration tests**: Use the sample task plugin at `x-pack/platform/test/plugin_api_integration/plugins/sample_task_plugin/`
- **Avoid flakiness**: Never use raw `setTimeout`/delays in tests. Prefer waiting for specific conditions.
- When a wait is necessary, extract it into a named constant with a comment explaining why

## Rules to Follow

### Scheduling Tasks

- Use `ensureScheduled` for tasks that should exist once and survive restarts
- For recurring tasks, specify `schedule: { interval: '5m' }` — not custom cron
- When a task's schedule is updated, use `ensureScheduled` with the new interval — it handles the update
- Task IDs should be deterministic and descriptive (e.g., `alerting:rule:${ruleId}`)

### Task Execution

- Task runners receive a `RunContext` with `taskInstance` and services
- Always handle the case where `taskInstance.state` is empty or malformed
- Return `{ state, schedule }` from the run function — the framework handles retries
- Set task status to `idle` after successful completion, not before

### Error Handling and Retries

- Distinguish between retryable errors (network timeouts) and permanent failures
- Use `isRetryableError()` to classify errors
- The framework retries failed tasks automatically up to `maxAttempts`
- Log errors with the task ID for debuggability

### Concurrency and API Keys

- Tasks can run with user scope (API key) or without (system context)
- When scheduling a task with user scope but security is disabled, log an info message
- API keys are rotated on certain lifecycle events — don't cache them across runs
- `licensing` is an optional dependency — Task Manager works without it

### Performance

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
