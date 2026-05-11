# Reporting Plugin

## Architecture

Kibana's report generation system — CSV, PNG, and PDF exports.

Key modules:
- **server/export_types/** — Export type implementations (csv_searchsource, csv_v2, png_v2, printable_pdf_v2)
- **server/routes/** — HTTP API endpoints for report generation and management
- **public/management/** — Report listing and management UI
- **@kbn/generate-csv** — CSV generation logic (extracted into its own package)

## Rules to Follow

### Export Types

- `csv_v2` is the automation-friendly endpoint; `csv_searchsource` is the Discover UI endpoint
- PNG and PDF exports are not available in serverless — guard accordingly
- Export type configuration lives in `server/config/schema.ts`

### Task Manager

- Report generation is scheduled via Task Manager — follow Task Manager conventions for task registration (see the `task-manager-registration` skill)

### Code Patterns Specific to This Plugin

- Prefer returning values over passing `res` as a parameter — keep API boundaries clean
- Group read errors by status code using lodash `partition` or `groupBy`

## Before Declaring Done

After making changes, run these validation steps before reporting completion:
- `node scripts/jest <path-to-changed-test-files>` — run affected unit tests
- `node scripts/eslint --fix <changed-files>` — lint and auto-fix, then commit the result before pushing
- If CI fails on an FTR config your PR doesn't touch, retry — it's likely a flaky infrastructure test
