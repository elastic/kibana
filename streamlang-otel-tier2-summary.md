# Streamlang OTel Tier 2 Processors — Feasibility Summary

**Date:** 2026-04-22
**Collector version tested:** otelcol-contrib v0.150.0-dev
**Method:** Live arshile integration tests. Each claim is backed by a test case in the individual report.

---

## Bottom Line

All three processors are implementable. Coverage rises from **17/23 (74%) to 20/23 (87%)** once they are coded.

| Processor | Verdict | Blocking gaps | Detail report |
|-----------|---------|--------------|---------------|
| `math` | ✅ Implementable — one design constraint, one high-severity semantic divergence | None blocking; integer division mitigation required | `streamlang-otel-tier2-math.md` |
| `sort` | ✅ Fully implementable — no semantic gaps for common cases | None | `streamlang-otel-tier2-sort.md` |
| `remove_by_prefix` | ✅ Implementable for flat OTLP keys — one documented semantic divergence | None blocking; always emit a warning | `streamlang-otel-tier2-remove-by-prefix.md` |

---

## `math`

### OTTL translation

Walk the TinyMath AST and emit OTTL inline expressions:

| TinyMath node | OTTL output |
|---|---|
| `number n` | `n` |
| `TinymathVariable { value: 'f' }` | `log.attributes["f"]` |
| `add / subtract / multiply / divide` | `(a + b)`, `(a - b)`, `(a * b)`, `(a / b)` |
| `log(x)` | `Log(x)` — case-sensitive |
| `lt / gt / eq / neq / lte / gte` | Two-statement pattern (see below) |

For `ignore_missing: true`, add a `where` guard enumerating every referenced field:
```
set(log.attributes["total"], log.attributes["a"] * log.attributes["b"])
  where (log.attributes["a"] != nil) and (log.attributes["b"] != nil)
```

### Comparison expressions — two-statement pattern (design constraint)

OTTL grammar rejects `<`, `>`, `==`, `!=`, `<=`, `>=` in a `set()` value position. Storing a boolean comparison result requires two statements:
```
set(log.attributes["is_cheap"], false)
set(log.attributes["is_cheap"], true) where log.attributes["price"] < 20
```
This is a code-generation concern only — not a blocker.

### Semantic divergences

| Gap | Severity | Detail |
|-----|----------|--------|
| **Integer division truncates** | 🔴 High | `10 / 3` on `intValue` attrs → `3` in OTTL; TinyMath/Painless → `3.333…`. **Mitigation: wrap division operands with `Double()` in generated OTTL.** This is required for correctness. |
| Division by zero | 🟡 Medium | OTTL: warn + skip statement (field absent). Painless: returns `Infinity`. |
| `Log(0)` / `Log(-1)` | 🟢 Low | OTTL: warn + skip. Painless: returns `-Infinity` / `NaN`. |
| Missing field without guard | 🟢 Low | OTTL (`error_mode: ignore`): warn + skip. Painless: throws, drops document. Emit a note when `ignore_missing: false`. |

---

## `sort`

### OTTL translation

```
# in-place
set(log.attributes["field"], Sort(log.attributes["field"], "asc"))

# separate target
set(log.attributes["to"], Sort(log.attributes["from"], "asc"))

# ignore_missing: true
set(log.attributes["field"], Sort(log.attributes["field"], "asc"))
  where log.attributes["field"] != nil

# ignore_missing + where condition
set(log.attributes["field"], Sort(log.attributes["field"], "asc"))
  where log.attributes["field"] != nil and <conditionToOttl(where)>
```

`order` maps directly: `'asc'` → `"asc"`, `'desc'` → `"desc"`.

### Numeric ordering confirmed

| Array type | Ordering | Matches ES ingest? |
|------------|----------|-------------------|
| `string` | Lexicographic | ✅ Yes |
| `int` (homogeneous) | **Numeric** | ✅ Yes |
| `double` (homogeneous) | **Numeric** | ✅ Yes |
| mixed int + string | String-coerced | ⚠️ Both undefined — document as unsupported |

Integer arrays sort numerically in OTTL — this was the key open question. `[3, 1, 10, 2]` → `[1, 2, 3, 10]` (not `[1, 10, 2, 3]`).

### Semantic divergences

