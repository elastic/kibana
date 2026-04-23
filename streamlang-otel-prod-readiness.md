# Streamlang OTel Collector Transpiler — Production Readiness Assessment

**Date:** 2026-04-22 (updated)
**Branch:** `streamlang-investigate`
**Scope:** OTel Collector transpiler only (`kbn-streamlang` → `otelcol-contrib` YAML)
**Ingest pipeline and ES|QL transpilers are out of scope for this assessment.**

---

## Verdict

**The integration test blocker is now resolved.** All code-level blockers from the initial assessment have been resolved. Processor coverage is **17/23 (74%)** of user-facing actions. Unsupported actions fail loudly at transpile time. `error_mode` is caller-configurable.

An arshile-based integration test suite (`transpile_arshile.test.ts`) now validates all 17 supported processors against a live `otelcontribcol v0.148.0-dev` binary. These tests surfaced and fixed two live bugs (see below) that unit tests could not catch. The suite skips automatically when `arshile` or an `otelcol-contrib` binary is not on `$PATH`, so it does not block CI for developers without the toolchain.

**Coverage ceiling investigation (2026-04-22):** A live arshile audit of the 6 previously-labeled "Tier 3 blocked" actions found that 3 of them (`math`, `sort`, `remove_by_prefix`) have viable OTTL equivalents. Coverage can reach **20/23 (87%)** once those three are implemented. The other 3 (`dissect`, `enrich`, `network_direction`) are genuinely hard blocked by OTTL limitations.

**The remaining work before GA is implementing the 3 unblocked processors, UI surface work, and documentation**, not runtime correctness.

---

## Resolved Blockers

### ~~1. Processor coverage is 29%~~ → Fixed: 74%

Previously unsupported actions were silently dropped from the YAML pipeline — the config ran but skipped transformations without warning. **Both behaviors are now fixed:**

1. **All formerly-unsupported actions that have OTTL equivalents have been implemented.** See the full table below.
2. **Remaining unsupported actions throw a hard transpile-time error.** The transpiler will not produce a YAML config when an unsupported action is present. Customers see a clear error message explaining why, rather than a silently broken pipeline.

### ~~2. `error_mode: ignore` hardcoded~~ → Fixed: caller-configurable

`error_mode` is now an option on `transpile(dsl, { errorMode: '...' })`. The default remains `'ignore'` for backwards compatibility. Callers can pass `'propagate'` for production deployments where silent OTTL failures are unacceptable, or `'silent'` to suppress logging without propagating. All generated `transform` and `filter` processors inherit the caller's choice.

---

## Current Processor Coverage

### Supported (17 of 23 user-facing actions)

| Action | OTTL translation | Notes |
|--------|-----------------|-------|
| `set` | `set(target, value)` | Handles literal, copy_from, override flag |
| `rename` | `set + delete_key` | Non-atomic; see semantic gaps |
| `remove` | `delete_key` | nil guard unless ignore_missing |
| `grok` | `merge_maps(ExtractGrokPatterns(...))` | 4th-arg pattern defs; live-verified |
| `uppercase` | `ToUpperCase()` | `IsString` guard prevents TypeError |
| `lowercase` | `ToLowerCase()` | `IsString` guard prevents TypeError |
| `trim` | `Trim(value, " ")` | `IsString` guard prevents TypeError; `TrimSpace` does not exist in OTTL |
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

### Tier 2 — Implementable but not yet coded (3 actions)

Live arshile testing (2026-04-22 against otelcontribcol v0.150.0-dev) confirmed these all have viable OTTL equivalents. They currently throw a hard transpile error. Coverage reaches **20/23 (87%)** once they are added. Full test evidence in `streamlang-otel-tier2-{math,sort,remove-by-prefix}.md`.

#### `math`

Walk the TinyMath AST and emit OTTL inline expressions. The `FUNCTION_REGISTRY` was already restricted to the OTTL-compatible subset (the comment in that file reads "OTTL is the limiting factor"), so no function gaps exist.

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

