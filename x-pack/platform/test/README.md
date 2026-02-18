# Kibana Functional Test Runner (FTR) Tests

The Functional Test Runner (FTR) is Kibana's comprehensive testing framework that powers both API and UI tests using WebDriver and a custom Mocha runner. This directory contains FTR services, page objects, configuration files for different types of tests and actual tests itself. This directory is only for tests targeting "platform" shared plugins and should be solution-agnostic (no imports from solution-specific code source).

## Test Organization and Structure

FTR tests are organized by type and deployment target to ensure proper test isolation and execution context. Understanding where to place your tests is crucial for maintainability and CI pipeline efficiency.

### 1. Accessibility Tests - `/accessibility`

**Purpose**: Automated accessibility (a11y) testing to ensure Kibana meets WCAG guidelines and accessibility standards.

**Location**: `x-pack/platform/test/accessibility/`

**When to use**:

- Testing keyboard navigation and screen reader compatibility
- Validating color contrast and visual accessibility
- Ensuring proper ARIA attributes and semantic HTML
- Testing focus management and tab order

### 2. Stateful-Only API Tests

**Purpose**: API integration tests that only run against traditional stateful environments.

#### `/api_integration` - Core API Tests

**Location**: `x-pack/platform/test/api_integration/`
**Use for**: General API functionality, CRUD operations, data management APIs

#### `/alerting_api_integration` - Alerting & Actions APIs

**Location**: `x-pack/platform/test/alerting_api_integration/`
**Use for**: Alerting rules, connectors, and notification testing

#### `/api_integration_basic` - Basic License API Tests

**Location**: `x-pack/platform/test/api_integration_basic/`
**Use for**: API validation for Elastic Basic license

#### `/automatic_import_api_integration` - Import APIs

**Location**: `x-pack/platform/test/automatic_import_api_integration/`
**Use for**: Data import, migration, and transformation APIs

#### `/cases_api_integration` - Cases Management APIs

**Location**: `x-pack/platform/test/cases_api_integration/`
**Use for**: Cases creation, management, and workflow APIs

### 3. Deployment Agnostic API Tests - `/api_integration_deployment_agnostic`

**Purpose**: API tests designed to run in both stateful and serverless environments.

**Location**: `x-pack/platform/test/api_integration_deployment_agnostic/`

**When to use**:

- APIs that work identically in both deployment types
- Core platform functionality that spans deployment models
- Tests that need to validate consistency across environments

**Key considerations**:

- Must not rely on stateful-specific features (like Watcher, ML jobs with persistence)
- Should use deployment-agnostic services and utilities
- Must use SAML authentication (cookie header for internal APIs or API key for public APIs)

### 4. Functional UI Tests - `/functional` and `/functional_*`

**Purpose**: End-to-end UI tests using WebDriver for browser automation.

**Locations**:

- `x-pack/platform/test/functional/` - Main functional tests
- `x-pack/platform/test/functional_*` - Specialized functional test suites

**Types of functional test directories**:

#### Core Functional Tests

- **`/functional`** - Primary UI test suite
- **`/functional_basic`** - UI tests for Elastic Basic license
- **`/functional_embedded`** - Embedded Kibana scenarios
- **`/functional_cors`** - Cross-origin resource sharing tests

#### Specialized UI Test Suites

- **`/functional_with_es_ssl`** - SSL-enabled Elasticsearch tests

**Key functional testing concepts**:

- **Page Objects**: Encapsulate UI interactions and selectors
- **Services**: Provide reusable utilities (browser, retry, find)

### 5. Serverless-Only Tests - `/serverless`

> For detailed serverless testing documentation, see [x-pack/platform/test/serverless/README.md](./serverless/README.md)

**Purpose**: Tests specifically designed for serverless Kibana deployments.

**Location**: `x-pack/platform/test/serverless/`

**When to use**:

- Serverless-specific features and limitations
- Platform functionality shared between different project types (Security, Observability, Search)
- Serverless authentication and authorization patterns

**Note**: Project-type specific scenarios should be located in respective solution test directories, not here.

## Test Configuration and Services

### Configuration Files

Each test suite has its own `config.ts` file that defines:

- Test server settings (Elasticsearch, Kibana)
- Service providers and page objects
- Test file inclusion patterns
- Browser settings and capabilities
- Authentication configuration

### Common Services

- **`supertest`** - HTTP API testing
- **`es`** - Elasticsearch client
- **`esArchiver`** - Elasticsearch test data management
- **`kibanaServer`** - Kibana instance management
- **`browser`** - WebDriver browser control
- **`find`** - WebDriver element selectors
- **`testSubjects`** - Element selectors for UI elements with `data-test-subj` attribute

### Page Objects

Reusable UI interaction patterns organized by application:

- `PageObjects.common` - Shared navigation and utilities
- `PageObjects.dashboard` - Dashboard-specific interactions
- `PageObjects.discover` - Discover app interactions
- `PageObjects.visualize` - Visualization creation and editing

## Running Tests

### Local Development

```bash
# Start test server (replace with your actual config file path)
node scripts/functional_tests_server.js --config x-pack/platform/test/functional/apps/canvas/config.ts

# Run tests (replace with your actual config file path)
node scripts/functional_test_runner.js --config x-pack/platform/test/functional/apps/canvas/config.ts
```

**Note**: The config paths shown above are examples. Replace it with the actual path to the config file for the test suite you want to run.

## Best Practices

### Test Organization

- Group related tests in logical directories
- Use descriptive test and suite names
- Implement proper setup and teardown hooks
- Follow the AAA pattern (Arrange, Act, Assert)

### Performance Considerations

- Use `esArchiver` for consistent test data (avoid overriding system indexes as it restores old index versions and makes testing less relevant)
- Use `kbnArchiver` to load/unload saved objects
- Implement proper waits and retries
- Clean up test data after execution
- Use selective test runs during development

### Cross-Environment Testing

- Design tests to work across deployment types when possible
- Use deployment-agnostic services and utilities
- Account for different authentication mechanisms
- Test against both local and cloud environments

This structure ensures comprehensive test coverage while maintaining clear separation of concerns between different deployment models and testing approaches.
