# Streamlang `sort` Processor — OTTL Implementation Feasibility

**Test date:** 2026-04-22
**OTel Collector version:** otelcol-contrib v0.150.0-dev
**Arshile version:** current PATH binary
**Test directory:** `/private/tmp/arshile-sort-test`
**OTTL function under test:** `Sort(value, order)` converter

---

## Verdict

**`sort` is fully implementable via OTTL.** The `Sort()` converter handles all core semantics: ascending/descending, in-place mutation, separate target field, `ignore_missing` via `where` guard, and empty/single-element arrays. Numeric types (int, double) sort **numerically** — the same natural ordering that Elasticsearch ingest pipeline uses — so there is no semantic gap for homogeneous arrays.

One edge case requires a transpiler warning: **mixed-type arrays** sort with integers before strings (implementation-defined ordering), which may differ from Elasticsearch ingest behavior. A missing-field (`nil`) passed to `Sort()` logs a `warn`-level error and silently no-ops; this behavior is benign under `error_mode: ignore` but produces log noise unless guarded with `where != nil`.

---

## Recommended OTTL Translation Pattern

```yaml
# Basic in-place sort (no `to` field)
- set(log.attributes["field"], Sort(log.attributes["field"], "asc"))

# With target field (`to` != `from`)
- set(log.attributes["to"], Sort(log.attributes["from"], "asc"))

# With ignore_missing: true (suppress nil error + guard the set)
- set(log.attributes["field"], Sort(log.attributes["field"], "asc")) where log.attributes["field"] != nil

# With user-supplied where condition (conditionToOttl output goes here)
- set(log.attributes["field"], Sort(log.attributes["field"], "asc")) where <compiled-condition>

# Combined: ignore_missing AND user where condition
- set(log.attributes["field"], Sort(log.attributes["field"], "asc")) where log.attributes["field"] != nil and <compiled-condition>
```

**OTTL path prefix note:** The collector auto-rewrites `attributes["x"]` to `log.attributes["x"]` in log context (emitting an info-level log). Use `log.attributes["x"]` explicitly in generated code to suppress this warning.

---

## Test Cases

### Test 1 — String array, ascending

**OTTL config:**
```yaml
transform/test01_strings_asc:
  error_mode: ignore
  log_statements:
    - context: log
      statements:
        - set(attributes["result"], Sort(attributes["arr"], "asc"))
```

**Input payload:**
```json
{"attributes":[{"key":"arr","value":{"arrayValue":{"values":[{"stringValue":"z"},{"stringValue":"a"},{"stringValue":"m"}]}}}]}
```

**Observed output:**
```
arr:    ["z", "a", "m"]  (unchanged)
result: ["a", "m", "z"]
```

**Conclusion:** String array sorts lexicographically ascending. Works correctly.

---

### Test 2 — String array, descending

**OTTL config:**
```yaml
- set(attributes["result"], Sort(attributes["arr"], "desc"))
```

**Input:** `arr = ["z", "a", "m"]`

**Observed output:**
```
result: ["z", "m", "a"]
```

**Conclusion:** Descending sort works correctly.

---

### Test 3 — Integer array, ascending

**OTTL config:**
```yaml
- set(attributes["result"], Sort(attributes["arr"], "asc"))
```

**Input payload:**
```json
{"arrayValue":{"values":[{"intValue":"3"},{"intValue":"1"},{"intValue":"10"},{"intValue":"2"}]}}
```

**Observed output (raw OTLP JSON):**
```json
{"arrayValue":{"values":[{"intValue":"1"},{"intValue":"2"},{"intValue":"3"},{"intValue":"10"}]}}
```

**Ordering:** `[1, 2, 3, 10]` — **numeric order, not lexicographic** (lexicographic would be `[1, 10, 2, 3]`).

**Conclusion:** Integer arrays sort numerically. This matches Elasticsearch ingest pipeline behavior. No semantic gap.

---

### Test 4 — Double/float array, ascending

**OTTL config:**
```yaml
- set(attributes["result"], Sort(attributes["arr"], "asc"))
```

**Input:** `arr = [3.5, 1.1, 10.2, 2.7]`

**Observed output (raw OTLP JSON):**
```json
{"arrayValue":{"values":[{"doubleValue":1.1},{"doubleValue":2.7},{"doubleValue":3.5},{"doubleValue":10.2}]}}
```

**Ordering:** `[1.1, 2.7, 3.5, 10.2]` — **numeric order**.

**Conclusion:** Double arrays sort numerically. Matches ES ingest behavior. No semantic gap.

