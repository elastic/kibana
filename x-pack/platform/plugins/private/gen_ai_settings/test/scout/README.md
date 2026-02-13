# GenAI Settings Scout Tests

This directory contains Scout (Playwright-based) functional tests for the GenAI Settings plugin.

## Directory Structure

```
ui/
├── fixtures/
│   ├── index.ts                 # Test fixtures with custom auth methods
│   ├── constants.ts             # Shared test constants
│   ├── page_objects/
│   │   ├── index.ts             # Page objects export
│   │   └── gen_ai_settings_page.ts  # GenAI Settings page object
│   └── services/
│       ├── index.ts             # Services export
│       └── roles.ts             # Custom KibanaRole definitions
├── parallel_tests/
│   ├── page_display.spec.ts
│   ├── page_display.no_ab_privilege.spec.ts
│   ├── page_display.no_assistant_privilege.spec.ts
│   ├── ai_assistant_visibility.spec.ts
│   ├── ai_assistant_visibility.no_assistant_privilege.spec.ts
│   ├── selection_modal.spec.ts
│   ├── selection_modal.no_ab_privilege.spec.ts
│   ├── selection_modal.no_assistant_privilege.spec.ts
│   ├── confirmation_modal.spec.ts
│   ├── documentation_section.spec.ts
│   ├── agent_nav_button.no_ab_privilege.spec.ts
│   ├── agent_mode_complete_flow.spec.ts
│   ├── solution_space.security.spec.ts
│   ├── solution_space.observability.spec.ts
│   └── solution_space.search.spec.ts
└── parallel.playwright.config.ts  # Playwright configuration
```

## Naming Conventions

- **Feature prefix**: `page_display`, `selection_modal`, `ai_assistant_visibility`, `solution_space`
- **Dot notation for variants**: `.no_ab_privilege`, `.no_assistant_privilege`, `.security`, `.observability`
- **Pattern**: `feature_name.variant.spec.ts`

This follows the convention used in other Scout tests (e.g., `rules_page_header.admin.spec.ts`, `rule_details_page.viewer.spec.ts`).

## Running Tests

```bash
# Start Server

node scripts/scout.js start-server [--stateful|--serverless=[es|oblt|security]]

# Run all tests
npx playwright test --config x-pack/platform/plugins/private/gen_ai_settings/test/scout/ui/parallel.playwright.config.ts \
  --project local --ui

# Run tests with specific tag
  --grep "@ess"

# To run tests in UI mode
  --ui
```

## Test Fixtures

### `spaceTest` (Parallel Tests)

Use `spaceTest` for parallel tests that run in isolated Kibana spaces:

```typescript
import { spaceTest } from '../fixtures';

spaceTest.describe('My Test Suite', { tag: ['@ess'] }, () => {
  spaceTest.beforeEach(async ({ browserAuth, pageObjects }) => {
    await browserAuth.loginAsPrivilegedUser();
    await pageObjects.genAiSettings.navigateTo();
  });

  spaceTest('should do something', async ({ pageObjects }) => {
    // test implementation
  });
});
```

### Custom Login Methods

The fixtures provide custom authentication methods for testing different privilege scenarios:

- `browserAuth.loginAsPrivilegedUser()` - Full privileges (from Scout)
- `browserAuth.loginAsNonAgentBuilderUser()` - Has AI Assistants, no Agent Builder
- `browserAuth.loginAsNonAssistantUser()` - Has Agent Builder, no AI Assistants
- `browserAuth.loginAsFullAIPrivilegesUser()` - Has both AI Assistants and Agent Builder

## Solution Spaces

### `scoutSpace.setSolutionView()`

Sets the solution view for a space (Security, Observability, Search, Classic). This method is built into Scout's `scoutSpace` fixture:

```typescript
import { spaceTest } from '../fixtures';

spaceTest.beforeAll(async ({ scoutSpace }) => {
  await scoutSpace.setSolutionView('security');
});

spaceTest.afterAll(async ({ scoutSpace }) => {
  await scoutSpace.setSolutionView('classic');
});
```

