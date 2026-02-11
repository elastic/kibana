# Kibana Development Guide

## About This Document

**Audience**: LLM coding agents assisting with Kibana development, refactoring, and testing.

**Include**: Kibana-specific conventions, testing patterns, and codebase knowledge not easily discoverable from existing code.

**Exclude**: Generic TypeScript/React advice, info in LLM training data, anything discoverable by reading existing code.

---

## 1. Project Structure

### Directory Organization

| Path | Purpose |
| ---- | ------- |
| `src/` | Core platform code (shared across all of Kibana) |
| `src/platform/packages/` | Shared packages used across plugins |
| `x-pack/` | Licensed features (requires subscription) |
| `x-pack/platform/plugins/` | Platform-level x-pack plugins |
| `x-pack/solutions/` | Solution-specific plugins (observability, security, search) |
| `packages/` | Root-level shared packages |

### Plugin Structure

Plugins follow a consistent structure:

```
plugin_name/
├── public/           # Browser-side code
│   ├── components/   # React components
│   ├── hooks/        # React hooks
│   ├── services/     # Client services
│   └── index.ts      # Public plugin entry
├── server/           # Server-side code
│   ├── routes/       # HTTP API routes
│   ├── services/     # Server services
│   └── index.ts      # Server plugin entry
├── common/           # Shared types/utilities (browser + server)
└── __mocks__/        # Manual mocks for testing
```

---

## 2. Unit Testing

### Test File Locations

Tests live alongside source files with `.test.ts` or `.test.tsx` suffix:

```
component.tsx
component.test.tsx
service.ts
service.test.ts
```

### Running Tests

```bash
# Run tests for specific file or pattern
node scripts/jest <path-or-pattern>

# Run tests for a specific plugin
node scripts/jest x-pack/solutions/observability/plugins/apm

# Run with coverage
node scripts/jest --coverage <path>

# Watch mode for development
node scripts/jest --watch <path>

# Update snapshots
node scripts/jest -u <path>
```

### Jest Configuration

Kibana uses multiple Jest configurations. Key configs:

| Config | Purpose |
| ------ | ------- |
| `jest.config.js` | Root config |
| `x-pack/jest.config.js` | X-Pack specific config |
| `<plugin>/jest.config.js` | Plugin-specific overrides |

### Test Patterns

#### Basic Unit Test Structure

```typescript
import { functionToTest } from './module';

describe('functionToTest', () => {
  beforeEach(() => {
    // Setup before each test
  });

  afterEach(() => {
    // Cleanup after each test
  });

  it('should handle normal case', () => {
    const result = functionToTest(input);
    expect(result).toEqual(expectedOutput);
  });

  it('should handle edge case', () => {
    expect(() => functionToTest(invalidInput)).toThrow();
  });
});
```

#### Testing React Components

```typescript
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MyComponent } from './my_component';

describe('MyComponent', () => {
  it('renders correctly', () => {
    render(<MyComponent prop="value" />);
    expect(screen.getByText('Expected Text')).toBeInTheDocument();
  });

  it('handles user interaction', async () => {
    const onClickMock = jest.fn();
    render(<MyComponent onClick={onClickMock} />);
    
    fireEvent.click(screen.getByRole('button'));
    expect(onClickMock).toHaveBeenCalledTimes(1);
  });
});
```

#### Testing Hooks

```typescript
import { renderHook, act } from '@testing-library/react-hooks';
import { useMyHook } from './use_my_hook';

describe('useMyHook', () => {
  it('returns initial state', () => {
    const { result } = renderHook(() => useMyHook());
    expect(result.current.value).toBe(initialValue);
  });

  it('updates state correctly', () => {
    const { result } = renderHook(() => useMyHook());
    
    act(() => {
      result.current.setValue('new value');
    });
    
    expect(result.current.value).toBe('new value');
  });
});
```

#### Testing Async Code

```typescript
describe('asyncFunction', () => {
  it('resolves with data', async () => {
    const result = await asyncFunction();
    expect(result).toEqual(expectedData);
  });

  it('rejects on error', async () => {
    await expect(asyncFunction(badInput)).rejects.toThrow('Error message');
  });
});
```

### Mocking

#### Mocking Modules

```typescript
// Mock entire module
jest.mock('./dependency', () => ({
  someFunction: jest.fn().mockReturnValue('mocked'),
}));

// Mock with partial implementation
jest.mock('./dependency', () => ({
  ...jest.requireActual('./dependency'),
  specificFunction: jest.fn(),
}));
```

#### Mocking Kibana Services

```typescript
import { coreMock } from '@kbn/core/public/mocks';
import { dataPluginMock } from '@kbn/data-plugin/public/mocks';

const coreStart = coreMock.createStart();
const dataStart = dataPluginMock.createStartContract();
```

#### Mocking HTTP Requests

