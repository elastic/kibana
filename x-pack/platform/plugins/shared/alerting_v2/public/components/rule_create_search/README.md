# Create rule search

The "What do you want to measure?" input of the create rule flyout. Typing opens a dropdown with everything the user can create a rule from, grouped by section. The "Send to Agent" footer sends the text to Agent Builder.

## Sections

Sections render in the order of `RULE_CREATE_SEARCH_SECTION_IDS`:

| Id | Title | Source |
|---|---|---|
| `universal` | Universal | v2 builders (client-side catalog) |
| `universal.templates` | From templates | v2 rule templates (`_find`) |
| `classic` | Classic rule types | v1 rule types (rule type registry) |

## Implementing a section

Each section is a hook that takes the debounced, trimmed query and returns a `RuleCreateSearchSectionResult`:

```ts
const useUniversalSearchSection = (query: string): RuleCreateSearchSectionResult => {
  // ...
  return { items, isLoading: false };
};
```

The host passes the results to the dropdown as `RuleCreateSearchSections`, keyed by section id.

Rules:

- **Items.** Return at most `MAX_RESULTS_PER_SECTION` items, already sorted. `onSelect` runs the whole flow (open a flyout, navigate, close the options flyout).
- **Hiding.** A section is hidden when it has no items, when `error` is set, or when it is missing from `RuleCreateSearchSections`. Return no items (or leave the section out) when the user is not authorized; do not show a toast.
- **Isolation.** Each section loads and fails on its own. A failing section must not throw or affect the other sections.
- **Header link.** `headerAction` renders a link next to the title (e.g. "Browse all" in `classic`).
