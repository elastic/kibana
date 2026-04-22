# OTel Collector Processor Compatibility Audit

Audited against opentelemetry-collector-contrib (transform processor v0.120.0+, filter processor v0.146.0+).

---

## Blocking Issues (fix before production use)

| # | Processor | OTelCol Behavior | Expected Streamlang Behavior | Location |
|---|-----------|------------------|------------------------------|----------|
| 1 | `uppercase` | `ToUpperCase` raises a `TypeError` and the statement is skipped (with `error_mode: ignore`) if the attribute is not a string | Field is uppercased for any non-nil value, or an error is surfaced | `processors/uppercase.ts` |
| 2 | `grok` | `pattern_definitions` in the DSL are silently ignored; `ExtractGrokPatterns` runs without custom pattern definitions, potentially failing to match | Custom pattern definitions are forwarded and used during extraction | `processors/grok.ts` |
| 3 | `conditions` | `HasPrefix`/`HasSuffix` raise a runtime error if the field value is not a string — they do not auto-convert unlike `IsMatch` | `startsWith`/`endsWith` conditions work on any field that can be coerced to string | `condition_to_ottl.ts:95,98` |

---

## Semantic Issues (correct behavior, but worth documenting or hardening)

| # | Processor | OTelCol Behavior | Expected Streamlang Behavior | Location |
|---|-----------|------------------|------------------------------|----------|
| 4 | `grok` | `merge_maps` modifies `log.attributes` in-place then returns `nil`; the enclosing `set()` call sees nil and skips — the merge already happened as a side effect | Extracted fields are merged into attributes; accidental reliance on side-effect ordering is fragile | `processors/grok.ts` |
| 5 | `grok` | `namedCapturesOnly` is always `true` regardless of DSL input — numeric capture groups are always excluded | Respects the DSL `named_captures_only` field when provided | `processors/grok.ts` |
| 6 | `rename` | Non-atomic: if `delete_key` fails after `set` succeeds (with `error_mode: ignore`), both source and target fields will exist | Rename is all-or-nothing; source disappears only if target was written | `processors/rename.ts` |

---

## Style Issues (deprecated but functional)

| # | Processor | OTelCol Behavior | Expected Streamlang Behavior | Location |
|---|-----------|------------------|------------------------------|----------|
| 7 | `drop_document` | Accepts the deprecated `logs.log_record` nested format (v0.145.x) but the recommended format since v0.146.0 is the top-level `log_conditions` key | Emitted YAML should use the current documented format | `yaml.ts` `renderFilter()` |

---

## Per-Processor Detail

### `set`
All correct. `set(log.attributes["field"], value)` signature matches the OTTL editor. `nil` is the correct OTTL null literal. Literal encoding (strings, numbers, booleans) is valid. `where` clause syntax is valid. Bare strings in `log_statements` YAML list is the correct format.

### `remove`
All correct. `delete_key(log.attributes, "key")` matches the OTTL editor signature. `delete_key` is a no-op on missing keys, so the presence guard (`!= nil`) correctly preserves ingest-pipeline semantics for `ignore_missing: false`.

### `rename`
No blocking issues. The two-step `set()` + `delete_key()` pattern is the OTel-recommended approach (no atomic OTTL rename exists). See semantic issue #6 above.

### `uppercase`
**Blocking issue #1.** The emitted statement `set(log.attributes["field"], ToUpperCase(log.attributes["field"]))` is syntactically correct OTTL. However, `ToUpperCase` uses `StringGetter` internally and raises a `TypeError` if the attribute is not a string — `nil` has already been filtered by the `where` guard but numeric/boolean attributes are not. With `error_mode: ignore` the field is silently left unchanged.

Fix: add an `IsString(log.attributes["field"])` check to the `where` guard, or document the string-only contract.

A `ConvertCase(field, "upper")` alternative exists but `ToUpperCase` is idiomatic.

### `grok`
**Blocking issue #2** — pattern definitions silently dropped. OTTL `ExtractGrokPatterns` accepts an optional 4th argument: an array of `"NAME=definition"` strings. The DSL `pattern_definitions` map can be forwarded directly. Currently only a warning is emitted.

**Semantic issue #4** — the `set(log.attributes, merge_maps(...))` pattern works due to `merge_maps` modifying the map in-place before returning `nil`. Replace with a direct `merge_maps(log.attributes, ExtractGrokPatterns(...), "upsert")` statement call, which is cleaner and matches the OTTL editor contract.

**Semantic issue #5** — `namedCapturesOnly` (3rd arg to `ExtractGrokPatterns`) is hardcoded `true`. If the `GrokProcessor` type has a `named_captures_only` field it should be forwarded.

Empty-map behavior (no match): `ExtractGrokPatterns` returns an empty map, `merge_maps` with an empty source is a no-op — correct.

### `drop_document` / filter
**Style issue #7.** The `renderFilter` function emits:
```yaml
filter/streamlang:
  error_mode: ignore
  logs:
    log_record:
      - "condition"
```
The modern v0.146.0+ format is:
```yaml
filter/streamlang:
  error_mode: ignore
  log_conditions:
    - "condition"
```
Both are accepted by the collector (the old key is still wired in `config.go`). Update to `log_conditions` for forward compatibility.

OR semantics when multiple `drop_document` steps are merged: a log is dropped if **any** condition matches — this is correct.

`error_mode: ignore` is appropriate; the OTel roadmap plans to make this the default.

### `conditions` (`condition_to_ottl.ts`)
**Blocking issue #3** — `HasPrefix` and `HasSuffix` do not auto-convert their first argument unlike `IsMatch`. If the attribute is not a string, they error. Wrap with `String()`:
```typescript
// current (broken for non-string fields):
`HasPrefix(${field}, ...)`
// fix:
`HasPrefix(String(${field}), ...)`
```

All other condition constructs are correct:
- `nil` is the standard OTTL null keyword
- `String()` is a documented OTTL converter (converts any value to string)
- `IsMatch(field, pattern)` auto-converts and is correct
- `not (expr)` is the standard OTTL negation syntax (no `!` operator)
- Parenthesization with `and`/`or` is valid OTTL

---

## Suggested Fix Priority

1. `condition_to_ottl.ts` lines 95 & 98 — wrap `HasPrefix`/`HasSuffix` first arg in `String()`
2. `processors/grok.ts` — pass `pattern_definitions` as 4th arg to `ExtractGrokPatterns`
3. `processors/grok.ts` — replace `set(log.attributes, merge_maps(...))` with `merge_maps(...)` directly
4. `processors/uppercase.ts` — add `IsString` type guard or document string-only contract
5. `yaml.ts` `renderFilter` — migrate to `log_conditions` key
