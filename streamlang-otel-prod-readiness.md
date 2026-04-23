# Streamlang OTel Collector Transpiler — Production Readiness Assessment

**Date:** 2026-04-22 (updated)
**Branch:** `streamlang-investigate`
**Scope:** OTel Collector transpiler only (`kbn-streamlang` → `otelcol-contrib` YAML)
**Ingest pipeline and ES|QL transpilers are out of scope for this assessment.**

---

## Verdict

**One blocker remains before commercial exposure: integration tests.** All code-level blockers from the initial assessment have been resolved. Processor coverage has risen from 6/21 (29%) to **17/23 (74%)** of user-facing actions. Unsupported actions now fail loudly at transpile time. `error_mode` is now caller-configurable.

The single remaining hard requirement before any production traffic is an OTel-specific integration test suite — tests that replay real documents through the transpiled YAML and assert output equivalence against the ingest pipeline baseline. Without it, semantic regressions will not be caught by CI.

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
| `trim` | `TrimSpace()` | `IsString` guard prevents TypeError |
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

### Tier 3 — Hard error at transpile time (6 actions)

These throw with a descriptive error message. No partial YAML is produced.

| Action | Reason |
|--------|--------|
| `enrich` | Requires external lookup policy — no OTTL equivalent |
| `math` | TinyMath expression evaluator — OTTL has only basic arithmetic |
| `network_direction` | IP network range tables — no OTTL equivalent |
| `sort` | No array-sort function in OTTL |
| `remove_by_prefix` | Requires attribute key iteration — not supported in OTTL |
| `dissect` | `ExtractDissectPatterns` is not available in the OTTL log transform context (confirmed via live collector test) |

`manual_ingest_pipeline` also throws — it is ingest-only by design and documented as such.

---

## Remaining Hard Blocker: Integration Tests

`kbn-streamlang-tests` contains Scout cross-compatibility tests for the **ingest pipeline** (21 processors) and **ES|QL** (20 processors) running against a live Elasticsearch/Kibana stack. There are **zero OTel Collector integration tests**. This means:

- Semantic regressions in the OTel transpiler will not be caught by CI.
- All 17 supported processors have been manually live-tested via arshile against otelcontribcol v0.148.0-dev, but there is no automated regression baseline.
- Cross-target parity is unverified: no test asserts that a given DSL produces equivalent output through both the ingest pipeline path and the OTel Collector path.

**What needs to happen:** Add an `otel_collector/` test directory alongside `esql/` and `ingest_pipeline/` in `kbn-streamlang-tests`. For each of the 17 supported processors, write a Scout API test that:
1. Sends a test document through the OTel-transpiled YAML (via a live collector sidecar).
2. Asserts the output attributes match the ingest pipeline baseline for the same input.

This is the primary remaining work item before GA. It requires a running OTel Collector in the test environment — a CI infrastructure dependency that is out of scope for this branch.

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

---

## What Is Solid

- **Condition translation** — All logical operators, comparisons, range checks, and string operators translate correctly. Comprehensive test coverage.
- **set, remove, drop_document** — Correct and well-tested.
- **grok (single-pattern, non-`@`-field)** — Live-verified against otelcontribcol v0.148.0-dev. Custom pattern definitions via 4th arg, dotted field names, standard built-in patterns all work.
- **YAML output** — Hand-rolled renderer is correct. Keys with `/` are quoted; OTTL string literals properly escaped.
- **Transpile-time warning system** — Structured warnings returned alongside config. Covers multi-pattern grok, cyclic definitions, `@`-prefixed captures, ignore_missing false, output_format, multi-format date, allow_duplicates dedup approximation.
- **Hard error on unsupported** — Transpiler refuses to produce YAML for pipelines containing unsupported actions. Clear error messages with the OTTL-equivalent reason.
- **`error_mode` threading** — Caller-configurable, flows through all generated processors.
- **Unit test coverage** — 66 tests across all 17 supported actions and the full condition surface.

---

## Path to GA

1. **Add OTel integration test suite** to `kbn-streamlang-tests` — the only remaining hard blocker. Requires a live collector in the test environment.
2. **Surface semantic gap warnings in the UI** — the `warnings` array from `transpile()` should be presented to users at pipeline authoring time, not hidden in metadata.
3. **Consider defaulting `errorMode` to `'propagate'` for new pipelines** — `'ignore'` is the current default for backwards compat but is not recommended for production.
4. **Document the 6 Tier 3 actions** in the UI authoring flow so users learn at DSL authoring time (not at deploy time) that those actions are unavailable in the OTel target.
