# Triggers Actions UI Plugin

## Architecture

This is the main UI plugin for rules and connectors management. It provides:
- Rules list, rule details, rule creation/editing forms
- Connectors list, connector forms
- Alert tables (embedded and standalone)
- Shared UI hooks and components

## Testing Requirements

### React Testing Library (RTL) — Mandatory for All New Tests

- **Never write new Enzyme tests.** All new UI tests must use RTL.
- Use `render()` from `@testing-library/react` — not `shallow()` or `mount()`
- Wait for elements with `await screen.findByTestId(...)` — not `wrapper.update()`
- Use `userEvent` for interactions — not `simulate()`

### Mock Patterns

```typescript
// Preferred: use jest.mocked() for typed mocks
const mockUseKibana = jest.mocked(useKibana);

// Preferred: shared mock factories
const mockStartServices = createStartServicesMock();

// Avoid: as any or untyped casts
// Bad: const mock = useKibana as any;
// Better: const mock = jest.mocked(useKibana);
```

- Use `as unknown as Type` when type narrowing is needed — never `as any`
- Create reusable mock setup functions when the same mock appears in 3+ test files
- One assertion per test when possible — makes failures more descriptive

### Test IDs

- Add `data-test-subj` to all interactive elements and key display elements
- Prefer adding `data-test-subj` directly to the component prop — not via a wrapper div
- Naming: `{componentName}-{element}` (e.g., `rulesList-table`, `connectorForm-submitBtn`)

## UI Patterns

### EUI Components

- Use `@elastic/eui` for all UI elements
- Use Emotion (`@emotion/react`) for custom styling — not inline styles or CSS modules
- Follow EUI's responsive patterns (flex, grid)
- Use EUI's color tokens — don't hardcode colors

### Hooks

- Keep hooks at the top level — no conditional hooks
- Custom hooks go in `hooks/` directory within the component's section
- Name hooks `use{Verb}{Noun}` (e.g., `useLoadRuleTypes`, `useFetchAlertFields`)
- Check for existing hooks before creating new ones:
  - `useCasesFeatures()` for cases feature flags
  - `useKibana()` for core services
  - `useBreadcrumbs()` for navigation
  - `useLoadRuleTypeAlertFields()` for alert field data

### Forms

- Use `@kbn/es-ui-shared-plugin/forms` for form state management
- Serializers/deserializers live at the connector definition level, not in form components
- Validate on blur and submit — not on every keystroke
- Show loading states while fetching encrypted/secret fields

## Rules to Follow

### No Unnecessary Re-renders

- Memoize expensive computations with `useMemo`
- Wrap callbacks with `useCallback` when passed as props
- Don't create functions inside render — extract to named functions or hooks

### Shared Components

Before creating a new component, check these locations:
- `src/platform/packages/shared/response-ops/` — Shared Response Ops UI packages
- `src/platform/packages/shared/kbn-alerts-ui-shared/` — Alert-related shared UI
- This plugin's `public/common/` — Shared within triggers_actions_ui

### Code Organization

- Sections under `public/application/sections/` (rules_list, rule_details, actions_connectors_list)
- Each section has `components/`, `hooks/`, and optionally `translations/`
- Don't duplicate helper functions across files — extract to section-level utils or `public/common/`
