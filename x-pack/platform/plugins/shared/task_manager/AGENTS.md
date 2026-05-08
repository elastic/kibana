# Task Manager Plugin

## Architecture

Background job execution engine for Kibana — scheduling, running, and monitoring asynchronous tasks.

Key server modules:
- **task_store.ts** — ES-backed persistence (CRUD for task documents)
- **task_scheduling.ts** — Scheduling logic, `ensureScheduled`, recurring vs one-time
- **task_running/task_runner.ts** — Execution lifecycle (claim → run → report)
- **lib/** — Supporting utilities (capacity estimation, intervals, retries)

## Rules to Follow

### Concurrency and API Keys

- Tasks can run with user scope (API key) or without (system context)
- When scheduling a task with user scope but security is disabled, log an info message
- API keys are rotated on certain lifecycle events — don't cache them across runs
- `licensing` is an optional dependency — Task Manager works without it

For task registration, scheduling, timeout, cost, abortController, and error classification guidance, see the `task-manager-registration` skill at `.agents/skills/task-manager-registration/SKILL.md`.

## Before Declaring Done

After making changes, run these validation steps before reporting completion:
- `node scripts/jest <path-to-changed-test-files>` — run affected unit tests
- `node scripts/eslint --fix <changed-files>` — lint and auto-fix only changed files
- `node scripts/check_mappings_update --fix` — if you touched saved object schemas or mappings
