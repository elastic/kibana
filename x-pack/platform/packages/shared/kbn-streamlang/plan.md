# Streamlang Type Validation Implementation Plan

## Overview
Add type validation capability to streamlang to track how types propagate through processing steps and validate type consistency.

## Background
Streamlang is a DSL for specifying data processing pipelines. Currently, it has no notion of types. This implementation adds type tracking and validation to catch type errors before execution.

## Key Concepts

### Streamlang Structure
- **StreamlangDSL**: Root object containing an array of steps
- **Steps**: Can be either:
  - **StreamlangProcessorDefinition**: Actions like `set`, `grok`, `dissect`, `rename`, `date`, `append`
  - **StreamlangWhereBlock**: Conditional blocks with nested steps (can be nested recursively)

### Type System
- **Primitive Types**: `string`, `number`, `boolean`, `date` only
  - Normalize Grok/Dissect types: `keyword` → `string`, `int`/`long`/`float` → `number`
  - Arrays are assumed to "just work" (no explicit array type tracking)
- **Placeholder Types**: `typeof_<fieldname>` for unknown field types
- **Type Merging**: When unknown types reference each other, merge as `typeof_<field1>,<field2>`
- **Type Changes**: Fields can change types, but ONLY if the change happens unconditionally
  - ✅ OK: Field always changes from string to number (unconditional reassignment)
  - ❌ Error: Field sometimes string, sometimes number (conditional assignment creates inconsistency)

## Implementation Phases

### Phase 1: Type System Foundation
**File**: `src/type_validation/types.ts`

Define core TypeScript types:
```typescript
// Primitive types - only these 4 types exist
type PrimitiveType = 'string' | 'number' | 'boolean' | 'date';

// Placeholder type for unknown fields
type TypeofPlaceholder = `typeof_${string}`;

// Union of all possible field types
type FieldType = PrimitiveType | TypeofPlaceholder;

// Records assumptions made during validation
interface TypeAssumption {
  placeholder: TypeofPlaceholder;
  assumedType: PrimitiveType | TypeofPlaceholder;
  reason: string; // e.g., "field 'x' copied to field 'y'"
}

// Tracks current type state of all fields
// Note: Each field tracks ALL assignments to detect conditional type changes
interface FieldTypeInfo {
  currentType: FieldType;
  allAssignments: Array<{ type: FieldType; processorIndex: number }>;
}

type TypeState = Map<string, FieldTypeInfo>;

// Helper to normalize Elasticsearch types to primitives
function normalizeToPrimitive(esType: string): PrimitiveType {
  // keyword → string
  // int, long, float → number
  // date → date
  // boolean → boolean
}
```

### Phase 2: Core Validation Function
**File**: `src/type_validation/validate_types.ts`

Main validation function:
```typescript
export function validateTypes(
  streamlang: StreamlangDSL,
  startingFieldTypes: Record<string, string>
): TypeAssumption[];
```

**Algorithm**:
1. Initialize `TypeState` with `startingFieldTypes` (normalized to primitive types)
2. Initialize empty `assumptions: TypeAssumption[]`
3. Flatten nested where blocks (using pattern from `flatten_steps.ts`)
   - **Important**: Track which processors are inside conditional blocks
4. For each flattened processor with index:
   - Call appropriate type handler
   - Update type state, recording assignment and whether it's conditional
   - Record assumptions
5. Validate no field has multiple different types from conditional assignments
6. Validate all assumptions for conflicts
7. Return valid assumptions or throw error

### Phase 3: Processor Type Handlers
**File**: `src/type_validation/processors/`

Implement handler for each processor type:

#### 3.1 Set Processor (`set.ts`)
```typescript
function handleSetProcessor(
  processor: SetProcessor,
  state: TypeState,
  assumptions: TypeAssumption[]
): void
```
- If `copy_from`: Get source type, assign to target (may create assumption)
- If `value`: Infer type from JavaScript type of value, assign to target

#### 3.2 Rename Processor (`rename.ts`)
```typescript
function handleRenameProcessor(
  processor: RenameProcessor,
  state: TypeState,
  assumptions: TypeAssumption[]
): void
```
- Get type of `from` field
- Assign same type to `to` field
- Remove `from` field from state

