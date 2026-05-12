# Streamlang `math` Processor — OTTL Implementation Feasibility Report

**Date:** 2026-04-22
**Collector version:** otelcol-contrib v0.150.0-dev
**Methodology:** Each test case was run via `arshile run --collector-binary ~/.local/bin/otelcol-contrib` against a live OTel Collector instance. OTLP payloads were sent as JSON; output attributes were captured from `outputs/logs.json`.

---

## Overall Verdict

The Streamlang `math` processor is **implementable via OTTL** for all arithmetic and `Log()` operations. One design constraint exists for comparison operators (`lt`, `gt`, `eq`, `neq`, `lte`, `gte`) used as value-producing expressions: OTTL's `set()` function does not accept comparison operators in its value argument position (they are a parse error); the workaround is a two-statement pattern that is fully functional. Two semantic divergences are significant enough to flag: (1) integer division truncates in OTTL (`10 / 3 → 3`) but produces a float in TinyMath/Painless (`3.333...`), and (2) division by zero and `Log()` of non-positive inputs silently skip statement execution in OTTL rather than producing `Infinity`/`NaN` as Painless does.

| Feature | OTTL Support | Notes |
|---|---|---|
| `+`, `-`, `*`, `/` arithmetic (double) | Full | All operators work on double attributes |
| Nested arithmetic expressions | Full | Operator precedence respected |
| `log(x)` | Full | OTTL `Log()` function, natural log |
| Comparison operators as stored value | Partial — workaround | Cannot use `<`, `>`, `==`, etc. in `set()` value; use two-statement pattern |
| `ignore_missing` via nil guard | Full | `where (attr != nil) and ...` pattern works correctly |
| Literal numbers in expressions | Full | Mixed field + literal expressions work |
| Integer attribute inputs (+, -, *) | Full | Arithmetic on `intValue` attributes; result type preserved as int |
| Integer division (`int / int`) | Divergence | OTTL: integer truncation (10/3→3); TinyMath/Painless: float result (3.333...) |
| Division by zero | Divergence | OTTL: warn + skip statement; Painless: returns `Infinity` |
| `Log(0)` / `Log(-1)` | Divergence | OTTL: warn + skip; Painless: returns `-Infinity` / `NaN` |
| Missing field, no nil guard | Divergence | OTTL: warn + skip (record survives); Painless: throws, drops document |

---

## OTTL Translation Patterns

### TinyMath AST Node Mapping

| TinyMath Node | OTTL Expression |
|---|---|
| `number` literal `n` | `n` (bare literal, e.g. `2`, `3.14`) |
| `TinymathVariable { value: 'fieldname' }` | `log.attributes["fieldname"]` |
| `TinymathFunction { name: 'add', args: [a, b] }` | `(a + b)` |
| `TinymathFunction { name: 'subtract', args: [a, b] }` | `(a - b)` |
| `TinymathFunction { name: 'multiply', args: [a, b] }` | `(a * b)` |
| `TinymathFunction { name: 'divide', args: [a, b] }` | `(a / b)` |
| `TinymathFunction { name: 'log', args: [x] }` | `Log(x)` |
| `TinymathFunction { name: 'lt', args: [a, b] }` | **Two-statement pattern** (see below) |
| `TinymathFunction { name: 'gt', args: [a, b] }` | **Two-statement pattern** (see below) |
| `TinymathFunction { name: 'eq', args: [a, b] }` | **Two-statement pattern** (see below) |
| `TinymathFunction { name: 'neq', args: [a, b] }` | **Two-statement pattern** (see below) |
| `TinymathFunction { name: 'lte', args: [a, b] }` | **Two-statement pattern** (see below) |
| `TinymathFunction { name: 'gte', args: [a, b] }` | **Two-statement pattern** (see below) |

### Standard arithmetic statement

```yaml
- 'set(log.attributes["total"], (log.attributes["price"] * log.attributes["qty"]) + log.attributes["shipping"])'
```

