---
name: triggers-actions-ui-development
description: Building UI components, hooks, forms, and tests in the triggers_actions_ui plugin. Use when adding rule or connector UI, writing RTL tests, working with EUI form patterns, or organizing components within the plugin.
---

# Triggers Actions UI Development

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
- If the same mock setup or test helper appears in 3+ files, extract it into a shared test util