#### 3.3 Grok Processor (`grok.ts`)
```typescript
function handleGrokProcessor(
  processor: GrokProcessor,
  state: TypeState,
  assumptions: TypeAssumption[],
  processorIndex: number,
  isConditional: boolean
): void
```
- Use `parseMultiGrokPatterns(processor.patterns)` to extract fields
- For each extracted field: Normalize type and assign to state
  - `keyword` → `string`
  - `int`, `long`, `float` → `number`
  - (already normalized in parser output)

#### 3.4 Dissect Processor (`dissect.ts`)
```typescript
function handleDissectProcessor(
  processor: DissectProcessor,
  state: TypeState,
  assumptions: TypeAssumption[],
  processorIndex: number,
  isConditional: boolean
): void
```
- Use `parseDissectPattern(processor.pattern)` to extract fields
- For each extracted field: Assign `string` type (dissect always produces strings, keyword normalized to string)

#### 3.5 Date Processor (`date.ts`)
```typescript
function handleDateProcessor(
  processor: DateProcessor,
  state: TypeState,
  assumptions: TypeAssumption[]
): void
```
- Target field = `processor.to || processor.from`
- Assign `date` type to target field

#### 3.6 Append Processor (`append.ts`)
```typescript
function handleAppendProcessor(
  processor: AppendProcessor,
  state: TypeState,
  assumptions: TypeAssumption[],
  processorIndex: number,
  isConditional: boolean
): void
```
- Arrays "just work" - no explicit type tracking needed
- May infer element type from `value` array for documentation purposes (optional)

