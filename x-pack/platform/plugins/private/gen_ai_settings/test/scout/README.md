# GenAI Settings Scout Tests

This directory contains Scout (Playwright-based) functional tests for the GenAI Settings plugin.

## Test Organization

- **`ui/tests/`** - Standard/sequential UI tests (for tests requiring clean state)
- **`ui/parallel_tests/`** - Fast, parallelizable UI tests that can run independently
- **`ui/fixtures/`** - Shared test fixtures, page objects, and helpers
- **`ui/playwright.config.ts`** - Playwright configuration for standard test execution
- **`ui/parallel.playwright.config.ts`** - Playwright configuration for parallel test execution

## Running Tests

```bash
# Run standard/sequential tests
node scripts/scout test \
  --serverUrl=http://localhost:5620 \
  --tag @ess \
  x-pack/platform/plugins/private/gen_ai_settings/test/scout/ui/playwright.config.ts

# Run parallel tests
node scripts/scout test \
  --serverUrl=http://localhost:5620 \
  --tag @ess \
  x-pack/platform/plugins/private/gen_ai_settings/test/scout/ui/parallel.playwright.config.ts

# Run specific test file
node scripts/scout test \
  --serverUrl=http://localhost:5620 \
  --tag @ess \
  x-pack/platform/plugins/private/gen_ai_settings/test/scout/ui/parallel.playwright.config.ts \
  --grep "chat experience"
```

## Test Coverage

### Chat Experience Flow
- Switching between Classic and Agent chat experiences
- Confirmation modal behavior when selecting Agent mode
- UI changes based on selected experience:
  - Navigation control visibility
  - Side navigation items
  - Documentation section visibility
  - AI Assistant Visibility setting visibility

### Documentation Management (Agent Mode)
- Documentation section visibility in Agent mode
- Installing/uninstalling documentation (with proper permissions)
- Update availability and actions

### Permissions
- Feature visibility based on user capabilities
- Read-only vs edit permissions

## Page Objects

- **GenAiSettingsPage** - Main GenAI Settings page interactions
- **ChatExperienceComponent** - Chat experience dropdown and modal interactions

## Adding New Tests

1. Create a new test file in `ui/parallel_tests/`
2. Import the test fixture from `../fixtures`
3. Use page objects for UI interactions
4. Add appropriate test tags (`@ess`, `@serverless`)