Available solution values: `'security'`, `'oblt'`, `'es'`, `'classic'`

## Test Coverage


| Test File                                                | Tags                                       | Description                                            |
| -------------------------------------------------------- | ------------------------------------------ | ------------------------------------------------------ |
| `page_display.spec.ts`                                   | `@ess`, `@svl*` | Page title and nav button visibility                   |
| `page_display.no_ab_privilege.spec.ts`                   | `@ess`, `@svl*` | Page display without Agent Builder privilege           |
| `page_display.no_assistant_privilege.spec.ts`            | `@ess`, `@svl*` | Page display without AI Assistant privilege            |
| `ai_assistant_visibility.spec.ts`                        | `@ess`                                     | AI Assistant Visibility setting behavior               |
| `ai_assistant_visibility.no_assistant_privilege.spec.ts` | `@ess`, `@svlOblt`, `@svlSecurity`         | AI Assistant Visibility without AI Assistant privilege |
| `selection_modal.spec.ts`                                | `@ess`                                     | Selection modal interactions                           |
| `selection_modal.no_ab_privilege.spec.ts`                | `@ess`                                     | Selection modal without Agent Builder privilege        |
| `selection_modal.no_assistant_privilege.spec.ts`         | `@ess`                                     | Selection modal without AI Assistant privilege         |
| `confirmation_modal.spec.ts`                             | `@ess`, `@svlOblt`, `@svlSecurity`         | Confirmation modal when switching to Agent mode        |
| `documentation_section.spec.ts`                          | `@ess`, `@svlOblt`, `@svlSecurity`         | Documentation section visibility in Agent mode         |
| `agent_nav_button.no_ab_privilege.spec.ts`               | `@ess`, `@svl*` | Agent nav button without Agent Builder privilege       |
| `agent_mode_complete_flow.spec.ts`                       | `@ess`, `@svlOblt`, `@svlSecurity`         | Complete Agent mode switching flow                     |
| `solution_space.security.spec.ts`                        | `@ess`                                     | Agent mode in Security solution space                  |
| `solution_space.observability.spec.ts`                   | `@ess`                                     | Agent mode in Observability solution space             |
| `solution_space.search.spec.ts`                          | `@ess`                                     | Classic mode in Search solution space                  |


## Page Object Methods

Key methods in `GenAiSettingsPage`:


| Method                                   | Description                                          |
| ---------------------------------------- | ---------------------------------------------------- |
| `navigateTo()`                           | Navigate to GenAI Settings page (works in any space) |
| `getChatExperienceField()`               | Get the Chat Experience dropdown                     |
| `getAIAgentNavButton()`                  | Get the AI Agent nav button                          |
| `getAiAssistantNavButton()`              | Get the AI Assistant nav button (Classic)            |
| `getAiAssistantNavButtonSecurity()`      | Get the AI Assistant nav button (Security)           |
| `getAIAssistantNavButtonObltSearch()` | Get the AI Assistant nav button (Observability/Search)      |
| `getConfirmModalConfirmButton()`         | Get confirm button in Agent confirmation modal               |
| `getSaveButton()`                        | Get the save button                                  |
| `getDocumentationSection()`              | Get the documentation section (Agent mode only)      |


## Adding New Tests

1. Create a new test file in `ui/parallel_tests/` with descriptive naming:
  - Feature tests: `feature_name.spec.ts`
  - Privilege variants: `feature_name.no_ab_privilege.spec.ts`
  - Solution space tests: `solution_space.solution_name.spec.ts`
2. Import fixtures:
  ```typescript
   import { expect } from '@kbn/scout';
   import { spaceTest } from '../fixtures';
  ```
3. Use appropriate tags:
  - `@ess` - ESS/Stateful deployments
  - `@svlSecurity` - Serverless Security
  - `@svlOblt` - Serverless Observability
  - `@svlSearch` - Serverless Search
4. Follow the existing patterns for setup/teardown and test organization

