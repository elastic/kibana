# Dissect Pattern Extraction - Implementation Plan

## Overview

This document outlines the comprehensive implementation plan for the `@kbn/dissect-heuristics` package, which automatically generates Elasticsearch Dissect processor patterns from sample log messages.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Core Algorithm](#core-algorithm)
3. [Implementation Phases](#implementation-phases)
4. [Module Breakdown](#module-breakdown)
5. [Testing Strategy](#testing-strategy)
6. [Performance Considerations](#performance-considerations)
7. [Limitations & Trade-offs](#limitations--trade-offs)

---

## Architecture Overview

### Design Principles

1. **Simplicity over Complexity**: Dissect is simpler than Grok - leverage this
2. **No Regex Required**: All matching is literal string-based
3. **Fail Fast**: If structure is inconsistent, produce simpler patterns
4. **Performance**: Designed to run off main thread but still be efficient
5. **No Dynamic Fields**: Never produce reference keys (`*` and `&`)

### Key Differences from Grok Extraction

| Aspect | Grok Extraction | Dissect Extraction |
|--------|----------------|-------------------|
| **Primary Goal** | Identify pattern TYPES (IP, timestamp, etc.) | Identify literal DELIMITERS |
| **Pattern Library** | 100+ predefined regex patterns | None needed |
| **Complexity** | 8 steps with precedence ordering | 5 steps with delimiter detection |
| **Output** | `%{IP:clientip}` (typed) | `%{clientip}` (untyped) |
| **Variable Whitespace** | `\s+` regex patterns | `->` right padding modifier |

---

## Core Algorithm

### High-Level Flow

```
Input: Array of log messages
  ↓
Step 1: Find Common Delimiter Sequences
  ↓
Step 2: Build Ordered Delimiter Tree
  ↓
Step 3: Extract Variable Regions
  ↓
Step 4: Detect Modifiers (right padding, skip)
  ↓
Step 5: Generate Pattern String
  ↓
Output: Dissect pattern string
```

### Algorithm Walkthrough

#### **Step 1: Find Common Delimiter Sequences**

**Goal**: Identify literal strings that appear in **all** messages at relatively consistent positions.

**Algorithm**:
```typescript
function findDelimiterSequences(messages: string[]): string[] {
  // 1. Extract all substrings from all messages (length 1-10 chars)
  // 2. Filter to substrings that appear in ALL messages
  // 3. Filter out purely alphanumeric substrings (likely data, not delimiters)
  // 4. Score by consistency of position across messages
  // 5. Return top-scored candidates
}
```

**Example**:
```
Input:
  "1.2.3.4 - - [30/Apr/1998:22:00:52] GET"
  "5.6.7.8 - - [01/May/1998:10:15:30] POST"

Common sequences: " - - [", "] ", ":"
```

**Edge Cases**:
- Empty messages → return empty pattern
- Single message → treat entire message as template
- No common delimiters → return `%{message}` (single field)

---

#### **Step 2: Build Ordered Delimiter Tree**

**Goal**: Order delimiters by their position to create a skeleton structure.

**Algorithm**:
```typescript
function buildDelimiterTree(messages: string[], delimiters: string[]): DelimiterNode[] {
  return delimiters
    .map(delimiter => ({
      literal: delimiter,
      // Find position of this delimiter in each message
      positions: messages.map(msg => msg.indexOf(delimiter)),
      // Calculate median position for ordering
      medianPosition: median(positions)
    }))
    // Sort by median position (left to right)
    .sort((a, b) => a.medianPosition - b.medianPosition)
    // Filter out delimiters with inconsistent positions (optional)
    .filter(node => positionVariance(node.positions) < threshold);
}
```

**Example**:
```
Delimiters: [" - - [", "] ", ":"]
Positions:
  " - - [" → [7, 7, 7]     → median: 7
  "] "     → [28, 28, 28]  → median: 28
  ":"      → [21, 21, 21]  → median: 21

Ordered: [" - - [" (7), ":" (21), "] " (28)]
```

**Edge Cases**:
- Delimiter appears multiple times → use first occurrence
- Positions vary widely → exclude delimiter (variance too high)

---

#### **Step 3: Extract Variable Regions**

**Goal**: Identify content between delimiters that varies - these become `%{field}` placeholders.

**Algorithm**:
```typescript
function extractFields(messages: string[], delimiterTree: DelimiterNode[]): Field[] {
  const fields: Field[] = [];
  
  for (let i = 0; i < delimiterTree.length - 1; i++) {
    const current = delimiterTree[i];
    const next = delimiterTree[i + 1];
    
    // Extract substring between current and next delimiter
    const values = messages.map((msg, idx) => {
      const start = current.positions[idx] + current.literal.length;
      const end = next.positions[idx];
      return msg.substring(start, end);
    });
    
    fields.push({
      name: `field_${i + 1}`,
      values,
      position: current.positions[0] + current.literal.length
    });
  }
  
  // Handle last field (after final delimiter to end of string)
  const lastDelimiter = delimiterTree[delimiterTree.length - 1];
  const lastFieldValues = messages.map((msg, idx) => {
    const start = lastDelimiter.positions[idx] + lastDelimiter.literal.length;
    return msg.substring(start);
  });
  
  if (lastFieldValues.some(v => v.length > 0)) {
    fields.push({
      name: `field_${delimiterTree.length}`,
      values: lastFieldValues,
      position: lastDelimiter.positions[0] + lastDelimiter.literal.length
    });
  }
  
  return fields;
}
```

**Example**:
```
Messages with delimiters marked:
  "1.2.3.4[ - - []30/Apr/1998[:]22:00:52[] ]GET"
  "5.6.7.8[ - - []01/May/1998[:]10:15:30[] ]POST"

Fields extracted:
  field_1: ["1.2.3.4", "5.6.7.8"]
  field_2: ["30/Apr/1998", "01/May/1998"]
  field_3: ["22:00:52", "10:15:30"]
  field_4: ["GET", "POST"]
```

**Edge Cases**:
- No content between delimiters → create empty field or skip
- Content is identical across all messages → potential skip candidate

---

#### **Step 4: Detect Modifiers**

**Goal**: Analyze fields to determine if modifiers are needed.

##### **4a. Right Padding Modifier (`->`) Detection**

Detects variable trailing whitespace after a field.

```typescript
function detectRightPadding(values: string[]): boolean {
  const trailingSpaces = values.map(v => {
    const match = v.match(/\s+$/);
    return match ? match[0].length : 0;
  });
  
  const minSpaces = Math.min(...trailingSpaces);
  const maxSpaces = Math.max(...trailingSpaces);
  
  // If trailing whitespace varies, use right padding
  return maxSpaces > minSpaces;
}
```

**Example**:
```
Values: ["INFO   ", "WARN", "DEBUG  "]
Trailing spaces: [3, 0, 2]
Result: true → use %{level->}
```

##### **4b. Named Skip (`?`) Detection**

Detects fields with constant non-meaningful values.

```typescript
function shouldSkipField(values: string[]): boolean {
  const uniqueValues = new Set(values);
  
  // Skip if all values are the same and match common "empty" patterns
  if (uniqueValues.size === 1) {
    const value = Array.from(uniqueValues)[0];
    const emptyPatterns = ['-', '', 'null', 'N/A', 'none'];
    return emptyPatterns.includes(value.trim().toLowerCase());
  }
  
  return false;
}
```

**Example**:
```
Values: ["-", "-", "-"]
Result: true → use %{?ident} or %{}
```

##### **4c. Leading Whitespace Detection**

Similar to right padding but for leading whitespace.

```typescript
function detectLeadingWhitespace(values: string[]): { min: number; max: number } {
  const leadingSpaces = values.map(v => {
    const match = v.match(/^\s+/);
    return match ? match[0].length : 0;
  });
  
  return {
    min: Math.min(...leadingSpaces),
    max: Math.max(...leadingSpaces)
  };
}
```

**Note**: Leading whitespace is typically handled by trimming and adjusting delimiters, not with modifiers.

---

#### **Step 5: Generate Pattern String**

**Goal**: Combine delimiters and fields into final Dissect pattern.

```typescript
function generatePattern(
  delimiterTree: DelimiterNode[],
  fields: Field[],
  modifiers: Map<string, FieldModifiers>
): string {
  const parts: string[] = [];
  
  // Start with content before first delimiter (if any)
  if (fields[0]?.position === 0) {
    const field = fields[0];
    const mod = modifiers.get(field.name);
    parts.push(formatField(field, mod));
    fields = fields.slice(1);
  }
  
  // Interleave delimiters and fields
  delimiterTree.forEach((delimiter, i) => {
    // Add delimiter
    parts.push(delimiter.literal);
    
    // Add field after this delimiter
    if (fields[i]) {
      const field = fields[i];
      const mod = modifiers.get(field.name);
      parts.push(formatField(field, mod));
    }
  });
  
  return parts.join('');
}

function formatField(field: Field, mod?: FieldModifiers): string {
  if (mod?.skip) {
    return mod.namedSkip ? `%{?${field.name}}` : '%{}';
  }
  
  const rightPad = mod?.rightPadding ? '->' : '';
  return `%{${field.name}${rightPad}}`;
}
```

**Example**:
```
Delimiters: [" - - [", "] "]
Fields: [field_1, field_2, field_3]
Modifiers: { field_2: { skip: true } }

Result: "%{field_1} - - [%{?field_2}] %{field_3}"
```

---

## Implementation Phases

### Phase 1: Core Infrastructure (Week 1)

**Goal**: Set up basic types and utilities

**Tasks**:
- [ ] Create type definitions (`src/types.ts`)
- [ ] Implement string utilities (`src/utils.ts`)
  - `median()`, `variance()`
  - `escapeForDissect()`
  - `isLikelyDelimiter()`
- [ ] Create test fixtures (`src/__fixtures__/`)
  - Common log formats (Apache, Syslog, custom)
- [ ] Set up basic test structure

**Deliverables**:
- `types.ts` with all interfaces
- `utils.ts` with utility functions
- Initial test file with fixtures

---

### Phase 2: Delimiter Detection (Week 1-2)

**Goal**: Implement Step 1 & 2 of the algorithm

**Tasks**:
- [ ] Implement `findDelimiterSequences()` (`src/find_delimiter_sequences.ts`)
  - Substring extraction
  - Frequency analysis
  - Position consistency scoring
  - Filtering heuristics
- [ ] Implement `buildDelimiterTree()` (`src/build_delimiter_tree.ts`)
  - Position calculation
  - Median/variance analysis
  - Ordering logic
- [ ] Write comprehensive tests for both functions
  - Test with various log formats
  - Edge case coverage

**Deliverables**:
- `find_delimiter_sequences.ts`
- `build_delimiter_tree.ts`
- Full test coverage

---

### Phase 3: Field Extraction (Week 2)

**Goal**: Implement Step 3 of the algorithm

**Tasks**:
- [ ] Implement `extractFields()` (`src/extract_fields.ts`)
  - String slicing between delimiters
  - Handle edge cases (start/end of string)
  - Field naming
- [ ] Write tests for field extraction
  - Various delimiter configurations
  - Edge cases (no delimiters, empty fields)

**Deliverables**:
- `extract_fields.ts`
- Full test coverage

---

### Phase 4: Modifier Detection (Week 2-3)

**Goal**: Implement Step 4 of the algorithm

**Tasks**:
- [ ] Implement `detectRightPadding()` (`src/detect_right_padding.ts`)
- [ ] Implement `shouldSkipField()` (`src/should_skip_field.ts`)
- [ ] Implement `detectLeadingWhitespace()` (if needed)
- [ ] Write tests for each modifier detector
- [ ] Add integration tests combining all detectors

**Deliverables**:
- Modifier detection modules
- Full test coverage

---

### Phase 5: Pattern Generation (Week 3)

**Goal**: Implement Step 5 and main entry point

**Tasks**:
- [ ] Implement `generatePattern()` (`src/generate_pattern.ts`)
- [ ] Implement `extractDissectPatternDangerouslySlow()` (`src/extract_dissect_pattern.ts`)
  - Orchestrate all steps
  - Error handling
  - Validation
- [ ] Write end-to-end tests
  - Test against real log formats
  - Compare with expected patterns
  - Validate generated patterns work with Dissect processor

**Deliverables**:
- `generate_pattern.ts`
- `extract_dissect_pattern.ts`
- Comprehensive end-to-end tests

---

### Phase 6: Integration & Utilities (Week 3-4)

**Goal**: Additional utilities and integration features

**Tasks**:
- [ ] Implement `getDissectProcessor()` (`src/get_dissect_processor.ts`)
  - Generate full Elasticsearch processor config
  - Include field mapping
- [ ] Reuse `groupMessagesByPattern()` from grok-heuristics
  - Copy/adapt for dissect use case
- [ ] Add pattern validation (`src/validate_pattern.ts`)
  - Ensure no reference keys (`*`, `&`)
  - Ensure no append modifiers (`+`)
  - Syntax validation
- [ ] Write integration tests

**Deliverables**:
- `get_dissect_processor.ts`
- `group_messages.ts`
- `validate_pattern.ts`
- Integration tests

---

### Phase 7: Optimization & Polish (Week 4)

**Goal**: Performance optimization and documentation

**Tasks**:
- [ ] Performance profiling
  - Identify bottlenecks
  - Optimize hot paths
  - Add performance tests
- [ ] Documentation
  - JSDoc comments for all public APIs
  - Update README with examples
  - Add architecture diagrams (optional)
- [ ] Code review and refinement
  - Address edge cases
  - Improve error messages
  - Add logging/debugging support

**Deliverables**:
- Optimized codebase
- Complete documentation
- Performance benchmarks

---

## Module Breakdown

### Core Modules

```
src/
├── types.ts                           # Type definitions
├── utils.ts                           # Utility functions
├── extract_dissect_pattern.ts         # Main entry point (orchestrator)
├── find_delimiter_sequences.ts        # Step 1: Find delimiters
├── build_delimiter_tree.ts            # Step 2: Order delimiters
├── extract_fields.ts                  # Step 3: Extract variable regions
├── detect_right_padding.ts            # Step 4a: Right padding detection
├── should_skip_field.ts               # Step 4b: Skip field detection
├── generate_pattern.ts                # Step 5: Pattern generation
├── get_dissect_processor.ts           # Generate ES processor config
├── group_messages.ts                  # Group messages by pattern
├── validate_pattern.ts                # Pattern validation
└── __fixtures__/                      # Test data
    ├── apache_logs.ts
    ├── syslog.ts
    ├── custom_formats.ts
    └── edge_cases.ts
```

### Type Definitions (`types.ts`)

```typescript
/**
 * Represents a Dissect pattern with metadata
 */
export interface DissectPattern {
  /** The Dissect pattern string */
  pattern: string;
  /** Extracted fields with metadata */
  fields: DissectField[];
}

/**
 * Represents a field in the Dissect pattern
 */
export interface DissectField {
  /** Field name (e.g., "clientip", "field_1") */
  name: string;
  /** Sample values from the analyzed messages */
  values: string[];
  /** Position in the original messages */
  position: number;
  /** Applied modifiers */
  modifiers?: DissectModifiers;
}

/**
 * Modifiers that can be applied to a field
 */
export interface DissectModifiers {
  /** Right padding (->): handles variable trailing whitespace */
  rightPadding?: boolean;
  /** Skip field (?): field should not be extracted */
  skip?: boolean;
  /** Use named skip instead of anonymous */
  namedSkip?: boolean;
}

/**
 * Represents a delimiter in the delimiter tree
 */
export interface DelimiterNode {
  /** The literal delimiter string */
  literal: string;
  /** Position of this delimiter in each message */
  positions: number[];
  /** Median position across all messages */
  medianPosition: number;
  /** Position variance (for filtering) */
  variance?: number;
}

/**
 * Configuration for delimiter detection
 */
export interface DelimiterDetectionConfig {
  /** Minimum substring length to consider */
  minLength?: number;
  /** Maximum substring length to consider */
  maxLength?: number;
  /** Minimum number of messages delimiter must appear in */
  minFrequency?: number;
  /** Maximum position variance allowed */
  maxVariance?: number;
  /** Minimum score for delimiter candidate */
  minScore?: number;
}

/**
 * Result from getDissectProcessor()
 */
export interface DissectProcessorResult {
  /** The processor configuration */
  processor: {
    dissect: {
      field: string;
      pattern: string;
      append_separator?: string;
      ignore_missing?: boolean;
    };
  };
  /** Metadata about the extraction */
  metadata: {
    /** Number of messages analyzed */
    messageCount: number;
    /** Number of delimiters found */
    delimiterCount: number;
    /** Number of fields extracted */
    fieldCount: number;
    /** Confidence score (0-1) */
    confidence: number;
  };
}
```

---

## Testing Strategy

### Unit Tests

Each module should have comprehensive unit tests covering:

1. **Happy Path**: Expected inputs produce expected outputs
2. **Edge Cases**: Empty inputs, single message, no delimiters
3. **Error Handling**: Invalid inputs, malformed data
4. **Performance**: Large datasets, stress testing

### Integration Tests

Test the full pipeline with real-world log formats:

1. **Apache Access Logs**
   ```
   127.0.0.1 - - [10/Oct/2000:13:55:36 -0700] "GET /apache_pb.gif HTTP/1.0" 200 2326
   ```
   Expected: `%{clientip} %{ident} %{auth} [%{timestamp}] "%{request}" %{status} %{bytes}`

2. **Syslog**
   ```
   Mar 10 15:45:23 hostname sshd[12345]: Accepted password for user from 192.168.1.1
   ```
   Expected: `%{month} %{day} %{time} %{hostname} %{process}[%{pid}]: %{message}`

3. **Custom Delimited Logs**
   ```
   2024-01-15|INFO|UserService|User login successful|user_id=123
   ```
   Expected: `%{date}|%{level}|%{service}|%{message}|%{metadata}`

### Test Data Sources

- [ ] Use `@kbn/sample-log-parser` for realistic log generation
- [ ] Create synthetic edge cases
- [ ] Include logs with variable whitespace
- [ ] Include logs with nested structures
- [ ] Include logs with no clear delimiters

### Performance Tests

```typescript
describe('Performance', () => {
  it('handles 1000 messages in < 1 second', () => {
    const messages = generateLogs(1000);
    const start = performance.now();
    extractDissectPatternDangerouslySlow(messages);
    const duration = performance.now() - start;
    expect(duration).toBeLessThan(1000);
  });
  
  it('handles messages with 100+ delimiters', () => {
    const messages = generateComplexLogs(100);
    expect(() => extractDissectPatternDangerouslySlow(messages)).not.toThrow();
  });
});
```

---

## Performance Considerations

### Computational Complexity

| Operation | Complexity | Notes |
|-----------|-----------|-------|
| Find delimiters | O(n × m × k) | n=messages, m=avg length, k=substring sizes |
| Build tree | O(d × n) | d=delimiters, n=messages |
| Extract fields | O(d × n × m) | Substring operations |
| Detect modifiers | O(f × n) | f=fields, n=messages |
| Generate pattern | O(d + f) | Linear in delimiters + fields |

**Overall**: O(n × m × k) dominated by delimiter finding

### Optimization Strategies

1. **Early Exit**: If no common delimiters found, return simple pattern immediately
2. **Memoization**: Cache substring extractions
3. **Parallel Processing**: Analyze messages in chunks (if needed)
4. **Heuristic Pruning**: Limit substring search space based on common patterns
5. **Sample Reduction**: For large datasets, sample representative messages

### Memory Considerations

- Avoid storing all possible substrings
- Use streaming/iterator patterns where possible
- Release references to intermediate data structures

---

## Limitations & Trade-offs

### What Dissect Extraction Does Well

✅ Fast pattern generation for structured logs  
✅ Simple, readable patterns  
✅ Handles variable whitespace gracefully  
✅ No regex knowledge required  
✅ Deterministic results  

### What Dissect Extraction Cannot Do

❌ Handle variable log structure (different delimiters per message)  
❌ Identify data types (IP vs string vs timestamp)  
❌ Parse nested structures without clear delimiters  
❌ Support reference keys (dynamic field names)  
❌ Support append modifiers (combining fields)  

### When to Use Grok Instead

Use `@kbn/grok-heuristics` when:
- Log format varies significantly across messages
- Need to identify specific data types for validation
- Logs have complex nested structures
- Need more flexibility than literal delimiters provide

### Fallback Strategy

```typescript
function extractPattern(messages: string[]) {
  // Try Dissect first (faster)
  const dissectPattern = extractDissectPatternDangerouslySlow(messages);
  
  // If confidence is low, fall back to Grok
  if (dissectPattern.confidence < 0.5) {
    return extractGrokPatternDangerouslySlow(messages);
  }
  
  return dissectPattern;
}
```

---

## Success Criteria

### Phase Completion Criteria

Each phase is complete when:
1. ✅ All tasks implemented
2. ✅ Unit tests pass with >90% coverage
3. ✅ Integration tests pass
4. ✅ Code reviewed and approved
5. ✅ Documentation updated

### Final Acceptance Criteria

The implementation is complete when:
1. ✅ All 7 phases completed
2. ✅ End-to-end tests pass for 10+ real log formats
3. ✅ Performance benchmarks met (<1s for 1000 messages)
4. ✅ No reference keys or append modifiers ever produced
5. ✅ Pattern validation ensures Dissect compatibility
6. ✅ README has complete usage examples
7. ✅ API documentation is comprehensive

---

## Future Enhancements

Potential future improvements (out of scope for initial implementation):

1. **Smart Field Naming**: Use context to suggest meaningful field names (e.g., detect IP addresses and name field "clientip")
2. **Multi-line Support**: Handle log messages spanning multiple lines
3. **Pattern Ranking**: Generate multiple pattern candidates and rank by quality
4. **Interactive Mode**: Allow users to refine patterns with feedback
5. **Hybrid Mode**: Combine Dissect for structure + Grok for specific fields
6. **Pattern Library**: Build repository of common log formats for quick lookup
7. **Streaming Analysis**: Process logs incrementally rather than all at once

---

## Appendix

### Example: Complete Flow

**Input Messages**:
```
1.2.3.4 - - [30/Apr/1998:22:00:52] GET /index.html 200
5.6.7.8 - - [01/May/1998:10:15:30] POST /api/data 201
9.0.1.2 - - [02/May/1998:14:22:18] PUT /update 200
```

**Step 1 - Find Delimiters**:
```
Common sequences: [" - - [", "] ", " "]
```

**Step 2 - Build Tree**:
```
[
  { literal: " - - [", positions: [7,7,7], median: 7 },
  { literal: "] ", positions: [28,28,28], median: 28 },
  { literal: " ", positions: [32,31,31], median: 31 },
  { literal: " ", positions: [44,42,39], median: 42 }
]
```

**Step 3 - Extract Fields**:
```
[
  { name: "field_1", values: ["1.2.3.4", "5.6.7.8", "9.0.1.2"] },
  { name: "field_2", values: ["30/Apr/1998:22:00:52", ...] },
  { name: "field_3", values: ["GET", "POST", "PUT"] },
  { name: "field_4", values: ["/index.html", "/api/data", "/update"] },
  { name: "field_5", values: ["200", "201", "200"] }
]
```

**Step 4 - Detect Modifiers**:
```
field_2: No modifiers needed
All fields: No trailing whitespace variation
No fields to skip
```

**Step 5 - Generate Pattern**:
```
%{field_1} - - [%{field_2}] %{field_3} %{field_4} %{field_5}
```

**Final Output**:
```typescript
{
  pattern: "%{field_1} - - [%{field_2}] %{field_3} %{field_4} %{field_5}",
  fields: [
    { name: "field_1", values: ["1.2.3.4", "5.6.7.8", "9.0.1.2"], position: 0 },
    { name: "field_2", values: [...], position: 14 },
    // ... etc
  ]
}
```

---

## References

- [Elasticsearch Dissect Processor Documentation](https://www.elastic.co/guide/en/elasticsearch/reference/current/dissect-processor.html)
- [Logstash Dissect Filter Plugin](https://www.elastic.co/guide/en/logstash/current/plugins-filters-dissect.html)
- `@kbn/grok-heuristics` package (sibling implementation)
- `@kbn/sample-log-parser` for test data generation