---

### Test 5 — In-place sort (no `to` field)

**OTTL config:**
```yaml
- set(attributes["tags"], Sort(attributes["tags"], "asc"))
```

**Input:** `tags = ["z", "a", "m"]`

**Observed output:**
```
tags: ["a", "m", "z"]
```

**Conclusion:** In-place sort works: `set(field, Sort(field, order))` correctly overwrites the source field with the sorted result. No separate target field is required.

---

### Test 6 — Sort with `to` field different from `from`

**OTTL config:**
```yaml
- set(attributes["sorted"], Sort(attributes["original"], "asc"))
```

**Input:** `original = ["z", "a", "m"]`

**Observed output:**
```
original: ["z", "a", "m"]  (unchanged)
sorted:   ["a", "m", "z"]
```

**Conclusion:** Setting a separate target field leaves the source intact. `to != from` semantics work as expected.

---

### Test 7 — `ignore_missing: true`, field absent

**OTTL config:**
```yaml
- set(attributes["arr"], Sort(attributes["arr"], "asc")) where attributes["arr"] != nil
```

**Input:** No `arr` field present. Only `other_field = "present"`.

**Observed output:**
```
attrs present: ["other_field"]
arr: (absent)
```

No error logged. No new `arr` field created.

**Conclusion:** The `where attributes["arr"] != nil` guard correctly suppresses execution when the field is absent. This is the right OTTL translation for `ignore_missing: true`. Without this guard, passing `nil` to `Sort()` produces a `warn`-level log: `"sort with unsupported type: '<nil>'. Target is not a list"` and the statement is silently skipped (under `error_mode: ignore`). The guard eliminates the spurious warn log.

---

### Test 8 — `ignore_missing: true`, field present

**OTTL config:**
```yaml
- set(attributes["arr"], Sort(attributes["arr"], "asc")) where attributes["arr"] != nil
```

**Input:** `arr = ["z", "a", "m"]`, `other_field = "present"`

**Observed output:**
```
arr: ["a", "m", "z"]
```

**Conclusion:** When the field is present, the `where != nil` guard passes and the sort runs normally. No behavioral interference from the guard.

---

### Test 9 — Empty array

**OTTL config:**
```yaml
- set(attributes["result"], Sort(attributes["arr"], "asc"))
```

**Input:** `arr = []` (empty `arrayValue`)

**Observed output (raw OTLP JSON):**
```json
{"arrayValue":{}}
```

The output `arrayValue` has no `values` key (not `"values": []`). When deserialized, this is functionally an empty array — the absence of `values` is equivalent to `values: []` in protobuf JSON encoding.

**Conclusion:** `Sort()` handles empty arrays without error and returns an empty array. The serialization quirk (`values` key absent) is a JSON-protobuf encoding detail, not a semantic issue.

---

### Test 10 — Single-element array

**OTTL config:**
```yaml
- set(attributes["result"], Sort(attributes["arr"], "asc"))
```

**Input:** `arr = ["only"]`

**Observed output:**
```
result: ["only"]
```

**Conclusion:** Single-element arrays pass through unchanged, as expected.

---

### Test 11 — Non-array field (string value)

**OTTL config:**
```yaml
- set(attributes["result"], Sort(attributes["arr"], "asc"))
```

**Input:** `arr = "not_an_array"` (stringValue, not arrayValue)

**Observed output:**
```
arr:    "not_an_array"  (unchanged)
result: (absent — field not created)
```

**No error was logged** for this case (unlike the nil case). The `Sort()` converter returned `nil` when given a string, the `set()` was silently skipped.

**Conclusion:** Calling `Sort()` on a non-array field silently no-ops and does not create the target attribute. This is safer than an error. Matches Elasticsearch ingest behavior where a non-array field with `ignore_missing: true` is skipped; without `ignore_missing` ES would throw an error, but OTTL under `error_mode: ignore` always silently skips.

**Transpiler note:** If the Streamlang `sort` processor has `ignore_missing: false` (the default), the ES ingest pipeline will error on a non-array field. OTTL will silently skip it. This is a behavioral gap: OTTL `error_mode: ignore` is more permissive than ES ingest's strict mode. The transpiler should document this in a compatibility comment.

---

### Test 12 — Mixed-type array (string + int)

Two sub-tests were run to discriminate between numeric-within-type ordering and coerced-string ordering.

**OTTL config:**
```yaml
- set(attributes["result"], Sort(attributes["arr"], "asc"))
```

