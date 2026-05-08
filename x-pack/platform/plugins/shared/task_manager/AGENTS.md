# Task Manager Plugin

## Architecture

Background job execution engine for Kibana — scheduling, running, and monitoring asynchronous tasks.

Key server modules:
- **task_store.ts** — ES-backed persistence (CRUD for task documents)
- **task_scheduling.ts** — Scheduling logic, `ensureScheduled`, recurring vs one-time
- **task_running/task_runner.ts** — Execution lifecycle (claim → run → report)

## Rules to Follow

### Concurrency and API Keys

- Tasks can run with user scope (API key) or without (system context)
- API keys are rotated on certain lifecycle events — don't cache them across runs
- `licensing` is an optional dependency — Task Manager works without it