**Semantic gaps (see also Remaining Material Semantic Gaps below):**
- 🔴 **Integer division truncates.** `10 / 3` on `intValue` attrs → `3` in OTTL; TinyMath/Painless → `3.333…`. Required mitigation: always wrap division operands with `Double()` in generated OTTL.
- 🟡 Division by zero: OTTL warns and skips (field absent); Painless returns `Infinity`.
- 🟢 `Log(0)` / `Log(-1)`: OTTL warns and skips; Painless returns `-Infinity`/`NaN`.

#### `sort`

```
# in-place
set(log.attributes["field"], Sort(log.attributes["field"], "asc"))
# separate target
set(log.attributes["to"], Sort(log.attributes["from"], "desc"))
# ignore_missing: true
set(log.attributes["field"], Sort(log.attributes["field"], "asc")) where log.attributes["field"] != nil
```

**Numeric ordering confirmed** (critical open question resolved): homogeneous `int` and `double` arrays sort **numerically** in OTTL — `[3,1,10,2]` → `[1,2,3,10]`. This matches ES ingest behavior. String arrays sort lexicographically. Mixed-type arrays use string coercion (document as unsupported; ES ingest behavior is also undefined for mixed types).

**Semantic gaps:** Non-array field passed to `Sort()` silently no-ops under `error_mode: ignore`; ES ingest would error. More permissive — document.

#### `remove_by_prefix`

```
delete_matching_keys(log.attributes, "^<escaped_prefix>($|\\..*)")
```

TypeScript regex helper:
```typescript
const escapeRegex = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const prefixToRegex = (from: string): string => `^${escapeRegex(from)}($|\\..*)`;
```

The `($|\\..*)` suffix is essential: `$` matches the exact key; `\\..*` matches dotted children. This prevents `host` from matching `hostname` without requiring Go lookahead (which is unsupported). All 8 test cases passed including false-positive prevention.

**Always emit a warning.** `delete_matching_keys` operates only on top-level flat attribute keys. If `from` names a path that crosses a `kvlistValue` boundary (e.g., `tmp` stored as a kvlist containing `foo`), OTTL leaves it untouched while Painless navigates into the nested Map. Modern OTel instrumentation uses flat dotted keys, so this gap is unlikely in practice but cannot be statically detected.

### Tier 3 — Hard blocked by OTTL (3 actions)

These have no OTTL equivalent. They throw a descriptive error message. No partial YAML is produced.

| Action | Reason |
|--------|--------|
| `enrich` | No OTTL equivalent — but see note below on `lookupprocessor` |
| `network_direction` | `NetworkDirection()` is undefined in OTTL log context — confirmed via live test |
| `dissect` | `ExtractDissectPatterns` is undefined in the OTTL log transform context — confirmed via live test |

`manual_ingest_pipeline` also throws — it is ingest-only by design and documented as such.

#### `enrich` — Insurmountable portability gap, and that is acceptable

The OTel Collector contrib repo contains a [`lookupprocessor`](https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/processor/lookupprocessor) (community-accepted, `[development]` stability, expected production quality 2026) that is structurally similar — it evaluates an OTTL key expression, queries a lookup source, and writes results as new attributes. However, it has no Elasticsearch enrich policy source and cannot have one in any meaningful sense: ES enrich policies are an Elasticsearch-native concept with no OTel equivalent.

**This is by design and acceptable.** Streamlang DSLs that use `enrich` are simply not portable to the OTel Collector target. This is a fundamental portability boundary, not a transpiler gap to close. The transpiler correctly rejects these pipelines with a hard error. Users authoring OTel-targeted pipelines must avoid `enrich` and use `lookupprocessor` directly if they need enrichment, with their own lookup source.

---

## ~~Remaining Hard Blocker: Integration Tests~~ → Fixed

An arshile-based Jest integration test suite (`transpile_arshile.test.ts`) was added covering all 17 supported processors. Each test:
1. Transpiles a Streamlang DSL fragment to YAML.
2. Writes a temp arshile project and replays an OTLP log payload through the live collector.
3. Asserts the transformed output attributes.