**Sub-test 12a input:**
```json
{"arrayValue":{"values":[{"stringValue":"banana"},{"intValue":"42"},{"stringValue":"apple"}]}}
```

**Sub-test 12a output:**
```json
{"arrayValue":{"values":[{"intValue":"42"},{"stringValue":"apple"},{"stringValue":"banana"}]}}
```

Result: `[42, "apple", "banana"]`

**Sub-test 12b input (discriminator):** `[10, 5, "apple", "banana"]`
- If numeric-within-type: expected `[5, 10, "apple", "banana"]`
- If coerced-string: expected `[10, 5, "apple", "banana"]` (because `"10" < "5"` lexicographically)

**Sub-test 12b output:**
```json
{"arrayValue":{"values":[{"intValue":"10"},{"intValue":"5"},{"stringValue":"apple"},{"stringValue":"banana"}]}}
```

Result: `[10, 5, "apple", "banana"]` — matches coerced-string prediction.

**Conclusion:** Mixed-type arrays are sorted by **string coercion** of all values. Integer `42` sorts before `"apple"` because `"42" < "apple"` lexicographically. Integer `10` sorts before `5` because `"10" < "5"`. This behavior is distinct from homogeneous-int arrays (which sort numerically) and is unlikely to match Elasticsearch ingest behavior. Mixed-type arrays are an edge case with no practical use in Streamlang's sort processor; the transpiler should document this as unsupported.

---

## Numeric vs. Lexicographic Ordering — Summary

| Type | Input | Output | Order |
|------|-------|--------|-------|
| `string` | `["z","a","m"]` | `["a","m","z"]` | Lexicographic |
| `int` | `[3,1,10,2]` | `[1,2,3,10]` | **Numeric** |
| `double` | `[3.5,1.1,10.2,2.7]` | `[1.1,2.7,3.5,10.2]` | **Numeric** |
| `mixed (int+string)` | `["banana",42,"apple"]` | `[42,"apple","banana"]` | Coerced-string (all values compared as strings) |

**Integers sort numerically when the array is homogeneous.** This is the critical finding. For homogeneous `int` and `double` arrays, OTTL `Sort()` produces the same result as Elasticsearch ingest sort — no semantic gap. For string arrays, both systems use lexicographic order — no gap. For mixed-type arrays, OTTL coerces all values to strings before comparing, which is distinct from ES ingest behavior and means integers within a mixed array do NOT sort numerically relative to each other.

---

## Error Behavior Reference

| Scenario | OTTL behavior | ES Ingest behavior | Gap? |
|----------|--------------|-------------------|------|
| Missing field, `ignore_missing: true` | `where != nil` guard: silent skip, no log | Silent skip | None |
| Missing field, no guard | `warn` log + silent skip (error_mode: ignore) | Error (without ignore_missing) — *inferred from ES ingest spec, not tested here* | Severity gap: OTTL is more permissive |
| Non-array field | Silent skip, no `result` created, no error log | Error (unless ignore_failure) — *inferred from ES ingest spec, not tested here* | Severity gap: OTTL is more permissive |
| Empty array | Returns `arrayValue{}`, no error | Returns `[]`, no error | None (serialization cosmetic only) |
| Single element | Returns `["only"]`, no error | Returns `["only"]`, no error | None |
| Mixed types | Sorts with cross-type ordering | Undefined (both systems) | Both undefined |

---

## Transpiler Recommendations

1. **Always use `log.attributes["x"]`** (with `log.` prefix) instead of bare `attributes["x"]` to avoid the auto-rewrite info log.

2. **`ignore_missing: true`** → append `where log.attributes["<from>"] != nil` to the statement. This eliminates the spurious `warn` log and prevents no-op pollution.

3. **`ignore_missing: false`** (default) → do NOT add the nil guard. OTTL under `error_mode: ignore` will still silently skip rather than propagate an error, which is slightly more permissive than ES ingest's behavior. Add a TODO/comment in generated OTTL: `# NOTE: ignore_missing=false not strictly enforced; OTTL silently skips on type mismatch`.

4. **`where` condition** → combine with nil guard using `and`: `where log.attributes["field"] != nil and <conditionToOttl(condition)>`.

5. **Mixed-type arrays** → no special handling needed; document as unsupported in the Streamlang spec, matching ES ingest's own undefined behavior.

6. **`to` field** → use `set(log.attributes["to"], Sort(log.attributes["from"], "asc"))`. Original field is automatically preserved.

7. **`order` parameter** → pass `"asc"` or `"desc"` directly as a string literal to `Sort()`. The OTTL function accepts exactly these two values.