```typescript
import { httpServiceMock } from '@kbn/core-http-browser-mocks';

const http = httpServiceMock.createStartContract();
http.get.mockResolvedValue({ data: 'response' });
```

#### Mocking Elasticsearch Client

```typescript
import { elasticsearchServiceMock } from '@kbn/core-elasticsearch-server-mocks';

const esClient = elasticsearchServiceMock.createScopedClusterClient();
esClient.asCurrentUser.search.mockResolvedValue({
  hits: { hits: [], total: { value: 0 } },
});
```

### Testing Best Practices

1. **Test behavior, not implementation** — Tests should verify what the code does, not how it does it
2. **One assertion focus per test** — Each test should verify one specific behavior
3. **Descriptive test names** — Use `it('should <expected behavior> when <condition>')` format
4. **Avoid testing implementation details** — Don't test private methods or internal state
5. **Use realistic test data** — Mirror production data structures
6. **Clean up after tests** — Reset mocks, clear timers, unmount components

---

## 3. Refactoring Guidelines

### When to Refactor

- Before adding new features to complex code
- When fixing bugs in poorly structured code
- When tests are difficult to write for existing code
- When the same pattern is duplicated across multiple files

### Safe Refactoring Process

1. **Ensure test coverage exists** — Write tests before refactoring if missing
2. **Make small, incremental changes** — Each change should be independently verifiable
3. **Run tests after each change** — Catch regressions immediately
4. **Preserve public API contracts** — Don't break consumers

### Common Refactoring Patterns

#### Extract Function

```typescript
// Before
function processData(data: Data[]) {
  const filtered = data.filter(d => d.active && d.value > 0);
  const sorted = filtered.sort((a, b) => b.value - a.value);
  return sorted.slice(0, 10);
}

// After
function filterActive(data: Data[]): Data[] {
  return data.filter(d => d.active && d.value > 0);
}

function sortByValueDesc(data: Data[]): Data[] {
  return [...data].sort((a, b) => b.value - a.value);
}

function processData(data: Data[]): Data[] {
  return sortByValueDesc(filterActive(data)).slice(0, 10);
}
```

#### Extract Component

```typescript
// Before: Large component with multiple concerns
function Dashboard() {
  return (
    <div>
      <header>...</header>
      <div className="filters">
        {/* 50 lines of filter UI */}
      </div>
      <div className="results">
        {/* 100 lines of results UI */}
      </div>
    </div>
  );
}

// After: Smaller, focused components
function Dashboard() {
  return (
    <div>
      <DashboardHeader />
      <DashboardFilters />
      <DashboardResults />
    </div>
  );
}
```

#### Extract Hook

```typescript
// Before: Logic mixed in component
function MyComponent() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchData()
      .then(setData)
      .catch(setError)
      .finally(() => setLoading(false));
  }, []);

  // ... render logic
}

// After: Reusable hook
function useFetchData() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchData()
      .then(setData)
      .catch(setError)
      .finally(() => setLoading(false));
  }, []);

  return { data, loading, error };
}

function MyComponent() {
  const { data, loading, error } = useFetchData();
  // ... render logic
}
```

#### Replace Conditionals with Polymorphism

```typescript
// Before: Type checking with conditionals
function renderVisualization(type: string, data: Data) {
  if (type === 'line') {
    return <LineChart data={data} />;
  } else if (type === 'bar') {
    return <BarChart data={data} />;
  } else if (type === 'pie') {
    return <PieChart data={data} />;
  }
}

// After: Component mapping
const VISUALIZATION_COMPONENTS: Record<string, ComponentType<{ data: Data }>> = {
  line: LineChart,
  bar: BarChart,
  pie: PieChart,
};

function renderVisualization(type: string, data: Data) {
  const Component = VISUALIZATION_COMPONENTS[type];
  return Component ? <Component data={data} /> : null;
}
```

---

## 4. TypeScript Conventions

### Type Definitions

```typescript
// Prefer interfaces for object shapes
interface ServiceConfig {
  endpoint: string;
  timeout: number;
}

// Use type for unions, intersections, mapped types
type Status = 'pending' | 'success' | 'error';
type WithTimestamp<T> = T & { timestamp: number };
```

### Import Types

```typescript
// Use type-only imports when importing only types
import type { ServiceConfig } from './types';

// Regular import for values and types
import { SERVICE_NAME, type ServiceConfig } from './constants';
```

### Strict Null Checks

```typescript
// Always handle null/undefined explicitly
function getUser(id: string): User | undefined {
  return users.get(id);
}

// Use optional chaining
const userName = user?.profile?.name;

// Use nullish coalescing
const displayName = userName ?? 'Anonymous';
```

---

## 5. Code Style

### Naming Conventions

| Type | Convention | Example |
| ---- | ---------- | ------- |
| Files | snake_case | `user_service.ts` |
| React Components | PascalCase | `UserProfile.tsx` |
| Functions | camelCase | `getUserById` |
| Constants | SCREAMING_SNAKE_CASE | `MAX_RETRIES` |
| Types/Interfaces | PascalCase | `UserConfig` |
| Test files | `<name>.test.ts(x)` | `user_service.test.ts` |