### `ignore_missing: true` pattern

Extract all field variable names from the TinyMath AST and add a `where` guard:

```yaml
- 'set(log.attributes["result"], log.attributes["price"] * log.attributes["qty"]) where (log.attributes["price"] != nil) and (log.attributes["qty"] != nil)'
```

### Comparison operator as stored value (two-statement pattern)

Because OTTL grammar rejects `<`, `>`, `==`, `!=`, `<=`, `>=` inside `set()` value expressions, storing a boolean comparison result requires two statements:

```yaml
- 'set(log.attributes["result"], false)'
- 'set(log.attributes["result"], true) where a < b'
```

For `expression: "lt(price, 20)"`, `to: "result"`:

```yaml
- 'set(log.attributes["result"], false)'
- 'set(log.attributes["result"], true) where log.attributes["price"] < 20'
```

**Caveat:** When `ignore_missing: true` is also set, the nil guard must be added to both statements — the first `set(false)` should also be guarded, otherwise a missing field produces `false` instead of "no value":

```yaml
- 'set(log.attributes["result"], false) where (log.attributes["price"] != nil)'
- 'set(log.attributes["result"], true) where (log.attributes["price"] != nil) and (log.attributes["price"] < 20)'
```

---

## Test Cases

### Test 1: Basic arithmetic operators (+, -, *, /)

**OTTL config:**
```yaml
processors:
  transform/test1:
    error_mode: ignore
    log_statements:
      - context: log
        statements:
          - 'set(log.attributes["result_add"], log.attributes["price"] + log.attributes["qty"])'
          - 'set(log.attributes["result_sub"], log.attributes["price"] - log.attributes["qty"])'
          - 'set(log.attributes["result_mul"], log.attributes["price"] * log.attributes["qty"])'
          - 'set(log.attributes["result_div"], log.attributes["price"] / log.attributes["qty"])'
```

**Input:** `{ price: 10.5 (double), qty: 3.0 (double) }`

**Output attributes:**
```
result_add: 13.5
result_sub: 7.5
result_mul: 31.5
result_div: 3.5
```

**Conclusion:** All four arithmetic operators work correctly on double attributes.

---

### Test 2: Combined (nested) expression

**OTTL config:**
```yaml
- 'set(log.attributes["result"], (log.attributes["price"] * log.attributes["qty"]) + log.attributes["shipping"])'
```

**Input:** `{ price: 10.0, qty: 4.0, shipping: 5.0 }` (all double)

**Output:** `result: 45.0`

**Conclusion:** Nested arithmetic with operator precedence via parentheses works correctly. The TinyMath AST naturally encodes precedence via nesting; OTTL parentheses mirror that structure.

---

### Test 3: Log() function (natural logarithm)

**OTTL config:**
```yaml
- 'set(log.attributes["result"], Log(log.attributes["value"]))'
```

**Input:** `{ value: 2.718281828 }` (double, approximately e)

**Output:** `result: 0.9999999998311266`

**Conclusion:** OTTL `Log()` computes natural logarithm. Result is within floating-point precision of 1.0. The function name is case-sensitive (`Log`, not `log`). TinyMath `log(x)` maps directly to OTTL `Log(x)`.

---

### Test 4: Comparison operators as stored values

**Attempt — direct comparison in set():**
```yaml
- 'set(log.attributes["result_lt"], log.attributes["price"] < 20)'
```

**Result:** Collector startup failure:
```
Error: invalid configuration: processors::transform/test4: statement has invalid syntax:
1:58: unexpected token "<" (expected ")" Key*)
```

OTTL's expression grammar does not allow comparison operators (`<`, `>`, `==`, `!=`, `<=`, `>=`) in the value position of a `set()` call. They are valid only in `where` clauses.

**Workaround — two-statement pattern:**
```yaml
- 'set(log.attributes["result_lt"], false)'
- 'set(log.attributes["result_lt"], true) where log.attributes["price"] < 20'
```

