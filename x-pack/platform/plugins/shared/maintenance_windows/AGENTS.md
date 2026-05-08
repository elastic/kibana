# Maintenance Windows Plugin

## Architecture

Manages maintenance windows that suppress alerting notifications during scheduled periods.

Key modules:
- **server/** — CRUD operations for maintenance window saved objects, scheduling logic
- **public/** — UI for creating, editing, and listing maintenance windows
- **common/** — Shared types and constants

## Rules to Follow

### Saved Object Schema

- Maintenance windows are stored as saved objects — follow Kibana saved object conventions
- Never add required fields to existing schemas without a migration path
- When modifying the schema, update the saved object migration if needed

## Before Declaring Done

After making changes, run these validation steps before reporting completion:
- `node scripts/jest <path-to-changed-test-files>` — run affected unit tests
- `node scripts/eslint --fix <changed-files>` — lint and auto-fix only changed files
- `node scripts/check_mappings_update --fix` — if you touched saved object schemas