### File Organization

```typescript
// 1. License header (if applicable)
// 2. External imports (node_modules)
import React from 'react';
import { EuiButton } from '@elastic/eui';

// 3. Kibana package imports (@kbn/*)
import { i18n } from '@kbn/i18n';
import type { CoreStart } from '@kbn/core/public';

// 4. Relative imports
import { MyService } from './my_service';
import type { MyConfig } from './types';

// 5. Type definitions (if inline)
interface Props {
  // ...
}

// 6. Constants
const DEFAULT_TIMEOUT = 5000;

// 7. Main exports
export function MyComponent(props: Props) {
  // ...
}
```

---

## 6. Common Kibana Patterns

### Using Kibana Services

```typescript
// In plugin setup/start
export class MyPlugin implements Plugin {
  public setup(core: CoreSetup, plugins: SetupDeps) {
    // Register routes, register saved object types, etc.
  }

  public start(core: CoreStart, plugins: StartDeps) {
    // Access runtime services
    return {
      getService: () => new MyService(core.http),
    };
  }
}
```

### HTTP API Routes (Server)

```typescript
import { schema } from '@kbn/config-schema';

router.get(
  {
    path: '/api/my_plugin/resource/{id}',
    validate: {
      params: schema.object({
        id: schema.string(),
      }),
      query: schema.object({
        includeDetails: schema.boolean({ defaultValue: false }),
      }),
    },
  },
  async (context, request, response) => {
    const { id } = request.params;
    const { includeDetails } = request.query;

    try {
      const data = await fetchResource(id, includeDetails);
      return response.ok({ body: data });
    } catch (error) {
      return response.customError({
        statusCode: 500,
        body: { message: error.message },
      });
    }
  }
);
```

### Using useKibana Hook

```typescript
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { MyPluginStartDeps } from '../types';

export function MyComponent() {
  const { services } = useKibana<MyPluginStartDeps>();
  const { http, notifications } = services;

  const handleAction = async () => {
    try {
      await http.post('/api/my_plugin/action');
      notifications.toasts.addSuccess('Action completed');
    } catch (error) {
      notifications.toasts.addError(error, { title: 'Action failed' });
    }
  };

  return <button onClick={handleAction}>Do Action</button>;
}
```

### Saved Objects

```typescript
// Register saved object type
core.savedObjects.registerType({
  name: 'my-object-type',
  hidden: false,
  namespaceType: 'single',
  mappings: {
    properties: {
      title: { type: 'text' },
      config: { type: 'object', enabled: false },
    },
  },
});

// CRUD operations
const client = core.savedObjects.client;

// Create
await client.create('my-object-type', { title: 'New Object' });

// Read
const object = await client.get('my-object-type', id);

// Update
await client.update('my-object-type', id, { title: 'Updated Title' });

// Delete
await client.delete('my-object-type', id);
```

---

## 7. Integration & API Tests

### Test Types

| Type | Location | Purpose |
| ---- | -------- | ------- |
| Unit tests | Alongside source files | Test individual functions/components |
| API integration tests | `test/api_integration/` | Test HTTP APIs |
| Functional tests | `test/functional/` | Test UI flows |

### Running API Integration Tests

```bash
# Start test servers
node scripts/functional_tests_server --config <config_path>

# Run tests
node scripts/functional_test_runner --config <config_path>

# Run specific test
node scripts/functional_test_runner --config <config_path> --grep="test name"
```

### Common Test Configs

| Config | Purpose |
| ------ | ------- |
| `test/api_integration/config.ts` | Core API tests |
| `x-pack/test/api_integration/config.ts` | X-Pack API tests |
| `x-pack/test/functional/config.ts` | X-Pack functional tests |

---

## 8. Linting and Formatting

### Run Linting

```bash
# Lint specific files
node scripts/eslint <path>

# Fix auto-fixable issues
node scripts/eslint --fix <path>

# Type check
node scripts/type_check
```

### Common Lint Rules

- No unused variables or imports
- Explicit return types on exported functions
- No `any` type (use `unknown` or proper types)
- React hooks dependencies must be complete

---

## 9. Pre-Commit Checklist

Before submitting changes:

- [ ] All tests pass: `node scripts/jest <changed-files>`
- [ ] No lint errors: `node scripts/eslint <changed-files>`
- [ ] Types check: `node scripts/type_check`
- [ ] New code has test coverage
- [ ] No console.log statements left in code
- [ ] Public APIs are documented with JSDoc comments

---

## References

- [Kibana Contributing Guide](https://github.com/elastic/kibana/blob/main/CONTRIBUTING.md)
- [Kibana Developer Documentation](https://docs.elastic.dev/kibana-dev-docs)
- [Elastic UI Framework](https://elastic.github.io/eui/)