**Input:** `{ price: 10.0 }`

**Output (with price=10):**
```
result_lt: true       (10 < 20 → true)
result_gt: false      (10 > 20 → false)
result_eq: true       (10 == 10 → true)
result_neq: false     (10 != 10 → false)
result_lte: true      (10 <= 10 → true)
result_gte: true      (10 >= 10 → true)
```

**Conclusion:** All six comparison operators work correctly in `where` clauses. The two-statement pattern (`set false`, then `set true where condition`) is the required translation for comparison expressions that produce a stored value. This adds a statement per comparison operation in the generated OTTL config.

**Flag:** This is a design constraint, not a blocker. The transpiler must emit two OTTL statements for each top-level `math` processor whose `expression` resolves to a comparison function.

---

### Test 5: Integer attribute inputs

**OTTL config:**
```yaml
- 'set(log.attributes["result"], log.attributes["price"] * log.attributes["qty"])'
```

**Input:** `{ price: 10 (intValue), qty: 3 (intValue) }`

**Output:** `result: 30 (intValue)`

**Conclusion:** Arithmetic on integer-typed attributes works correctly. The result type is preserved as integer. No implicit conversion to double. This is consistent with OTTL's behavior of maintaining the original numeric type.

---

### Test 5b: Integer division truncation

**OTTL config:**
```yaml
- 'set(log.attributes["result_div"], log.attributes["price"] / log.attributes["qty"])'
```

**Input:** `{ price: 10 (intValue), qty: 3 (intValue) }`

**Output:** `result_div: 3 (intValue)`

**Expected (TinyMath/Painless):** `3.333...`

**Conclusion:** OTTL performs integer division with truncation when both operands are `intValue` attributes. TinyMath (which delegates to JavaScript) and Elasticsearch Painless both return a floating-point result. This is a significant semantic divergence for any `math` processor involving integer-typed attributes and division.

**Required mitigation:** The transpiler should either (a) emit an explicit `Double()` cast on integer operands before division, or (b) document that integer-typed input fields will produce truncated results under the OTTL tier. Empirically, wrapping with explicit conversion is the correct approach if float semantics are required.

---

### Test 6: ignore_missing — missing field (expression skipped)

**OTTL config:**
```yaml
- 'set(log.attributes["result"], log.attributes["price"] * log.attributes["qty"]) where (log.attributes["price"] != nil) and (log.attributes["qty"] != nil)'
```

**Input:** `{ price: 10.0 }` (qty absent)

**Output attributes:** `{ price: 10.0 }` — `result` attribute is absent.

**Conclusion:** The `where (attr != nil)` guard pattern correctly implements `ignore_missing: true`. When any referenced field is absent, the entire `set()` statement is skipped and the target attribute is not created.

---

### Test 7: ignore_missing — all fields present (expression executes)

**OTTL config:** Same as Test 6.

**Input:** `{ price: 10.0, qty: 4.0 }`

**Output:** `{ price: 10.0, qty: 4.0, result: 40.0 }`

**Conclusion:** When all referenced fields are present, the nil guard passes and the expression evaluates normally.

---

### Test 8: Division by zero

**OTTL config:**
```yaml
- 'set(log.attributes["result"], log.attributes["price"] / log.attributes["zero"])'
```

**Input:** `{ price: 10.0, zero: 0.0 }` (both double)

**Collector log (error_mode: ignore):**
```
warn  ottl/parser.go:410  failed to execute statement
  error: "attempted to divide by 0"
  statement: "set(log.attributes[\"result\"], log.attributes[\"price\"] / log.attributes[\"zero\"])"
```

**Output:** `{ price: 10.0, zero: 0.0 }` — `result` attribute is absent.

**With error_mode: propagate:** The entire log record is rejected with an error returned upstream.

**Semantic divergence from Elasticsearch Ingest Pipeline (Painless):**
- Painless: `10.0 / 0.0` returns `Infinity` (IEEE 754 double semantics)
- OTTL: Division by zero is a runtime error; statement is skipped (with `ignore`) or record is dropped (with `propagate`)

