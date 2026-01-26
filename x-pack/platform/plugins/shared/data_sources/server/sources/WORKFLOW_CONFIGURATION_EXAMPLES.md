# Workflow Configuration Examples for DataTypeDefinition

This guide shows the different ways to configure workflows for your `DataTypeDefinition`.

## Table of Contents

1. [Local Directory (Recommended)](#1-local-directory-recommended)
2. [Registry References](#2-registry-references)
3. [Mixed (Local + Registry)](#3-mixed-local--registry)
4. [Legacy Approaches](#4-legacy-approaches-deprecated)

---

## 1. Local Directory (Recommended)

### Simple String Format

Load workflows from a local directory:

```typescript
import { join } from 'path';
import type { DataTypeDefinition } from '@kbn/data-sources-registry-plugin/server';

export const myDataSource: DataTypeDefinition = {
  id: 'my-source',
  name: 'My Data Source',

  // Simple string: path to workflows directory
  workflows: join(__dirname, 'workflows'),

  stackConnector: {
    type: '.my-connector',
    config: {},
  },
};
```

**Directory Structure:**
```
data_sources/my-source/
├── data_type.ts
└── workflows/
    ├── search.tool.yaml      # Generates AB tool
    ├── fetch.tool.yaml        # Generates AB tool
    └── internal.yaml          # No AB tool
```

### Object Format

For explicit configuration:

```typescript
export const myDataSource: DataTypeDefinition = {
  id: 'my-source',
  name: 'My Data Source',

  workflows: {
    directory: join(__dirname, 'workflows'),
  },

  stackConnector: {
    type: '.my-connector',
    config: {},
  },
};
```

---

## 2. Registry References

Load workflows from a third-party workflow registry:

```typescript
export const myDataSource: DataTypeDefinition = {
  id: 'my-source',
  name: 'My Data Source',

  // Array: workflow references from registry
  workflows: [
    { id: 'common-workflow-search' },
    { id: 'common-workflow-fetch' },
    { id: 'common-workflow-update', shouldGenerateABTool: false }, // Override default
  ],

  stackConnector: {
    type: '.my-connector',
    config: {},
  },
};
```

**Important:** When using registry workflows, you must provide a `WorkflowRegistry` instance to the connector creation function.

### Implementing a Workflow Registry

```typescript
import type { WorkflowRegistry, RegistryWorkflow } from '@kbn/data-sources-registry-plugin/server';

class MyWorkflowRegistry implements WorkflowRegistry {
  async getWorkflow(workflowId: string): Promise<RegistryWorkflow | undefined> {
    // Fetch from HTTP API, database, etc.
    const response = await fetch(`https://api.example.com/workflows/${workflowId}`);
    if (!response.ok) return undefined;

    const data = await response.json();
    return {
      id: data.id,
      name: data.name,
      description: data.description,
      content: data.yaml, // YAML string
      shouldGenerateABTool: data.generateTool ?? true,
    };
  }

  async getWorkflows(workflowIds: string[]): Promise<RegistryWorkflow[]> {
    // Batch fetch for efficiency
    const promises = workflowIds.map(id => this.getWorkflow(id));
    const results = await Promise.all(promises);
    return results.filter((wf): wf is RegistryWorkflow => wf !== undefined);
  }
}

// Usage
const workflowRegistry = new MyWorkflowRegistry();
await createConnectorAndRelatedResources({
  // ... other params
  dataConnectorTypeDef: myDataSource,
  workflowRegistry, // Provide registry instance
});
```

---

## 3. Mixed (Local + Registry)

Combine local workflows with registry workflows:

```typescript
export const myDataSource: DataTypeDefinition = {
  id: 'my-source',
  name: 'My Data Source',

  workflows: {
    // Local custom workflows
    directory: join(__dirname, 'workflows'),

    // Common workflows from registry
    registry: [
      { id: 'common-workflow-search' },
      { id: 'common-workflow-analytics' },
    ],
  },

  stackConnector: {
    type: '.my-connector',
    config: {},
  },
};
```

**Use Case:** Use registry workflows for common operations (search, analytics) while maintaining custom local workflows for source-specific features.

---

## 4. Legacy Approaches (Deprecated)

### workflowsDir (Deprecated)

```typescript
export const myDataSource: DataTypeDefinition = {
  id: 'my-source',
  name: 'My Data Source',

  // ⚠️ Deprecated: Use workflows instead
  workflowsDir: join(__dirname, 'workflows'),

  stackConnector: {
    type: '.my-connector',
    config: {},
  },
};
```

**Migration:** Replace `workflowsDir` with `workflows` (string format).

### generateWorkflows() (Deprecated)

```typescript
export const myDataSource: DataTypeDefinition = {
  id: 'my-source',
  name: 'My Data Source',

  // ⚠️ Deprecated: Use workflows instead
  generateWorkflows(stackConnectorId: string) {
    return [
      {
        content: generateSearchWorkflow(stackConnectorId),
        shouldGenerateABTool: true,
      },
      {
        content: generateFetchWorkflow(stackConnectorId),
        shouldGenerateABTool: true,
      },
    ];
  },

  stackConnector: {
    type: '.my-connector',
    config: {},
  },
};
```

**Migration:** Extract workflow YAML to separate `.tool.yaml` files and use `workflows` with directory path.

---

## Workflow YAML Files

### Naming Convention

- `*.tool.yaml` or `*.tool.yml` → Generates Agent Builder tool
- `*.yaml` or `*.yml` → No AB tool generated

### Template Variables

Workflow files can use template variables:

```yaml
version: '1'
name: 'sources.my-source.search'
description: 'Search operation'
enabled: true
triggers:
  - type: 'manual'
inputs:
  - name: query
    type: string
steps:
  - name: search
    type: myconnector.search
    connector-id: {{stackConnectorId}}  # ← Replaced at runtime
    with:
      query: "${{inputs.query}}"
```

### Full Example Workflow

**File:** `workflows/search.tool.yaml`

```yaml
version: '1'
name: 'sources.my-source.search'
description: 'Search for items in the data source'
enabled: true
triggers:
  - type: 'manual'
inputs:
  - name: query
    type: string
    required: true
  - name: limit
    type: number
    default: 10
steps:
  - name: execute-search
    type: myconnector.search
    connector-id: {{stackConnectorId}}
    with:
      query: "${{inputs.query}}"
      limit: "${{inputs.limit}}"
```

---

## Priority Order

When multiple workflow configuration methods are defined, they are processed in this order:

1. **workflows** (new approach) - Highest priority
2. **workflowsDir** (deprecated)
3. **generateWorkflows** (deprecated) - Lowest priority

Only the highest priority method will be used; others are ignored.

---

## Best Practices

1. **Prefer `workflows`** over deprecated `workflowsDir` and `generateWorkflows`
2. **Use local directory** for source-specific workflows
3. **Use registry** for common, reusable workflows across multiple data sources
4. **Use mixed approach** when you need both custom and common workflows
5. **Use `.tool.yaml` suffix** for workflows that should generate AB tools
6. **Keep workflows simple** - one operation per workflow
7. **Use descriptive names** following pattern: `sources.<source-id>.<operation>`

---

## Error Handling

The system will throw errors in these cases:

- No workflow configuration defined (no `workflows`, `workflowsDir`, or `generateWorkflows`)
- Registry workflows referenced but no `WorkflowRegistry` provided
- Workflow directory doesn't exist
- No YAML files found in directory
- Referenced workflow not found in registry
- Invalid YAML syntax in workflow files

---

## Testing

### Mock Workflow Registry

For testing, create a mock registry:

```typescript
import type { WorkflowRegistry, RegistryWorkflow } from '@kbn/data-sources-registry-plugin/server';

class MockWorkflowRegistry implements WorkflowRegistry {
  private workflows = new Map<string, RegistryWorkflow>();

  constructor(workflows: RegistryWorkflow[]) {
    workflows.forEach(wf => this.workflows.set(wf.id, wf));
  }

  async getWorkflow(workflowId: string): Promise<RegistryWorkflow | undefined> {
    return this.workflows.get(workflowId);
  }

  async getWorkflows(workflowIds: string[]): Promise<RegistryWorkflow[]> {
    return workflowIds
      .map(id => this.workflows.get(id))
      .filter((wf): wf is RegistryWorkflow => wf !== undefined);
  }
}

// Usage in tests
const mockRegistry = new MockWorkflowRegistry([
  {
    id: 'test-workflow-1',
    name: 'Test Workflow',
    content: 'version: 1\nname: test\n...',
    shouldGenerateABTool: true,
  },
]);
```