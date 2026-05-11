---
name: reporting-development
description: Working with the Kibana reporting plugin — export types, CSV/PNG/PDF generation, report routes, or config changes. Use when adding or modifying export types, writing reporting tests, or working with the report generation pipeline.
---

# Reporting Plugin Development

## Testing Requirements

- **Unit tests**: Required for all new server files (co-located `.test.ts`)
- **Integration tests**: Use `jest.integration.config.js` for tests that need ES
- **Config changes**: When modifying `server/config/schema.ts`, add tests in the adjacent test file
- **UI tests**: Use React Testing Library (RTL). Never write new Enzyme tests.
- **Edge cases**: Test empty results, truncation boundaries, and permission errors

## Key Utilities

Before creating new helpers, check whether one already exists:

- `getJobContentEncoding()` — content encoding utility; reuse instead of reimplementing
- Task Manager scheduling patterns — see the `task-manager-registration` skill for registration conventions
