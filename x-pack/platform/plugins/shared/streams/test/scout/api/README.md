# Streams - Scout API Tests

This directory contains Scout API tests for the Streams plugin. These tests focus on server-side API functionality without browser interaction, providing fast and reliable test coverage.

## Why API Tests?

API tests complement UI tests by:
- **Running faster** - No browser overhead, tests execute in milliseconds
- **Being more reliable** - No timing issues from UI rendering
- **Testing edge cases** - Easier to test error scenarios and validation
- **Reducing flakiness** - Deterministic API responses vs. async UI updates

## Directory Structure

```
api/
├── playwright.config.ts          # Scout API test configuration
├── constants.ts                  # Common headers and constants
├── fixtures/
│   ├── index.ts                 # Test fixtures extending apiTest
│   └── constants.ts             # User roles and API headers
├── services/
│   └── streams_api_service.ts   # Streams API helper service
└── tests/
    ├── global.setup.ts          # Global setup (enables Streams)
    ├── processing_simulate.spec.ts
    ├── routing_fork_stream.spec.ts
    ├── schema_field_mapping.spec.ts
    └── lifecycle_retention.spec.ts
```

## Running Tests

### Prerequisites

1. Start Elasticsearch and Kibana servers:
   ```bash
   node scripts/scout run-servers --arch stateful --domain classic
   ```

2. Run the API tests:
   ```bash
   npx playwright test --config x-pack/platform/plugins/shared/streams/test/scout/api/playwright.config.ts
   ```

### Running Specific Tests

```bash
# Run only routing tests
npx playwright test --config x-pack/platform/plugins/shared/streams/test/scout/api/playwright.config.ts -g "routing"

# Run only processing tests
npx playwright test --config x-pack/platform/plugins/shared/streams/test/scout/api/playwright.config.ts -g "processing"
```

## Test Coverage

### Processing Tests (`processing/simulate_processing.spec.ts`)
- Grok pattern simulation
- Dissect pattern simulation
- Multiple processing steps
- Invalid pattern handling
- Error scenarios

### Routing Tests (`routing/fork_stream.spec.ts`)
- Create child streams via fork API
- Disabled routing rules
- Nested child streams
- Delete streams
- Complex conditions (AND/OR)
- Duplicate stream names
- Invalid conditions

### Schema Tests (`schema/field_mapping.spec.ts`)
- Get unmapped fields
- Simulate field mappings with various types:
  - keyword, long, boolean, double, ip, date, geo_point
- Invalid field types
- Nested field names
- Multiple field definitions

### Lifecycle Tests (`lifecycle/retention.spec.ts`)
- Get lifecycle stats
- Get lifecycle explain
- Update retention settings
- Inheritance from parent
- Different time units (hours, days)
- Clear custom retention

## Writing New Tests

1. **Import the test fixture:**
   ```typescript
   import { streamsApiTest as apiTest } from '../../fixtures';
   import { COMMON_API_HEADERS } from '../../fixtures/constants';
   ```

2. **Set up authentication in beforeAll:**
   ```typescript
   apiTest.beforeAll(async ({ samlAuth }) => {
     const credentials = await samlAuth.asStreamsAdmin();
     adminCookieHeader = credentials.cookieHeader;
   });
   ```

3. **Use apiClient for HTTP requests:**
   ```typescript
   apiTest('should do something', async ({ apiClient }) => {
     const { statusCode, body } = await apiClient.post('api/streams/...', {
       headers: { ...COMMON_API_HEADERS, ...adminCookieHeader },
       body: { ... },
       responseType: 'json',
     });
     expect(statusCode).toBe(200);
   });
   ```

4. **Clean up test data in afterEach:**
   ```typescript
   apiTest.afterEach(async ({ apiServices }) => {
     await apiServices.streamsTest.cleanupTestStreams('logs.my-prefix');
   });
   ```

## Migration from UI Tests

When moving functionality from UI tests to API tests:

1. **Keep UI tests for:**
   - Critical user journeys
   - Visual/UX verification
   - Component interactions

2. **Move to API tests:**
   - CRUD operations
   - Data validation
   - Error handling
   - Edge cases
   - Business logic verification

## Debugging

Enable verbose logging:
```bash
DEBUG=scout:* npx playwright test --config ...
```

View test artifacts:
```bash
ls -la x-pack/platform/plugins/shared/streams/test/scout/api/.scout/
```
