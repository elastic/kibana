---
name: triggers-actions-ui-development
description: Building UI components, hooks, forms, and tests in the triggers_actions_ui plugin. Use when adding rule or connector UI, writing RTL tests, working with EUI form patterns, or organizing components within the plugin.
---

# Triggers Actions UI Development

## Mock Patterns

```typescript
// Preferred: use jest.mocked() for typed mocks
const mockUseKibana = jest.mocked(useKibana);

// Preferred: shared mock factories
const mockStartServices = createStartServicesMock();
```

- Use `as unknown as Type` when type narrowing is needed — never `as any`
- Create reusable mock setup functions when the same mock appears in 3+ test files
- One assertion per test when possible — makes failures more descriptive

## Test IDs

- Add `data-test-subj` to all interactive elements and key display elements
- Prefer adding `data-test-subj` directly to the component prop — not via a wrapper div
- Naming: `{componentName}-{element}` (e.g., `rulesList-table`, `connectorForm-submitBtn`)

## EUI Components

- Use `@elastic/eui` for all UI elements
- Use Emotion (`@emotion/react`) for custom styling — not inline styles or CSS modules
- Follow EUI's responsive patterns (flex, grid)
- Use EUI's color tokens — don't hardcode colors

## Hooks

- Keep hooks at the top level — no conditional hooks
- Custom hooks go in `hooks/` directory within the component's section
- Name hooks `use{Verb}{Noun}` (e.g., `useLoadRuleTypes`, `useFetchAlertFields`)
- Check for existing hooks before creating new ones:
  - `useCasesFeatures()` for cases feature flags
  - `useKibana()` for core services
  - `useBreadcrumbs()` for navigation
  - `useLoadRuleTypeAlertFields()` for alert field data

## Forms

- Use `@kbn/es-ui-shared-plugin/forms` for form state management
- Serializers/deserializers live at the connector definition level, not in form components
- Validate on blur and submit — not on every keystroke
- Show loading states while fetching encrypted/secret fields

## Code Organization

- Sections under `public/application/sections/` (rules_list, rule_details, actions_connectors_list)
- Each section has `components/`, `hooks/`, and optionally `translations/`
- Don't duplicate helper functions across files — extract to section-level utils or `public/common/`