**Setup:** `go install github.com/andrewvc/arshile@latest` then have `otelcol-contrib` or `otelcol` on `$PATH` (or set `OTELCOL_BINARY`). The suite self-skips when neither is present.

**Bugs found and fixed by the integration tests:**
- `trim` processor used `TrimSpace()` which is not a valid OTTL function; replaced with `Trim(value, " ")`.
- `rename` processor: the `delete_key` statement was gated on `toAttr == nil` — the same guard as the preceding `set()`. After `set()` runs, that condition is false so the delete never fired. Fixed by using separate where clauses: `set` keeps the override guard; `delete_key` only uses the source-presence guard.

**What remains:** Cross-target parity tests (OTel vs. ingest pipeline output equivalence) still don't exist. The arshile suite verifies OTel correctness in isolation. True cross-target regression testing requires a running Elasticsearch stack alongside the collector, which is a Scout-level test infrastructure concern beyond this branch.

---

## Remaining Material Semantic Gaps

These are documented behaviors, not bugs. They must be disclosed in user-facing documentation before commercial release.

### `ignore_missing: false` becomes a silent no-op

Ingest pipeline raises an error when `ignore_missing: false` and the source field is absent. OTTL has no "error on nil" primitive. The transpiler approximates by guarding on `field != nil` — which silently skips instead of raising. A transpile-time warning is emitted when `ignore_missing: false` is explicit.

### Rename: two-statement copy-then-delete is not atomic

Rename emits `set(target, source)` followed by `delete_key(source)`. Under `error_mode: propagate`, if `delete_key` raises (very unlikely), the document exits with both fields populated. OTTL has no atomic rename primitive; this is the closest approximation.

### Grok: multi-pattern evaluation does not stop at first match

Ingest grok stops at the first matching pattern. The OTel transpiler emits one `ExtractGrokPatterns` statement per pattern; all are evaluated. A later-matching pattern overwrites earlier captures. The transpiler warns when more than one pattern is provided.

### `@timestamp` in grok capture names does not extract

go-grok does not sanitize `@` in named capture group names. A pattern like `%{MY_TS:@timestamp}` starts the collector without error but `@timestamp` is silently not populated. The transpiler emits a compile-time warning.

### `includes` condition and `append allow_duplicates: false` use regex on JSON-stringified arrays

OTTL has no native list-contains operator. Both are approximated as `IsMatch(String(field), regex_of_value)`. Values containing regex metacharacters can produce false positives. Warnings are emitted.

### `date output_format` is not implementable

OTTL has no time-to-string function. When `output_format` is specified, the parsed date is stored as unix nanoseconds and a warning is emitted. 

### `date` with multiple formats requires `error_mode: ignore`

Multiple formats are tried in order via a `target == nil` guard. Under `error_mode: propagate`, a format mismatch would propagate as an error rather than silently trying the next format. A warning is emitted when multiple formats are provided.

### `json_extract` numbers are always double

`ParseJSON` stores all JSON numeric values as `doubleValue`. Type conversion with `type: 'integer'` wraps in `Int()` which truncates, but the underlying OTTL storage is always double until the `Int()` call.

### `startsWith`/`endsWith` coerce all types to strings

`HasPrefix(String(field), ...)` coerces any field type to its string representation before comparison. A boolean `true` matches `startsWith: "t"`.

### `math`: integer division truncates

When both operands of `/` are `intValue` attributes, OTTL performs integer truncation (`10 / 3 → 3`). TinyMath and Painless both return a float (`3.333…`). The transpiler must wrap division operands with `Double()` to preserve float semantics: `Double(a) / Double(b)`.

### `math`: divide-by-zero and `log` of non-positive inputs skip silently

Painless propagates IEEE 754 special values (`Infinity`, `NaN`). OTTL raises a runtime error and skips the statement under `error_mode: ignore`, leaving the target field absent. The output field's presence differs from ingest pipeline behavior.

### `math`: comparison expressions require two OTTL statements

OTTL grammar forbids `<`, `>`, `==`, `!=`, `<=`, `>=` in a `set()` value position. A `math` expression that resolves to a comparison (e.g., `lt(price, 20)`) requires two statements: one to set a default `false`, then one with a `where` clause to set `true`. Semantically equivalent; adds one statement per comparison-result expression.