#### 3.7 Manual Ingest Pipeline (`manual.ts`)
```typescript
function handleManualProcessor(
  processor: ManualIngestPipelineProcessor,
  state: TypeState,
  assumptions: TypeAssumption[]
): void
```
- Skip analysis (escape hatch - can't determine types)
- Potentially warn or log

### Phase 4: Type Assignment Logic
**File**: `src/type_validation/type_assignment.ts`

Core function for type assignment with conflict detection:
```typescript
function assignType(
  fieldName: string,
  newType: FieldType,
  state: TypeState,
  assumptions: TypeAssumption[],
  processorIndex: number,
  isConditional: boolean,
  reason: string
): void
```

**Logic Matrix**:

| Current Type | New Type | Conditional? | Action |
|--------------|----------|--------------|--------|
| None | Primitive | Any | Assign primitive type |
| None | Typeof | Any | Assign typeof placeholder |
| Primitive | Same Primitive | Any | Record assignment (OK - same type) |
| Primitive | Different Primitive | No | Record assignment (OK - unconditional type change) |
| Primitive | Different Primitive | Yes | **Error**: Conditional type change not allowed |
| Primitive | Typeof | Any | Record assumption (typeof = primitive), keep primitive |
| Typeof | Primitive | Any | Record assumption (typeof = primitive), assign primitive |
| Typeof_a | Typeof_b | Any | Merge to `typeof_a,b`, record equality assumption |
| Typeof_a,b | Typeof_c | Any | Merge to `typeof_a,b,c`, record equality assumption |
| Typeof_a,b | Primitive | Any | Record assumption (all = primitive), assign primitive |

**Key Insight**: Unconditional type changes are OK (e.g., always converting string to number), but conditional type changes create inconsistency and are errors.

**Helper Functions**:
```typescript
function isPrimitiveType(type: FieldType): type is PrimitiveType;
function isTypeofPlaceholder(type: FieldType): type is TypeofPlaceholder;
function mergeTypeofPlaceholders(type1: TypeofPlaceholder, type2: TypeofPlaceholder): TypeofPlaceholder;
function extractFieldsFromPlaceholder(placeholder: TypeofPlaceholder): string[];
```

### Phase 5: Assumption Validation
**File**: `src/type_validation/validate_assumptions.ts`

Validate that assumptions don't conflict:
```typescript
function validateAssumptions(assumptions: TypeAssumption[]): void
```

**Validation Rules**:
1. **Conditional type changes**: Error
   - Example: Field `x` is `string` in one branch, `number` in another (conditional)
   - OK: Field `x` is always reassigned from `string` to `number` (unconditional)
2. **Same placeholder, different primitive types**: Error
   - Example: `typeof_x` assumed to be both `number` and `string`
3. **Merged placeholders with conflicting types**: Error
   - Example: `typeof_a,b` where `typeof_a` was assumed `number` elsewhere but `typeof_b` was assumed `string`
4. **Circular placeholder references**: Error (edge case)
   - Example: `typeof_a` = `typeof_b`, `typeof_b` = `typeof_a` (should resolve to same merged type)

**Algorithm**:
1. Build map of placeholder → concrete type assumptions
2. For merged placeholders (e.g., `typeof_a,b`):
   - Extract individual fields (`a`, `b`)
   - Check if any have different concrete type assumptions
   - If yes: **Error**
3. Return if all valid

### Phase 6: Error Handling
**File**: `src/type_validation/errors.ts`

Define custom error types with helpful messages:
```typescript
class ConditionalTypeChangeError extends Error {
  constructor(
    public field: string,
    public types: PrimitiveType[],
    public processorIndices: number[]
  ) {
    super(
      `Field '${field}' has conditional type changes: ` +
      `${types.join(', ')} at processors ${processorIndices.join(', ')}. ` +
      `Types can only change unconditionally (outside conditional blocks).`
    );
  }
}

class TypeConflictError extends Error {
  constructor(
    public field: string,
    public conflictingTypes: FieldType[],
    public locations: string[]
  );
}

class AssumptionConflictError extends Error {
  constructor(
    public placeholder: TypeofPlaceholder,
    public conflictingAssumptions: TypeAssumption[]
  );
}
```

### Phase 7: Testing
**File**: `src/type_validation/validate_types.test.ts`

Comprehensive test coverage:

1. **Basic Type Propagation**
   - Set with value: Infer correct types
   - Set with copy_from: Propagate types
   - Rename: Move types

2. **Pattern Extraction**
   - Grok with type casts: Extract typed fields
   - Dissect: Extract keyword fields

3. **Unknown Field Handling**
   - Copy from unknown field: Create typeof placeholder
   - Assign typeof to concrete: Record assumption

4. **Placeholder Merging**
   - Two unknown fields assigned to each other
   - Chain of unknown assignments

5. **Type Changes**
   - Unconditional type change: Should pass
   - Conditional type change: Should throw ConditionalTypeChangeError

6. **Conflict Detection**
   - Primitive type mismatch (conditional): Should throw
   - Placeholder assumed different types: Should throw
   - Merged placeholder conflict: Should throw

7. **Type Normalization**
   - Grok int/long/float → number
   - Grok/Dissect keyword → string

8. **Complex Scenarios**
   - Nested where blocks (flattened, tracked as conditional)
   - Multiple processors modifying same field (unconditional OK, conditional error)
   - Long chains of type propagation

## File Structure

```
src/
  type_validation/
    index.ts                      # Main export
    validate_types.ts             # Core validation function
    types.ts                      # Type definitions
    type_assignment.ts            # Type assignment logic
    validate_assumptions.ts       # Assumption validation
    errors.ts                     # Custom error types
    processors/
      index.ts                    # Export all handlers
      set.ts                      # Set processor handler
      rename.ts                   # Rename processor handler
      grok.ts                     # Grok processor handler
      dissect.ts                  # Dissect processor handler
      date.ts                     # Date processor handler
      append.ts                   # Append processor handler
      manual.ts                   # Manual processor handler
    validate_types.test.ts        # Comprehensive tests
```

## Dependencies
- Existing utilities from `types/utils/grok_patterns.ts`
- Existing utilities from `types/utils/dissect_patterns.ts`
- Flatten logic pattern from `transpilers/shared/flatten_steps.ts`
- Type definitions from `types/` directory

## Success Criteria
1. ✅ Function accepts StreamlangDSL and starting field types
2. ✅ Correctly flattens nested where blocks
3. ✅ Tracks type propagation through all processor types
4. ✅ Handles unknown fields with typeof placeholders
5. ✅ Merges typeof placeholders when assigned to each other
6. ✅ Records assumptions with clear reasons
7. ✅ Detects and throws errors on type conflicts
8. ✅ Validates assumptions for consistency
9. ✅ Returns valid assumptions on success
10. ✅ Comprehensive test coverage (>90%)

## Future Enhancements (Out of Scope)
- Type inference for manual ingest pipeline processors
- Support for more complex types (nested objects, unions)
- Performance optimization for large pipelines
- Integration with IDE/editor for real-time validation
- Type suggestions/auto-completion based on schema
