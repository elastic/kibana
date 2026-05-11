# Task Manager Plugin

## Architecture

Background job execution engine for Kibana — scheduling, running, and monitoring asynchronous tasks.

Key server modules:
- **task_store.ts** — ES-backed persistence (CRUD for task documents)
- **task_scheduling.ts** — Scheduling logic, `ensureScheduled`, recurring vs one-time
- **task_running/task_runner.ts** — Execution lifecycle (claim → run → report)
- **lib/** — Supporting utilities (capacity estimation, intervals, retries)

For task registration, scheduling, timeout, cost, abortController, and error classification guidance, see the `task-manager-registration` skill at `.agents/skills/task-manager-registration/SKILL.md`.

For plugin internals (store, runner, health, capacity), see the development skill at `.agents/skills/task-manager-development/SKILL.md`.

## Rules to Follow

### Concurrency and API Keys

- Tasks can run with user scope (API key) or without (system context)
- When scheduling a task with user scope but security is disabled, log an info message
- API keys are rotated on certain lifecycle events — don't cache them across runs
- `licensing` is an optional dependency — Task Manager works without it

### Code Patterns Specific to This Plugin

- Use `partialTask` spreads instead of manually picking fields — `...partialTask` not redundant field-by-field assignment
- Prefer `optionalPlugin` over `requiredPlugin` when a dependency is not essential

## Before Declaring Done

After making changes, run these validation steps before reporting completion:
- `node scripts/jest <path-to-changed-test-files>` — run affected unit tests
- `node scripts/eslint --fix <changed-files>` — lint and auto-fix, then commit the result before pushing
- `node scripts/check_mappings_update --fix` — required if you touched saved object schemas or mappings
- If CI fails on an FTR config your PR doesn't touch, retry — it's likely a flaky infrastructure test
