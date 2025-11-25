# Pattern Collapsing Improvement for Grok Heuristics

## Problem Statement

The grok heuristics currently produce overly specific patterns for error logs with stack traces and multi-line messages. This happens because the algorithm treats variable whitespace as an indicator of meaningful column separation, even when the surrounding patterns are highly generic.

### Example Problem

Given these error logs with stack traces:

```json
[
  {
    "message": "[2025-08-07T09:01:01Z] [ERROR] Traceback (most recent call last): File \"/app/processor.py\", line 112, in process_record user_email = record['user']['email'] KeyError: 'email'",
    "@timestamp": "2025-08-07T09:01:01Z"
  },
  {
    "message": "[2025-08-07T09:01:02Z] [ERROR] TypeError: Cannot read properties of undefined (reading 'name') \n    at getUserName (/app/src/utils.js:12:25)\n    at /app/src/server.js:115:18\n    at Layer.handle [as handle_request] (/app/node_modules/express/lib/router/layer.js:95:5)\n    at next (/app/node_modules/express/lib/router/route.js:144:13)",
    "@timestamp": "2025-08-07T09:01:01Z"
  },
  {
    "message": "[2025-08-07T09:01:03Z] [ERROR] org.springframework.dao.DataIntegrityViolationException: could not execute statement; SQL [n/a]; constraint [null]; nested exception is org.hibernate.exception.ConstraintViolationException: could not execute statement\n    at org.springframework.orm.jpa.vendor.HibernateJpaDialect.convertHibernateAccessException(HibernateJpaDialect.java:276)\n    ... 87 more\nCaused by: org.hibernate.exception.ConstraintViolationException: could not execute statement\n    at org.hibernate.exception.internal.SQLStateConversionDelegate.convert(SQLStateConversionDelegate.java:112)\n    ... 96 more\nCaused by: java.sql.SQLIntegrityConstraintViolationException: ORA-01400: cannot insert NULL into (\"SCHEMA_NAME\".\"TABLE_NAME\".\"COLUMN_NAME\")\n    at oracle.jdbc.driver.T4CTTIoer11.processError(T4CTTIoer11.java:509)\n    ... 112 more",
    "@timestamp": "2025-08-07T09:01:01Z"
  },
  {
    "message": "[2025-08-07T09:01:04Z] [ERROR] System.IO.FileNotFoundException: Could not find file 'C:\\data\\input.txt'.\nFile name: 'C:\\data\\input.txt'\n    at System.IO.__Error.WinIOError(Int32 errorCode, String maybeFullPath)\n    at System.IO.FileStream.Init(String path, FileMode mode, FileAccess access, Int32 rights, Boolean useRights, FileShare share, Int32 bufferSize, FileOptions options, SECURITY_ATTRIBUTES secAttrs, String msgPath, Boolean bFromProxy, Boolean useLongPath, Boolean checkHost)",
    "@timestamp": "2025-08-07T09:01:01Z"
  }
]
```

**Current (overly specific) pattern:**
```grok
\[%{TIMESTAMP_ISO8601:custom.timestamp}\]\s\[%{LOGLEVEL:log.level}\]\s(?<error.message>%{NOTSPACE}\s%{NOTSPACE}\s%{WORD}\s%{WORD}\s%{NOTSPACE}\s%{DATA}\s%{NOTSPACE}\s%{DATA}\s+%{GREEDYDATA})
```

**Expected (simplified) pattern:**
```grok
\[%{TIMESTAMP_ISO8601:custom.timestamp}\]\s\[%{LOGLEVEL:log.level}\]\s%{GREEDYDATA:error.message}
```

## Root Cause Analysis

The issue is in `get_useful_groups.ts` at lines 52-60. The current logic considers any column with **variable whitespace** (where `maxLeading != minLeading` or `maxTrailing != minTrailing`) as a "useful" column that should be preserved separately.

### Current Logic

```typescript
namedColumns.findLastIndex((col) => {
  const leadingWhitespaceRange = col.whitespace.maxLeading - col.whitespace.minLeading;
  const trailingWhitespaceRange = col.whitespace.maxTrailing - col.whitespace.minTrailing;
  return leadingWhitespaceRange > 0 || trailingWhitespaceRange > 0;
})
```

This works well for structured logs where variable whitespace indicates intentional alignment:
```
Different Service started...
Length    Service started...  (variable whitespace = alignment indicator)
```

However, it fails for generic patterns like `DATA` and `GREEDYDATA` where:
1. These patterns **already match whitespace** when used greedily
2. Variable whitespace between generic patterns is just noise, not structure
3. Having `%{DATA}\s+%{DATA}` is redundant when both can be collapsed to a single `%{GREEDYDATA}`

