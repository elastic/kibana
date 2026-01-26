# Lens Scout Tests - Learning Guide

This directory contains Scout tests for the Lens plugin to help you learn the Scout testing framework.

## What is Scout?

Scout is Kibana's new testing framework built on top of Playwright. It provides:
- **Page Objects**: Reusable classes that encapsulate page interactions
- **Fixtures**: Dependency injection for tests (page, browserAuth, pageObjects, etc.)
- **Test Subjects API**: Convenient helpers for interacting with `data-test-subj` elements
- **Type Safety**: Full TypeScript support with better autocomplete than FTR

## Running These Tests

```bash
# Make sure dependencies are installed
yarn kbn bootstrap

# Run the Scout tests
yarn test:ftr --config x-pack/platform/plugins/shared/lens/test/scout/ui/config.ts
```

## Test Structure

### 1. Page Objects (`fixtures/page_objects/`)

Page objects encapsulate interactions with the Lens UI:

```typescript
// Example: Using the LensPage object
const { lens } = pageObjects;
await lens.navigateTo();              // Navigate to Lens
await lens.waitForLensReady();        // Wait for editor to load
const hasErrors = await lens.hasWorkspaceErrors();  // Check for errors
```

**Key concepts:**
- Page objects are classes that take `ScoutPage` as a constructor parameter
- Methods return Playwright locators (chainable) or perform actions
- Page objects make tests more maintainable and readable

### 2. Test Files (`tests/`)

The `lens.spec.ts` file contains example tests demonstrating:

#### Basic Test Structure
```typescript
test('test name', async ({ pageObjects, page, browserAuth }) => {
  // Test code here
});
```

#### Available Fixtures
- `pageObjects`: Access to all page object instances (lens, dashboard, discover, etc.)
- `page`: Scout's enhanced Playwright page with extra helpers
- `browserAuth`: Login helper for authentication
- `browserContext`: Playwright browser context
- `kbnUrl`: Helper for constructing Kibana URLs

### 3. Scout's testSubj API

Scout provides a convenient API for `data-test-subj` selectors:

```typescript
// Instead of:
await page.getByTestId('myElement').click();

// You can use:
await page.testSubj.click('myElement');

// Check if element exists:
const exists = await page.testSubj.exists('myElement');

// Get locator:
const locator = page.testSubj.locator('myElement');
await expect(locator).toBeVisible();
```

## Example Tests Explained

### Test 1: Basic Visibility Check
```typescript
test('should display the Lens page', async ({ pageObjects }) => {
  const { lens } = pageObjects;
  await expect(lens.getLensApp()).toBeVisible();
});
```
**What it demonstrates:**
- Using page objects from fixtures
- Basic assertions with Playwright's `expect`
- Checking element visibility

### Test 2: Multiple Element Checks
```typescript
test('should show workspace panel when navigating to Lens', async ({ pageObjects, page }) => {
  const { lens } = pageObjects;
  await expect(lens.getLensApp()).toBeVisible();
  
  const workspacePanel = page.getByTestId('lnsWorkspacePanelWrapper__innerContent');
  await expect(workspacePanel).toBeVisible();
});
```
**What it demonstrates:**
- Using both page objects and direct Playwright page access
- Accessing multiple elements
- Understanding Lens UI structure (app → workspace panel)

### Test 3: Working with Page Object Helpers
```typescript
test('should display toasts when interacting with the page', async ({ pageObjects, page }) => {
  const { lens, toasts } = pageObjects;
  
  await expect(lens.getLensApp()).toBeVisible();
  
  const toastList = page.getByTestId('globalToastList');
  const hasErrorToast = await toastList
    .locator('[data-test-subj="errorToastMessage"]')
    .count()
    .then((count) => count > 0);
    
  expect(hasErrorToast).toBe(false);
});
```
**What it demonstrates:**
- Using multiple page objects (lens, toasts)
- Combining page object methods with direct page access
- Checking for absence of elements (error checking)
- Chaining Playwright locator methods

### Test 4: Scout's testSubj API
```typescript
test('should use Scout page helpers - testSubj API', async ({ page }) => {
  const lensAppExists = await page.testSubj.exists('lnsApp');
  expect(lensAppExists).toBe(true);
  
  const appElement = page.testSubj.locator('lnsApp');
  await expect(appElement).toBeVisible();
});
```
**What it demonstrates:**
- Scout's convenient `testSubj` API for data-test-subj elements
- Alternative way to check element existence
- Getting locators with testSubj

## Extending These Tests

### Adding New Page Object Methods

Edit `fixtures/page_objects/lens_page.ts`:

```typescript
export class LensPage {
  // ... existing methods ...
  
  /**
   * Click the visualization type switcher
   */
  async clickVisualizationSwitcher() {
    await this.page.testSubj.click('lnsChartSwitchPopover');
  }
  
  /**
   * Select a specific visualization type
   */
  async selectVisualizationType(type: string) {
    await this.clickVisualizationSwitcher();
    await this.page.testSubj.click(`lnsChartSwitchPopover_${type}`);
  }
}
```

### Writing New Tests

Add new test cases to `tests/lens.spec.ts` or create new test files:

```typescript
test('should switch visualization types', async ({ pageObjects }) => {
  const { lens } = pageObjects;
  
  await lens.waitForLensReady();
  await lens.selectVisualizationType('bar');
  
  // Add assertions to verify the visualization changed
});
```

## Best Practices

1. **Use Page Objects**: Encapsulate UI interactions in page objects instead of putting them directly in tests
2. **Wait for Elements**: Always wait for elements to be visible before interacting
3. **Use testSubj**: Prefer `page.testSubj` over raw selectors when working with data-test-subj
4. **Descriptive Test Names**: Write clear test descriptions that explain what is being tested
5. **Fixtures**: Leverage Scout's fixtures (pageObjects, page, browserAuth) instead of global variables
6. **Assertions**: Use Playwright's `expect` for better error messages and automatic retries

## Debugging Tips

```bash
# Run tests in headed mode (see browser)
yarn test:ftr --config x-pack/platform/plugins/shared/lens/test/scout/ui/config.ts --headed

# Run specific test by name
yarn test:ftr --config x-pack/platform/plugins/shared/lens/test/scout/ui/config.ts --grep "should display the Lens page"

# Debug mode (opens Playwright Inspector)
yarn test:ftr --config x-pack/platform/plugins/shared/lens/test/scout/ui/config.ts --debug
```

## Resources

- [Scout Documentation](../../../../../../../../src/platform/packages/private/kbn-scout-info/llms/what-is-scout.md)
- [Scout Page Objects Guide](../../../../../../../../src/platform/packages/private/kbn-scout-info/llms/scout-page-objects.md)
- [Playwright Documentation](https://playwright.dev/docs/intro)

## Next Steps

1. **Run the existing tests** to see them in action
2. **Modify tests** to try different assertions or interactions
3. **Add new page object methods** for Lens features you want to test
4. **Write new test cases** for different Lens workflows
5. **Explore other Scout tests** in the Kibana repository for more examples

Happy testing! 🧪