| Gap | Severity | Detail |
|-----|----------|--------|
| Non-array field passed to `Sort()` | 🟢 Low | OTTL: silent no-op. ES ingest strict mode: error. More permissive — document. |
| Mixed-type arrays | 🟢 Low | Both systems have undefined behavior — document as unsupported, no action needed. |

---

## `remove_by_prefix`

### OTTL translation

```typescript
// TypeScript regex construction in transpiler:
const escapeRegex = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const prefixToRegex = (from: string): string => `^${escapeRegex(from)}($|\\..*)`;

// Emits:
// delete_matching_keys(log.attributes, "^<escaped_from>($|\\..*)")
```

Examples:

| DSL `from` | Generated OTTL |
|------------|---------------|
| `tmp` | `delete_matching_keys(log.attributes, "^tmp($|\\..*)")` |
| `user.meta` | `delete_matching_keys(log.attributes, "^user\\.meta($|\\..*)")` |
| `host` | `delete_matching_keys(log.attributes, "^host($|\\..*)")` |

The `($|\\..*)` suffix is the critical piece: `$` matches the exact key; `\\..*` matches a dot followed by any children. This prevents `host` from matching `hostname` — tested explicitly in Test 4 and Test 8.

### All test cases passed

| Test | Input | Result |
|------|-------|--------|
| Exact key + children | `tmp`, `tmp.foo`, `tmp.bar`, `keep` | `tmp`/`tmp.foo`/`tmp.bar` deleted ✅ |
| Exact key only | `tmp`, `other` | `tmp` deleted ✅ |
| Children only | `tmp.foo`, `tmp.bar`, `other` | children deleted ✅ |
| No false positives | `tmp`, `tmp.foo`, `tmpother`, `nottmp` | only `tmp`/`tmp.foo` deleted ✅ |
| No-op | no matching keys | no changes, no error ✅ |
| Nested dotted prefix | `a.b`, `a.b.c`, `a.b.c.d`, `a.bc`, `a` | first three deleted ✅ |
| Dots in prefix | `user.meta`, `user.metadata`, `user.meta.id` | `.meta` and `.meta.id` deleted ✅ |
| Single-segment | `host`, `host.name`, `host.os`, `hostname` | first three deleted ✅ |

### Semantic divergence — `kvlistValue` nested attributes

| Scenario | OTTL | Painless |
|----------|------|---------|
| Flat key `tmp.foo` | Deleted ✅ | Deleted ✅ |
| `tmp` is a `kvlistValue` containing `foo` | ❌ Not deleted | Deleted (navigates into Map) |

`delete_matching_keys` only sees top-level attribute keys. It does not recurse into `kvlistValue` structures. Modern OTel instrumentation uses flat dotted keys (`log.attributes["http.request.method"]`), not nested `kvlistValue` — so this gap is unlikely to surface in practice.

**Always emit a transpiler warning** about the kvlistValue limitation. No way to statically detect whether a field will be stored as flat keys or kvlist.

---

## Implementation Checklist

For each processor, the work is:

### `math`
- [ ] New file: `processors/math.ts` — walk TinyMath AST → OTTL inline expression
- [ ] Handle comparison expressions: detect top-level comparison function, emit two statements
- [ ] Handle `ignore_missing`: extract field references from AST, join as `where (f1 != nil) and (f2 != nil)`
- [ ] Division: always wrap dividend and divisor with `Double()` when either operand could be integer (`Double(a) / Double(b)`)
- [ ] Wire up in `conversions.ts` (remove from `UNSUPPORTED_REASONS`, add `case 'math'`)
- [ ] Unit tests: arithmetic, Log, comparison, ignore_missing, division wrapping
- [ ] Integration test in `transpile_arshile.test.ts`

### `sort`
- [ ] New file: `processors/sort.ts` — emit `set(target, Sort(source, order))`
- [ ] Handle `to` optional (defaults to in-place)
- [ ] Handle `ignore_missing`: append `where log.attributes["from"] != nil`
- [ ] Handle `where` condition: combine with nil guard if both present
- [ ] Wire up in `conversions.ts`
- [ ] Unit tests + arshile integration test

### `remove_by_prefix`
- [ ] New file: `processors/remove_by_prefix.ts` — emit `delete_matching_keys(log.attributes, prefixToRegex(from))`
- [ ] Always emit kvlistValue warning
- [ ] Wire up in `conversions.ts`
- [ ] Unit tests + arshile integration test
