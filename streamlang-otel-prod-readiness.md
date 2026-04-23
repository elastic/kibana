# Streamlang OTel Collector Transpiler — Production Readiness Assessment

**Date:** 2026-04-22
**Branch:** `streamlang-investigate`
**Scope:** OTel Collector transpiler only (`kbn-streamlang` → `otelcol-contrib` YAML)
**Ingest pipeline and ES|QL transpilers are out of scope.**

---

## Verdict

Processor coverage is **17/23 (74%)** implemented today. A further 3 actions (`math`, `sort`, `remove_by_prefix`) have confirmed OTTL equivalents and are ready to implement, which would bring coverage to **20/23 (87%)**. The remaining 3 (`dissect`, `enrich`, `network_direction`) are hard blocked by OTTL limitations with no viable workaround.

Unsupported actions fail loudly at transpile time — no partial or silently broken configs are produced. `error_mode` is caller-configurable. An arshile-based integration test suite (`transpile_arshile.test.ts`) validates all 17 implemented processors against a live `otelcontribcol v0.150.0-dev` binary and self-skips when the toolchain is not available.

**The remaining work before GA is implementing the 3 Tier 2 processors, surfacing warnings in the UI, and documentation.**

---

## Current Processor Coverage

### Implemented (17 of 23 user-facing actions)

| Action | OTTL translation | Notes |
|--------|-----------------|-------|
| `set` | `set(target, value)` | Handles literal, copy_from, override flag |
| `rename` | `set + delete_key` | Non-atomic; see semantic gaps |
| `remove` | `delete_key` | nil guard unless ignore_missing |
| `grok` | `merge_maps(ExtractGrokPatterns(...))` | 4th-arg pattern defs; live-verified |
| `uppercase` | `ToUpperCase()` | `IsString` guard prevents TypeError |
| `lowercase` | `ToLowerCase()` | `IsString` guard prevents TypeError |
| `trim` | `Trim(value, " ")` | `IsString` guard; `TrimSpace` does not exist in OTTL |
| `replace` | `replace_pattern` editor | 2-statement copy+replace for `to ≠ from` |
| `split` | `Split()` converter | Returns `[]string` attribute |
| `convert` | `Int/Double/String/Bool()` | `integer` and `long` both map to `Int` (64-bit) |
| `redact` | `replace_pattern` per compiled Grok | Compiled via `compileGrokPatternsToRegex` |
| `concat` | `Concat([...], "")` | Literals and fields interleaved; nil guards |
| `join` | `Concat([fields...], delimiter)` | Native delimiter arg; nil guards |
| `drop_document` | `filter` processor | Correct `log_conditions` schema |
| `append` | `append()` editor | Creates array if absent; `allow_duplicates: false` approximated via `IsMatch` |
| `date` | `UnixNano(Time(...))` | Java→Go format translation; `epoch_millis/second` special-cased; `output_format` warns |
| `json_extract` | `ParseJSON` + bracket access | Nested dotted paths, array indices; type conversion; temp attr cleanup |

### Tier 2 — Confirmed implementable, not yet coded (3 actions)

Live arshile testing (2026-04-22, otelcontribcol v0.150.0-dev) confirmed viable OTTL equivalents for all three. Full test evidence in `streamlang-otel-tier2-{math,sort,remove-by-prefix}.md`; cross-processor summary in `streamlang-otel-tier2-summary.md`.

#### `math`

Walk the TinyMath AST and emit OTTL inline expressions. The shared `FUNCTION_REGISTRY` was already restricted to the OTTL-compatible subset (comment in that file: "OTTL is the limiting factor"), so no function gaps exist.

| TinyMath node | OTTL output |
|---|---|
| number literal `n` | `n` |
| variable `f` | `log.attributes["f"]` |
| `add/subtract/multiply/divide` | `(a + b)`, `(a - b)`, `(a * b)`, `(a / b)` |
| `log(x)` | `Log(x)` — case-sensitive |
| `lt/gt/eq/neq/lte/gte` | Two-statement pattern (see below) |

**Comparison expressions — two-statement pattern.** OTTL grammar rejects `<`, `>`, `==`, etc. in a `set()` value position. Storing a boolean result requires:
```
set(log.attributes["is_cheap"], false)
set(log.attributes["is_cheap"], true) where log.attributes["price"] < 20
```

**`ignore_missing: true`** — add a `where` guard for every field referenced in the expression:
```
set(log.attributes["total"], log.attributes["a"] * log.attributes["b"])
  where (log.attributes["a"] != nil) and (log.attributes["b"] != nil)
```

**Key semantic gaps (see Semantic Gaps section for full detail):**
- 🔴 Integer division truncates. Wrap division operands with `Double()` in generated OTTL.
- 🟡 Division by zero and `Log(≤0)` skip silently in OTTL; Painless produces `Infinity`/`NaN`.

#### `sort`

