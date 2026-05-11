# Triggers Actions UI Plugin

## Architecture

Main UI plugin for rules and connectors management:
- Rules list, rule details, rule creation/editing forms
- Connectors list, connector forms
- Alert tables (embedded and standalone)

For mock patterns, test IDs, EUI conventions, hooks, forms, and code organization, see the development skill at `.agents/skills/triggers-actions-ui-development/SKILL.md`.

## Rules to Follow

### Testing — RTL Mandatory

- **Never write new Enzyme tests.** All new UI tests must use React Testing Library.
- Use `render()` from `@testing-library/react` — not `shallow()` or `mount()`
- Wait for elements with `await screen.findByTestId(...)` — not `wrapper.update()`
- Use `userEvent` for interactions — not `simulate()`
- Add `data-test-subj` to all interactive elements — prefer adding directly to the component prop, not via a wrapper div

### Mocking

- Use `jest.mocked()` for typed mocks — not manual type casting
- Use `as unknown as Type` when type narrowing is needed — never `as any`
- Use `createStartServicesMock()` for Kibana start services mocks

### Shared Components

Before creating a new component or hook, check these locations:
- `src/platform/packages/shared/response-ops/` — Shared Response Ops UI packages
- `src/platform/packages/shared/kbn-alerts-ui-shared/` — Alert-related shared UI
- This plugin's `public/common/` — Shared within triggers_actions_ui
- `useCasesFeatures()` for cases feature flags, `useKibana()` for core services

## Before Declaring Done

After making changes, run these validation steps before reporting completion:
- `node scripts/jest <path-to-changed-test-files>` — run affected unit tests
- `node scripts/eslint --fix <changed-files>` — lint and auto-fix, then commit the result before pushing
- If CI fails on an FTR config your PR doesn't touch, retry — it's likely a flaky infrastructure test
