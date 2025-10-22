# Streamlang Type Validation

Type validation system for Streamlang DSL that tracks how types propagate through processing steps and validates type consistency.

## Usage

```typescript
import { validateTypes } from './src/type_validation';
import type { StreamlangDSL } from './types/streamlang';

const dsl: StreamlangDSL = {
  steps: [
    { action: 'set', to: 'field1', value: 'hello' },
    { action: 'set', to: 'field2', copy_from: 'field1' },
  ],
};

// Validate with starting field types
const result = validateTypes(dsl, {
  existingField: 'string',
  count: 'int', // Will be normalized to 'number'
});

console.log('Assumptions:', result.assumptions);
console.log('Final field types:', result.fieldTypes);
```

## Return Value

`validateTypes` returns a `TypeValidationResult` object with:

```typescript
interface TypeValidationResult {
  /** Assumptions made about typeof placeholders during validation */
  assumptions: TypeAssumption[];
  
  /** Final types of all fields after processing the pipeline */
  fieldTypes: Record<string, FieldType>;
}
```

- **`assumptions`**: Records when typeof placeholders get resolved to concrete types
- **`fieldTypes`**: Maps each field name to its final type after all processing steps

## Features

- **Type Propagation**: Tracks how types flow through `set`, `rename`, `grok`, `dissect`, `date`, `convert`, and other processors
- **Type Normalization**: Converts Elasticsearch types (`keyword`, `int`, `long`, `float`) to primitive types (`string`, `number`)
- **Unknown Field Handling**: Creates `typeof_<fieldname>` placeholders for unknown fields
- **Conditional Type Checking**: Validates that fields don't change types conditionally (inside `where` blocks)
- **Assumption Tracking**: Records and validates assumptions about unknown field types
- **Field Type Tracking**: Returns final state of all field types showing how they evolved

## Type System

### Primitive Types
- `string` - Text values (normalized from `keyword`, `text`)
- `number` - Numeric values (normalized from `int`, `long`, `float`, `double`)
- `boolean` - Boolean values
- `date` - Date/timestamp values

### Typeof Placeholders
When a field is used before being assigned, a placeholder type `typeof_<fieldname>` is created. These placeholders can merge (e.g., `typeof_a,b`) when fields reference each other.

## Validation Rules

### ✅ Allowed
- Unconditional type changes: `field = "string"; field = 123`
- Type propagation: `field2 = field1` (copies type)
- Pattern extraction: `grok`, `dissect` create typed fields

### ❌ Not Allowed
- Conditional type changes: `if (cond) { field = "string" } else { field = 123 }`
- Conflicting assumptions: `typeof_x` assumed to be both `string` and `number`

## Error Types

- `ConditionalTypeChangeError`: Field has different types in different conditional branches
- `AssumptionConflictError`: Typeof placeholder has conflicting type assumptions

## Examples

### Basic Type Propagation
```typescript
const dsl: StreamlangDSL = {
  steps: [
    { action: 'set', to: 'source', value: 'text' },
    { action: 'rename', from: 'source', to: 'target' },
  ],
};

validateTypes(dsl); // Passes - target inherits string type
```

### Grok Field Extraction
```typescript
const dsl: StreamlangDSL = {
  steps: [
    {
      action: 'grok',
      from: 'message',
      patterns: ['%{WORD:verb} %{NUMBER:count:int}'],
    },
  ],
};

validateTypes(dsl); // Passes - verb is string, count is number
```

### Conditional Type Change (Error)
```typescript
const dsl: StreamlangDSL = {
  steps: [
    {
      where: { field: 'condition', eq: 'a', steps: [
        { action: 'set', to: 'field1', value: 'string' }
      ]},
    },
    {
      where: { field: 'condition', eq: 'b', steps: [
        { action: 'set', to: 'field1', value: 123 }
      ]},
    },
  ],
};

validateTypes(dsl); // Throws ConditionalTypeChangeError
```

## Implementation Details

### Architecture
```
validateTypes (main entry point)
├── flattenStepsWithTracking (flatten nested where blocks)
├── processProcessor (for each processor)
│   ├── handleSetProcessor
│   ├── handleRenameProcessor
│   ├── handleGrokProcessor
│   ├── handleDissectProcessor
│   ├── handleDateProcessor
│   ├── handleAppendProcessor
│   └── handleManualProcessor
├── validateNoConditionalTypeChanges (check assignments)
└── validateAssumptions (check typeof placeholders)
```

### Test Coverage
- 91 tests across 6 test suites
- 97% code coverage
- Tests cover: basic operations, type propagation, pattern extraction, conditional logic, error cases, and real-world scenarios