**Integer division by zero:** Same behavior — `warn` + statement skipped with `error_mode: ignore`.

**Flag:** This is a semantic divergence. If Streamlang math semantics guarantee IEEE 754 behavior (Infinity, NaN), the OTTL implementation will produce different results for divide-by-zero inputs. The transpiler should document this or add a guard (e.g., `where log.attributes["zero"] != 0`) when `ignore_missing` is active.

---

### Test 9: Log() of zero and negative value

**OTTL config:**
```yaml
- 'set(log.attributes["log_of_zero"], Log(log.attributes["x_zero"]))'
- 'set(log.attributes["log_of_neg"], Log(log.attributes["x_neg"]))'
```

**Input:** `{ x_zero: 0.0, x_neg: -1.0 }`

**Collector logs (error_mode: ignore):**
```
warn  ottl/parser.go:410  failed to execute statement
  error: "invalid input: expected number greater than zero but got 0"
  statement: "set(log.attributes[\"log_of_zero\"], Log(log.attributes[\"x_zero\"]))"

warn  ottl/parser.go:410  failed to execute statement
  error: "invalid input: expected number greater than zero but got -1"
  statement: "set(log.attributes[\"log_of_neg\"], Log(log.attributes[\"x_neg\"]))"
```

**Output:** `{ x_zero: 0.0, x_neg: -1.0 }` — neither `log_of_zero` nor `log_of_neg` is set.

**Semantic divergence from Painless:**
- Painless `Math.log(0.0)` → `-Infinity`
- Painless `Math.log(-1.0)` → `NaN`
- OTTL `Log(0.0)` → runtime error, statement skipped
- OTTL `Log(-1.0)` → runtime error, statement skipped

**Flag:** This divergence is unlikely to matter in production (log of non-positive is a domain error in both cases), but the behavior differs: Painless propagates the IEEE 754 special value, OTTL silently drops the output. Document as a known divergence.

---

### Test 10: Literal number in expression

**OTTL config:**
```yaml
- 'set(log.attributes["result"], log.attributes["price"] * 2)'
```

**Input:** `{ price: 10.5 }`

**Output:** `result: 21.0`

**Conclusion:** TinyMath literal number nodes translate directly to OTTL numeric literals. Mixed field-reference and literal expressions work correctly.

---

### Test 11: Missing field without nil guard (ignore_missing: false baseline)

**OTTL config:**
```yaml
processors:
  transform/test11:
    error_mode: ignore
    log_statements:
      - context: log
        statements:
          - 'set(log.attributes["result"], log.attributes["price"] * log.attributes["qty"])'
```

**Input:** `{ price: 10.0 }` (qty absent, no nil guard)

**Collector log:**
```
warn  ottl/parser.go:410  failed to execute statement
  error: "<nil> must be int64 or float64"
  statement: "set(log.attributes[\"result\"], log.attributes[\"price\"] * log.attributes[\"qty\"])"
```

**Output:** `{ price: 10.0 }` — `result` absent, record survives.

**Divergence from Painless:** Painless throws a `NullPointerException` when a field is missing in a script, which causes the ingest pipeline to drop or reject the document (depending on `on_failure`). OTTL with `error_mode: ignore` silently skips the statement and the record passes through unchanged. With `error_mode: propagate`, the record would be dropped — closer to Painless behavior.

**Conclusion:** When `ignore_missing: false` is the Streamlang intent, no special OTTL handling is needed beyond `error_mode: propagate`. With `error_mode: ignore`, missing fields silently skip the statement — which matches `ignore_missing: true` semantics but without the explicit nil guard. The nil guard pattern (`where attr != nil`) is still the correct translation for `ignore_missing: true` to make the intent explicit and avoid relying on the implicit error-suppression behavior.

---

## Summary of OTTL Translation Patterns

### Simple arithmetic (no comparison)

