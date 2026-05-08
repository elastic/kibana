# Triggers Actions UI Plugin

## Architecture

Main UI plugin for rules and connectors management:
- Rules list, rule details, rule creation/editing forms
- Connectors list, connector forms
- Alert tables (embedded and standalone)

## Rules to Follow

### Testing — RTL Mandatory

- **Never write new Enzyme tests.** All new UI tests must use React Testing Library.
- Use `render()` from `@testing-library/react` — not `shallow()` or `mount()`
- Wait for elements with `await screen.findByTestId(...)` — not `wrapper.update()`
- Use `userEvent` for interactions — not `simulate()`

### Shared Components

Before creating a new component, check these locations:
- `src/platform/packages/shared/response-ops/` — Shared Response Ops UI packages
- `src/platform/packages/shared/kbn-alerts-ui-shared/` — Alert-related shared UI
- This plugin's `public/common/` — Shared within triggers_actions_ui

## Before Declaring Done

After making changes, run these validation steps before reporting completion:
- `node scripts/jest <path-to-changed-test-files>` — run affected unit tests
- `node scripts/eslint --fix <changed-files>` — lint and auto-fix only changed files
