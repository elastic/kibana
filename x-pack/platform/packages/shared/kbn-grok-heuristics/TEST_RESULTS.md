# Test Results: Pattern Collapsing Test Case

## Test Case Added

A new test case has been added to `extract_grok_pattern.test.ts` that demonstrates the current problem with overly specific patterns for error logs with stack traces.

### Test Name
`collapses generic patterns with variable whitespace`

### Test Location
`x-pack/platform/packages/shared/kbn-grok-heuristics/src/tokenization/extract_grok_pattern.test.ts` (lines 50-82)

## Current Behavior (Test FAILS as expected)

### Input
Error logs with multi-line stack traces:
```
[2025-08-07T09:01:01Z] [ERROR] Traceback (most recent call last): File "/app/processor.py", line 112...
[2025-08-07T09:01:02Z] [ERROR] TypeError: Cannot read properties of undefined...
[2025-08-07T09:01:03Z] [ERROR] org.springframework.dao.DataIntegrityViolationException...
[2025-08-07T09:01:04Z] [ERROR] System.IO.FileNotFoundException: Could not find file...
```

### Actual Output (Current Heuristics)
```javascript
[
  '[',
  'TIMESTAMP_ISO8601',
  ']',
  '\\s',
  '[',
  'LOGLEVEL',
  ']',
  '\\s',
  'NOTSPACE',      // ← Start of overly specific pattern
  '\\s',
  'NOTSPACE',
  '\\s',
  'WORD',
  '\\s',
  'WORD',
  '\\s',
  'NOTSPACE',
  '\\s',
  'DATA',
  '\\s',
  'NOTSPACE',
  '\\s',
  'DATA',
  '\\s+',          // ← Variable whitespace
  'GREEDYDATA',    // ← End with GREEDYDATA anyway
]
```

### Expected Output (After Fix)
```javascript
[
  '[',
  'TIMESTAMP_ISO8601',
  ']',
  '\\s',
  '[',
  'LOGLEVEL',
  ']',
  '\\s',
  'GREEDYDATA',    // ← All error message content collapsed into one pattern
]
```

## Analysis

The test confirms that:

1. **Problem exists**: The heuristics produce 16 extra tokens when they could use a single `GREEDYDATA`
2. **Pattern progression**: The pattern includes `NOTSPACE → WORD → DATA → GREEDYDATA`, showing decreasing specificity
3. **Variable whitespace**: The `\s+` between `DATA` and `GREEDYDATA` is the trigger - variable whitespace causes the algorithm to keep columns separate
4. **Redundancy**: Having multiple generic patterns (`DATA`, `NOTSPACE`) separated by whitespace before ending with `GREEDYDATA` is redundant

## Why This Happens

The current logic in `get_useful_groups.ts` (lines 52-60) preserves any column that has variable whitespace:

```typescript
namedColumns.findLastIndex((col) => {
  const leadingWhitespaceRange = col.whitespace.maxLeading - col.whitespace.minLeading;
  const trailingWhitespaceRange = col.whitespace.maxTrailing - col.whitespace.minTrailing;
  return leadingWhitespaceRange > 0 || trailingWhitespaceRange > 0;
})
```

This makes sense for structured data but not for generic patterns that already match whitespace.

## Next Steps

Implement the solution described in `PATTERN_COLLAPSING_IMPROVEMENT.md`:

1. Add logic to detect when columns contain highly generic patterns (`DATA`, `GREEDYDATA`)
2. Ignore variable whitespace when both adjacent columns are highly generic
3. Preserve variable whitespace when at least one adjacent column is specific

Once implemented, this test should pass with the expected simplified pattern.

## Running the Test

```bash
yarn test:jest x-pack/platform/packages/shared/kbn-grok-heuristics/src/tokenization/extract_grok_pattern.test.ts --testNamePattern="collapses generic patterns with variable whitespace"
```

**Current Status**: ❌ FAILS (as expected - demonstrates the problem)  
**Expected After Fix**: ✅ PASSES