## Solution Design

### Core Principle

**Variable whitespace should only preserve column separation when at least one adjacent pattern is specific enough to warrant it.**

Patterns like `LOGLEVEL`, `IP`, `TIMESTAMP`, `WORD`, `NOTSPACE` are specific and meaningful. Patterns like `DATA` and `GREEDYDATA` are generic catch-alls.

### Implementation Strategy

Update the variable whitespace check in `get_useful_groups.ts` to:

1. **Keep existing behavior** for specific patterns (e.g., `WORD`, `NOTSPACE`, `LOGLEVEL`)
2. **Add new logic** to ignore variable whitespace when surrounded by highly generic patterns

### Pseudo-code

```typescript
function shouldPreserveColumnDueToWhitespace(col, index, allColumns) {
  const hasVariableWhitespace = /* existing check */;
  
  if (!hasVariableWhitespace) {
    return false;
  }
  
  // NEW: Check if this column and its neighbors are highly generic
  const currentIsGeneric = isHighlyGeneric(col);
  const prevIsGeneric = index > 0 && isHighlyGeneric(allColumns[index - 1]);
  const nextIsGeneric = index < allColumns.length - 1 && isHighlyGeneric(allColumns[index + 1]);
  
  // Collapse if current column is generic AND adjacent to another generic column
  if (currentIsGeneric && (prevIsGeneric || nextIsGeneric)) {
    return false; // Don't preserve - let it collapse
  }
  
  return true; // Preserve - variable whitespace is meaningful
}

function isHighlyGeneric(column) {
  return column.tokens.every(token => 
    isNamedField(token) && (token.component === 'DATA' || token.component === 'GREEDYDATA')
  );
}
```

### Pattern Categories

| Pattern | Category | Preserve with Variable Whitespace? |
|---------|----------|-------------------------------------|
| `LOGLEVEL`, `IP`, `TIMESTAMP`, `UUID` | Specific | ✅ Yes |
| `WORD`, `NOTSPACE` | Moderately specific | ✅ Yes |
| `DATA` | Generic | ❌ No (if adjacent to DATA/GREEDYDATA) |
| `GREEDYDATA` | Generic | ❌ No (if adjacent to DATA/GREEDYDATA) |

## Expected Outcomes

### Scenario 1: Generic patterns with variable whitespace
**Input:** `%{DATA}\s+%{DATA}\s%{GREEDYDATA}`  
**Output:** `%{GREEDYDATA}` (collapsed)

### Scenario 2: Mixed specific and generic patterns
**Input:** `%{LOGLEVEL}\s+%{DATA}`  
**Output:** `%{LOGLEVEL}\s+%{DATA}` (preserved - LOGLEVEL is specific)

### Scenario 3: Specific patterns with variable whitespace
**Input:** `%{WORD}\s+%{WORD}`  
**Output:** `%{WORD}\s+%{WORD}` (preserved - WORD is specific)

### Scenario 4: Existing test case (should still pass)
**Input:** Different-length words with alignment  
**Output:** `%{WORD}\s+%{GREEDYDATA}` (preserved - WORD is specific)

## Testing Strategy

1. **New test case:** Error logs with stack traces (currently failing)
2. **Regression test:** Ensure existing "retains fields surrounded by variable whitespace" test still passes
3. **Edge case tests:**
   - DATA + DATA with variable whitespace → collapse
   - WORD + DATA with variable whitespace → preserve
   - LOGLEVEL + GREEDYDATA with variable whitespace → preserve

## Implementation Steps

1. Add helper function `isHighlyGenericColumn()` to `get_useful_groups.ts`
2. Update the variable whitespace check logic (lines 52-60)
3. Add comprehensive test cases
4. Run existing tests to ensure no regressions
5. Document the new behavior

## Files to Modify

- `x-pack/platform/packages/shared/kbn-grok-heuristics/src/tokenization/get_useful_groups.ts`
- `x-pack/platform/packages/shared/kbn-grok-heuristics/src/tokenization/extract_grok_pattern.test.ts`

## Future Considerations

After implementing this heuristic improvement:
1. Run evaluations to compare pattern quality
2. Consider if the LLM review prompt needs additional tweaking
3. Monitor real-world usage to see if further collapsing rules are needed

## References

- Issue discussion: Variable whitespace with generic patterns
- Existing logic: `get_useful_groups.ts` lines 52-72
- Test suite: `extract_grok_pattern.test.ts`
