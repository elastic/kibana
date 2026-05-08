# Rule Registry Plugin

## Architecture

Provides shared infrastructure for rule types to produce alert data in a unified format, avoiding mapping conflicts across rule type producers.

Key modules:
- **server/alert_data_client/** — `AlertsClient` for CRUD operations on alerts-as-data
- **server/routes/** — API endpoints for alert field queries (e.g., `get_alert_fields_by_rule_type_ids`)
- **server/utils/** — Utilities including `mappingFromFieldMap` for generating ES mappings from field maps
- **common/** — Shared field definitions (technical fields like `kibana.alert.*`)

## Rules to Follow

### Alerts Client

- Use the `AlertsClient` from `server/alert_data_client/alerts_client.ts` for all alert interactions
- Always include audit events when modifying alert state
- Use `SavedObjectsUtils.getName()` for the `name` field in audit events

### Field Maps and Mappings

- Use `mappingFromFieldMap()` to generate ES mappings from field map objects — don't write raw mappings
- Technical field definitions live in `common/` — use these constants instead of hardcoding field names
- The technical component template is required when composing index templates

### Shared With Observability

- This plugin is co-owned with o11y teams — changes may affect Security and Observability alert indices
- Platform test code cannot import from solution plugins

## Before Declaring Done

After making changes, run these validation steps before reporting completion:
- `node scripts/jest <path-to-changed-test-files>` — run affected unit tests
- `node scripts/eslint --fix <changed-files>` — lint and auto-fix only changed files
- `node scripts/check_mappings_update --fix` — if you touched mappings or field definitions