```
# in-place
set(log.attributes["field"], Sort(log.attributes["field"], "asc"))
# separate target
set(log.attributes["to"], Sort(log.attributes["from"], "desc"))
# ignore_missing: true
set(log.attributes["field"], Sort(log.attributes["field"], "asc")) where log.attributes["field"] != nil
```

Homogeneous `int` and `double` arrays sort **numerically** in OTTL — `[3,1,10,2]` → `[1,2,3,10]`. This matches ES ingest behavior. String arrays sort lexicographically. Mixed-type arrays use string coercion (both OTTL and ES ingest have undefined behavior here; document as unsupported).

#### `remove_by_prefix`

```
delete_matching_keys(log.attributes, "^<escaped_prefix>($|\\..*)")
```

TypeScript regex helper for the transpiler:
```typescript
const escapeRegex = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const prefixToRegex = (from: string): string => `^${escapeRegex(from)}($|\\..*)`;
```

The `($|\\..*)` suffix matches the exact key (`$`) or any dotted child (`\\..*`), preventing `host` from matching `hostname` without requiring Go lookahead. All 8 test cases passed including false-positive prevention.

Always emit a warning: `delete_matching_keys` operates on top-level flat attribute keys only. When `from` crosses a `kvlistValue` boundary, OTTL leaves nested keys untouched while the ingest Painless implementation navigates into the nested Map. Modern OTel instrumentation uses flat dotted keys, so this gap is unlikely in practice but cannot be statically detected.

### Tier 3 — Hard blocked (3 actions)

These have no OTTL equivalent. The transpiler throws a descriptive error at transpile time; no partial YAML is produced.

| Action | Reason |
|--------|--------|
| `network_direction` | `NetworkDirection()` is undefined in OTTL — confirmed via live test |
| `dissect` | `ExtractDissectPatterns` is undefined in the OTTL log transform context — confirmed via live test |
| `enrich` | ES enrich policies are an Elasticsearch-native concept with no OTel equivalent — see note below |

`manual_ingest_pipeline` also throws — it is ingest-only by design.

#### `enrich` — portability boundary, acceptable by design

The OTel Collector contrib repo contains a [`lookupprocessor`](https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/processor/lookupprocessor) (community-accepted, `[development]` stability, expected production quality 2026) that is structurally similar: it evaluates an OTTL key expression, queries a lookup source, and writes results as new attributes. However, it has no Elasticsearch enrich policy source and cannot have one in any meaningful sense — ES enrich policies are an Elasticsearch-native concept.

Streamlang DSLs that use `enrich` are simply not portable to the OTel Collector target. The transpiler correctly rejects these pipelines with a hard error. Users authoring OTel-targeted pipelines must avoid `enrich` and use `lookupprocessor` directly if they need enrichment.

---

## Integration Test Infrastructure

`transpile_arshile.test.ts` covers all 17 implemented processors. Each test transpiles a DSL fragment, writes a temp arshile project, replays an OTLP log payload through the live collector, and asserts output attributes.

**Setup:** `go install github.com/andrewvc/arshile@latest` with `otelcol-contrib` on `$PATH` or `OTELCOL_BINARY` set. The suite self-skips when the toolchain is absent.

**What is not covered:** Cross-target parity tests (OTel vs. ingest pipeline output equivalence) do not exist. The arshile suite verifies OTel correctness in isolation. True cross-target regression testing requires a running Elasticsearch stack alongside the collector and is a Scout-level infrastructure concern.

---

## Semantic Gaps

These are documented behavioral divergences from the ingest pipeline, not bugs. They must be disclosed in user-facing documentation before GA.

### `ignore_missing: false` becomes a silent skip

Ingest pipeline raises an error when `ignore_missing: false` and the source field is absent. OTTL has no "error on nil" primitive — the `field != nil` guard silently skips instead of raising. A transpile-time warning is emitted when `ignore_missing: false` is explicit.

### `rename`: copy-then-delete is not atomic

Rename emits `set(target, source)` followed by `delete_key(source)`. Under `error_mode: propagate`, if `delete_key` raises (very unlikely on a path just written), the document exits with both fields populated. OTTL has no atomic rename primitive.

### `grok`: all patterns are evaluated, not first-match

Ingest grok stops at the first matching pattern. The OTel transpiler emits one `ExtractGrokPatterns` statement per pattern; all are evaluated and a later match overwrites earlier captures. A transpile-time warning is emitted when more than one pattern is provided.

### `grok`: `@timestamp` capture name does not extract

go-grok does not sanitize `@` in named capture group names. A pattern like `%{MY_TS:@timestamp}` starts the collector without error but `@timestamp` is silently not populated. A transpile-time warning is emitted.

### `includes` condition and `append allow_duplicates: false` use regex approximation

OTTL has no native list-contains operator. Both are approximated as `IsMatch(String(field), regex_of_value)`. Values containing regex metacharacters can produce false positives. Warnings are emitted.

### `date output_format` is not implementable

OTTL has no time-to-string function. When `output_format` is specified, the parsed date is stored as unix nanoseconds and a warning is emitted.