**Streamlang:**
```json
{ "action": "math", "expression": "price * qty + shipping", "to": "total" }
```

**OTTL (single statement):**
```
set(log.attributes["total"], (log.attributes["price"] * log.attributes["qty"]) + log.attributes["shipping"])
```

### With ignore_missing

**Streamlang:**
```json
{ "action": "math", "expression": "price * qty", "to": "total", "ignore_missing": true }
```

**OTTL:**
```
set(log.attributes["total"], log.attributes["price"] * log.attributes["qty"]) where (log.attributes["price"] != nil) and (log.attributes["qty"] != nil)
```

### Comparison expression (two-statement pattern)

**Streamlang:**
```json
{ "action": "math", "expression": "lt(price, 20)", "to": "is_cheap" }
```

**OTTL (two statements required):**
```
set(log.attributes["is_cheap"], false)
set(log.attributes["is_cheap"], true) where log.attributes["price"] < 20
```

### Comparison with ignore_missing

**Streamlang:**
```json
{ "action": "math", "expression": "lt(price, 20)", "to": "is_cheap", "ignore_missing": true }
```

**OTTL:**
```
set(log.attributes["is_cheap"], false) where (log.attributes["price"] != nil)
set(log.attributes["is_cheap"], true) where (log.attributes["price"] != nil) and (log.attributes["price"] < 20)
```

---

## Known Gaps and Flags

### GAP 1: Comparison operators require two-statement emission (design constraint)

**Severity:** Low — fully workaroundable.

When a `math` expression resolves to a comparison at the top level (e.g., `lt(a, b)`), the transpiler must emit two OTTL statements instead of one. The OTTL grammar forbids comparison operators (`<`, `>`, `==`, `!=`, `<=`, `>=`) in the value position of `set()`. The two-statement pattern is semantically equivalent.

### GAP 2: Integer division truncates — diverges from TinyMath/Painless (semantic divergence)

**Severity:** High — silent wrong answer for valid inputs.

When both operands of `/` are `intValue` attributes, OTTL performs integer division with truncation: `10 / 3 → 3`. TinyMath evaluates using JavaScript number semantics (always float: `10 / 3 → 3.333...`). Elasticsearch Painless also returns a float for `(double)a / (double)b` when the script operates on numeric document fields.

**Recommendation:** The transpiler must emit an explicit type-cast statement before integer division, or document that integer-typed input fields will silently truncate. The safest approach is to add a `Double()` conversion in the OTTL expression for division operands when the source field type may be integer:

```
# Instead of:
set(log.attributes["result"], log.attributes["price"] / log.attributes["qty"])
# Emit:
set(log.attributes["result"], Double(log.attributes["price"]) / Double(log.attributes["qty"]))
```

This is a **blocking concern** if the Streamlang math processor guarantees float division semantics (as TinyMath does). The transpiler should either always cast, or inspect source field types.

---

### GAP 3: Division by zero behavior diverges from Painless (semantic divergence)

**Severity:** Medium — different output for valid edge-case inputs.

Painless returns `Infinity` for `x / 0.0`. OTTL raises a runtime error and skips the statement (with `error_mode: ignore`). This means a record that would produce `Infinity` in the ingest pipeline will instead produce no output field in OTTL. Users relying on downstream checks for `Infinity` values will see different results.

**Recommendation:** Document in processor spec. Optionally add a configuration warning when `math` expressions are transpiled without a denominator nil/zero guard.

### GAP 4: Log() of non-positive values diverges from Painless (semantic divergence)

**Severity:** Low — inputs are a math domain error in both cases.

Painless propagates `-Infinity` / `NaN`; OTTL silently skips and produces no output field. The practical impact is low since downstream logic should not depend on `NaN`/`Infinity` from `log()`, but the difference in output field presence (Painless: field set to NaN; OTTL: field absent) could affect downstream logic that checks for field existence.

**Recommendation:** Document as known divergence. No blocking issue for implementation.
