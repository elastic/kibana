# Task Manager Plugin

## Architecture

Background job execution engine for Kibana — scheduling, running, and monitoring asynchronous tasks.

Key server modules:
- **task_store.ts** — ES-backed persistence (CRUD for task documents)
- **task_scheduling.ts** — Scheduling logic, `ensureScheduled`, recurring vs one-time
- **task_running/task_runner.ts** — Execution lifecycle (claim → run → report)

## Rules to Follow

### Scheduling Tasks

- Use `ensureScheduled` for tasks that should exist once and survive restarts
- Use `schedule` / `bulkSchedule` for one-shot or user-triggered tasks — misusing `schedule` on startup creates a duplicate task on every Kibana restart
- Task IDs should be deterministic and descriptive (e.g., `alerting:rule:${ruleId}`)

### Task Execution

- Always handle the case where `taskInstance.state` is empty or malformed
- Return `{ state, schedule }` from the run function — the framework handles retries

### Error Handling and Retries

- Distinguish between retryable errors (network timeouts) and permanent failures
- Use `throwUnrecoverableError` / `throwRetryableError` to classify errors — never throw raw `Error` for classifiable failures

### Concurrency and API Keys

- Tasks can run with user scope (API key) or without (system context)
- API keys are rotated on certain lifecycle events — don't cache them across runs
- `licensing` is an optional dependency — Task Manager works without it