### `sort`: non-array input silently no-ops

Passing a non-array field to `Sort()` returns nil and silently skips the `set()`. ES ingest strict mode would error. Under `error_mode: ignore` OTTL is more permissive — document in compatibility notes.

### `sort`: mixed-type arrays sort by string coercion

Homogeneous `int` and `double` arrays sort numerically (matching ES ingest). Mixed-type arrays (int + string) coerce all values to strings before comparison, so integers do not sort numerically relative to each other. Both OTTL and ES ingest have undefined behavior for mixed-type arrays; document as unsupported.

### `remove_by_prefix`: `kvlistValue` nested attributes not removed

`delete_matching_keys` operates on top-level flat attribute keys only. When `from` names a dotted path crossing a `kvlistValue` boundary (e.g., `from: "tmp.foo"` where `tmp` is a `kvlistValue` containing `foo`), OTTL leaves the nested key untouched while Painless navigates into the nested Map and removes it. Modern OTel instrumentation uses flat dotted keys, so this gap is unlikely in practice. A transpile-time warning is always emitted.

---

## What Is Solid

- **Condition translation** — All logical operators, comparisons, range checks, and string operators translate correctly. Comprehensive test coverage.
- **set, remove, drop_document** — Correct and well-tested.
- **grok (single-pattern, non-`@`-field)** — Live-verified against otelcontribcol v0.148.0-dev. Custom pattern definitions via 4th arg, dotted field names, standard built-in patterns all work.
- **YAML output** — Hand-rolled renderer is correct. Keys with `/` are quoted; OTTL string literals properly escaped.
- **Transpile-time warning system** — Structured warnings returned alongside config. Covers multi-pattern grok, cyclic definitions, `@`-prefixed captures, ignore_missing false, output_format, multi-format date, allow_duplicates dedup approximation.
- **Hard error on unsupported** — Transpiler refuses to produce YAML for pipelines containing unsupported actions. Clear error messages with the OTTL-equivalent reason.
- **`error_mode` threading** — Caller-configurable, flows through all generated processors.
- **Unit test coverage** — 86 tests across all 17 supported actions and the full condition surface.

---

## Path to GA

1. ~~**Add OTel integration test suite**~~ → Done (`transpile_arshile.test.ts`, 18 tests, all passing).
2. **Implement Tier 2 processors** — `math`, `sort`, `remove_by_prefix`. OTTL paths confirmed via live arshile tests (see `streamlang-otel-tier2-summary.md`). Brings coverage to 20/23 (87%).
   - `math` (`processors/math.ts`): reuse `parseMathExpression` → walk TinyMath AST → OTTL inline expression. Field vars → `log.attributes["f"]`. Divisions → wrap both operands with `Double()`. Comparison top-level → two-statement pattern. `ignore_missing` → `where (f1 != nil) and (f2 != nil)`.
   - `sort` (`processors/sort.ts`): `set(log.attributes["to|from"], Sort(log.attributes["from"], "asc"|"desc"))`. `ignore_missing` → append `where log.attributes["from"] != nil`.
   - `remove_by_prefix` (`processors/remove_by_prefix.ts`): `delete_matching_keys(log.attributes, prefixToRegex(from))` where `prefixToRegex` produces `^<escaped>($|\\..*)`. Always emit the kvlistValue warning.
3. **Surface semantic gap warnings in the UI** — the `warnings` array from `transpile()` should be presented to users at pipeline authoring time, not hidden in metadata.
4. **Consider defaulting `errorMode` to `'propagate'` for new pipelines** — `'ignore'` is the current default for backwards compat but is not recommended for production.
5. **Document the 3 hard-blocked Tier 3 actions** (`dissect`, `enrich`, `network_direction`) in the UI authoring flow so users learn at DSL authoring time, not at deploy time.
6. **Cross-target parity tests** — Scout tests verifying that a given DSL produces equivalent output through both the ingest pipeline and OTel Collector paths. Requires a live Elasticsearch stack alongside the collector.