### `date` with multiple formats requires `error_mode: ignore`

Multiple formats are tried in order via a `target == nil` guard. Under `error_mode: propagate`, a format mismatch propagates rather than falling through to the next format. A warning is emitted when multiple formats are provided.

### `json_extract` numbers are always double

`ParseJSON` stores all JSON numeric values as `doubleValue`. Type conversion with `type: 'integer'` wraps in `Int()` which truncates, but the underlying storage is double until that call.

### `startsWith`/`endsWith` coerce all types to strings

`HasPrefix(String(field), ...)` coerces any field type to its string representation. A boolean `true` matches `startsWith: "t"`.

### `math`: integer division truncates

When both operands of `/` are `intValue` attributes, OTTL performs integer truncation (`10 / 3 → 3`). TinyMath and Painless both return a float (`3.333…`). The transpiler must wrap division operands with `Double()`: `Double(a) / Double(b)`.

### `math`: divide-by-zero and `Log(≤0)` skip silently

Painless propagates IEEE 754 special values (`Infinity`, `NaN`). OTTL raises a runtime error and skips the statement under `error_mode: ignore`, leaving the target field absent.

### `math`: comparison expressions require two OTTL statements

OTTL grammar forbids comparison operators in a `set()` value position. A `math` expression resolving to a comparison (e.g., `lt(price, 20)`) requires two statements: one to set a default `false`, one with a `where` clause to conditionally set `true`. Semantically equivalent; one extra statement per comparison-result expression.

### `sort`: non-array input silently no-ops

Passing a non-array field to `Sort()` silently skips the `set()`. ES ingest strict mode would error. OTTL under `error_mode: ignore` is more permissive.

### `sort`: mixed-type arrays sort by string coercion

Homogeneous `int` and `double` arrays sort numerically (matching ES ingest). Mixed-type arrays coerce all values to strings, so integers do not sort numerically relative to each other. Both OTTL and ES ingest have undefined behavior for mixed-type arrays.

### `remove_by_prefix`: `kvlistValue` nested attributes not removed

`delete_matching_keys` operates on top-level flat attribute keys only. When `from` crosses a `kvlistValue` boundary, OTTL leaves nested keys untouched while Painless navigates into the nested Map. Modern OTel instrumentation uses flat dotted keys, so this is unlikely in practice. A transpile-time warning is always emitted.

---

## What Is Solid

- **Condition translation** — All logical operators, comparisons, range checks, and string operators translate correctly. Comprehensive test coverage.
- **set, remove, drop_document** — Correct and well-tested.
- **grok (single-pattern, non-`@`-field)** — Live-verified against otelcontribcol v0.150.0-dev. Custom pattern definitions, dotted field names, and standard built-in patterns all work.
- **YAML output** — Hand-rolled renderer is correct. Keys with `/` are quoted; OTTL string literals properly escaped.
- **Transpile-time warning system** — Structured warnings returned alongside config. Covers multi-pattern grok, `@`-prefixed captures, `ignore_missing: false`, `output_format`, multi-format date, and `allow_duplicates` approximation.
- **Hard error on unsupported** — Transpiler refuses to produce YAML for pipelines containing unsupported actions. Clear error messages.
- **`error_mode` threading** — Caller-configurable (`ignore` | `silent` | `propagate`), flows through all generated processors.
- **Unit test coverage** — 86 tests across all 17 implemented actions and the full condition surface.

---

## Path to GA

1. **Implement Tier 2 processors** — `math`, `sort`, `remove_by_prefix`. OTTL paths confirmed via live arshile tests (see `streamlang-otel-tier2-summary.md`). Brings coverage to 20/23 (87%).
   - `math` (`processors/math.ts`): reuse `parseMathExpression` → walk TinyMath AST → OTTL inline expression. Field vars → `log.attributes["f"]`. Division → wrap operands with `Double()`. Comparison top-level → two-statement pattern. `ignore_missing` → `where (f1 != nil) and (f2 != nil)`.
   - `sort` (`processors/sort.ts`): `set(log.attributes["to|from"], Sort(log.attributes["from"], "asc"|"desc"))`. `ignore_missing` → append `where log.attributes["from"] != nil`.
   - `remove_by_prefix` (`processors/remove_by_prefix.ts`): `delete_matching_keys(log.attributes, prefixToRegex(from))`. Always emit the kvlistValue warning.
2. **Surface semantic gap warnings in the UI** — the `warnings` array from `transpile()` should be presented to users at pipeline authoring time, not hidden in metadata.
3. **Consider defaulting `errorMode` to `'propagate'` for new pipelines** — `'ignore'` is the current default for backwards compat but is not recommended for production.
4. **Document the 3 Tier 3 actions** (`dissect`, `enrich`, `network_direction`) in the UI authoring flow so users learn at DSL authoring time, not deploy time.
5. **Cross-target parity tests** — Scout tests verifying that a given DSL produces equivalent output through both the ingest pipeline and OTel Collector paths. Requires a live Elasticsearch stack alongside the collector.
