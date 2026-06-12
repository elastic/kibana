# Event Log Plugin

## Architecture

Persistent history of alerting and action activities, stored as ECS-compatible documents in a data stream (`.kibana-event-log-ds`).

Key modules:
- **server/es/** — Index template and ILM policy definitions (`documents.ts`)
- **server/event_logger.ts** — Logger implementation for writing events
- **server/event_log_client.ts** — Client for querying events
- **generated/** — Auto-generated mappings and config-schema definitions

## Rules to Follow

### Document Structure Changes

- Field mappings and schemas in `generated/` are auto-generated — see `generated/README.md` for how to modify
- Be conservative when adding new fields to prevent index explosion
- Custom fields go under the `kibana` top-level field set
- Standard ECS fields (`@timestamp`, `event.*`, `error.*`) are used wherever possible

### Provider and Action Registration

- Plugins must call `registerProviderActions()` during setup before writing events
- Pre-registration prevents misspelled values and index explosion
- Each plugin should use its own `event.provider` value

### Writing Events

- `logEvent()` is fire-and-forget (async, no return value) — events are bulk-written asynchronously
- Use `startTiming()` / `stopTiming()` helpers for duration calculation
- Always include saved object references for security (queries validate SO access)

### ILM Policy

- The ILM policy (`kibana-event-log-policy`) is created once and never overwritten by the plugin
- Customers can customize it — don't add code that resets it

## Before Declaring Done

After making changes, run these validation steps before reporting completion:
- `node scripts/jest <path-to-changed-test-files>` — run affected unit tests
- `node scripts/eslint --fix <changed-files>` — lint and auto-fix, then commit the result before pushing
- If CI fails on an FTR config your PR doesn't touch, retry — it's likely a flaky infrastructure test
