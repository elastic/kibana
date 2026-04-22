# OTel Collector Processor Compatibility Audit

Audited against opentelemetry-collector-contrib (transform processor v0.120.0+, filter processor v0.146.0+).

Conclusions were verified directly against the OTTL Go source under
`opentelemetry-collector-contrib/pkg/ottl/`:
- `expression.go` — `StringGetter` (type-strict) vs `StringLikeGetter` (auto-converting) semantics
- `ottlfuncs/func_set.go` — `set()` skips when the RHS evaluates to `nil`
- `ottlfuncs/func_merge_maps.go` — mutates target in place and returns `(nil, err)`
- `ottlfuncs/func_extract_grok_patterns.go` — 4-arg signature with `Optional[bool]` named captures and `Optional[[]string]` pattern definitions
- `ottlfuncs/func_to_upper_case.go`, `func_has_prefix.go`, `func_has_suffix.go` — all use `StringGetter`, so raise `TypeError` on non-string input
- `ottlfuncs/func_is_match.go`, `func_string.go` — use `StringLikeGetter`, so auto-convert
- `processor/filterprocessor/README.md` — `logs.log_record` is explicitly deprecated in favor of top-level `log_conditions`

---

## Blocking Issues (fix before production use)

| # | Processor | OTelCol Behavior | Expected Streamlang Behavior | Impact | Remediation | Location |
|---|-----------|------------------|------------------------------|--------|-------------|----------|
| 1 | `uppercase` | `ToUpperCase` is backed by `StringGetter`; it returns `TypeError` for any non-string input (and for `nil`). With `error_mode: ignore` (our emitted default) the statement is silently skipped. | Field is uppercased for any non-nil value, or the failure is surfaced. | Low–medium. Numeric/boolean attributes silently retain their original value; the user sees no error. Affects any pipeline that types `log.attributes` loosely (common for freshly-ingested JSON). | Low effort. Add `IsString(<field>)` to the emitted `where` guard so only string inputs reach `ToUpperCase`. The statement becomes a no-op for non-strings, which matches ingest `uppercase`'s behavior of erroring on non-strings under `ignore_failure: true`. Alternative: emit `ConvertCase(<field>, "upper")` for StringLike coercion — changes semantics to auto-convert. | `processors/uppercase.ts` |
| 2 | `grok` | The DSL's `pattern_definitions` is not forwarded to OTTL. The transpiler emits a warning whose text incorrectly claims OTTL has no support; in reality `ExtractGrokPatterns` accepts a 4th optional arg `PatternDefinitions ottl.Optional[[]string]` in `"NAME=definition"` form. Patterns that reference user-defined aliases therefore fail to compile at collector startup. | Custom pattern definitions are forwarded so the grok expression compiles and matches. | High for any pipeline using pattern libraries. Failure mode is a hard compile error inside the collector (not a silent runtime skip) because pattern compilation happens eagerly when the literal pattern is known. | Medium effort. Two viable paths. (a) Forward the DSL map as an OTTL string array: `["NAME1=def1", "NAME2=def2", …]` passed as the 4th argument — requires plumbing through `grok.ts` and updating the warning text. (b) Inline definitions into the pattern string via the existing `unwrapPatternDefinitions` helper in `types/utils/grok_pattern_definitions.ts` — avoids the version dependency on the OTTL 4th-arg feature and produces a self-contained pattern. (b) is safer for older collector versions; (a) is closer to intent and preserves error messages. | `processors/grok.ts:46-50` |
| 3 | `conditions` | `HasPrefix`/`HasSuffix` are both typed as `StringGetter` → `StringGetter`. They raise `TypeError` on any non-string first argument. `IsMatch` is different: its target is `StringLikeGetter`, which auto-converts. | `startsWith`/`endsWith` work on any field that can be coerced to string, mirroring ingest/ES|QL. | Medium. Any numeric or boolean attribute that a user tries a `startsWith`/`endsWith` check against evaluates the whole condition to `false` under `error_mode: ignore` — which means conditional steps run when they shouldn't (or don't run when they should). Subtle because the failure is per-condition, not pipeline-level. | Trivial. Wrap the field expression in `String(...)` in the emitted OTTL: `HasPrefix(String(<field>), ...)` / `HasSuffix(String(<field>), ...)`. `String()` is itself a `StringLikeGetter` that returns `nil` on nil (so the parent condition evaluates to false cleanly) and auto-converts everything else. One-line change at two call sites. | `condition_to_ottl.ts:95,98` |

---

## Semantic Issues (correct behavior, but worth documenting or hardening)

| # | Processor | OTelCol Behavior | Expected Streamlang Behavior | Impact | Remediation | Location |
|---|-----------|------------------|------------------------------|--------|-------------|----------|
| 4 | `grok` | The emitted `set(log.attributes, merge_maps(log.attributes, Extract…, "upsert"))` "works" only because `merge_maps` has a side effect: it mutates `log.attributes` in place and then calls `target.Set`, returning `(nil, err)`. The outer `set()` sees a nil RHS and — per `func_set.go:40` — skips the assignment. The merge has already happened. | Extracted fields are merged into attributes via a direct, non-side-effect-dependent call. | None today (the YAML works), but fragile across OTTL versions. If a future OTTL release starts treating a nil RHS to `set(pmap, nil)` as "clear the map" (the comment at `func_set.go:39` notes "No fields currently support `null` as a valid type" — i.e., this is intentional today but could change), every grok pipeline would silently wipe `log.attributes`. | Low effort. Replace the wrapper with a direct editor statement: `merge_maps(log.attributes, ExtractGrokPatterns(<field>, <pat>, true), "upsert") where <cond>`. The filter README confirms `merge_maps` is usable as a top-level statement (`### merge_maps` — "merge_maps is a special case of the set function"). Updates exactly one emitter and the snapshot tests. | `processors/grok.ts:52-59` |
| 5 | `rename` | Two independent OTTL statements (copy + delete) gated by the same `where`. Under `error_mode: ignore`, if `set(target, source)` succeeds but `delete_key(source)` then raises (e.g., OTTL path error), the document ends up with both fields populated — the rename is non-atomic. | Rename is all-or-nothing: the source field disappears only when the target was written. | Low in practice (`delete_key` is extremely unlikely to fail on a path it's already set on), but real for pipelines that rely on mutually-exclusive field presence (e.g., schema detection downstream). | Hard without upstream change. OTTL has no atomic `rename` editor. Workarounds: (a) accept the risk and document it; (b) add a post-step reconciliation that checks both fields and removes the source if the target exists; (c) raise an OTTL feature request for a `rename_key` editor. (a) is the pragmatic choice for Phase 1. | `processors/rename.ts:37-40` |
| 6 | all (`from`-driven: `uppercase`, `grok`, `rename`, `remove`) | `ignore_missing: false` in Streamlang means ingest/ES|QL *error* when the source field is missing. The OTel emitter instead adds a presence guard (`<field> != nil`) to `where`, so a missing source silently no-ops. | Consistent cross-target behavior for `ignore_missing: false`: either all three targets error, or all three silently skip, but not a split. | Medium for pipelines that rely on `ignore_missing: false` as a contract/assertion (i.e., the author wanted loud failure). Low for the common case of defensive pipelines where `ignore_missing: true` is used anyway. The comment in `rename.ts:17-21` already acknowledges this gap. | Medium effort. OTTL has no "error if nil" primitive. Three options: (a) emit `set(<field>, Error("rename source missing"))` guarded on absence — unclear OTTL-standard error function, may not exist; (b) shift to `error_mode: propagate` for the emitted transform, converting silent-skip into collector-level errors but affecting *all* statements in the processor — too coarse; (c) document the gap and surface it as a transpile-time warning when `ignore_missing: false` is explicit in the DSL. (c) is the honest and cheap path. | `processors/rename.ts`, `processors/uppercase.ts`, `processors/grok.ts`, `processors/remove.ts` |

---

## Style Issues (deprecated but functional)

| # | Processor | OTelCol Behavior | Expected Streamlang Behavior | Impact | Remediation | Location |
|---|-----------|------------------|------------------------------|--------|-------------|----------|
| 7 | `drop_document` | Emitted YAML uses `logs.log_record:` which the filter README explicitly lists under "Legacy Configuration" (deprecated, slated for removal). The modern v0.146.0+ form is a top-level `log_conditions:` key with conditions using `log.` path prefix (which ours already do). Both are accepted today by `config.go` wiring. | YAML output matches the current documented format. | Zero today, but the README says "will be removed in a future release". When that ships, any pipeline shipping our emitted YAML will fail to start against the newer collector. | Trivial. Change `logs: \n  log_record:` → `log_conditions:` in `renderFilter()` in `yaml.ts`. No condition rewriting needed — our conditions already use the `log.attributes[...]` prefix that `log_conditions` expects. Update two snapshot-style tests (`transpile.test.ts` yaml output assertion). | `yaml.ts` `renderFilter()` lines 85-98 |

---

## Removed from audit

**Previously: Issue #5 — namedCapturesOnly hardcoded `true`.** Reclassified as not-an-issue. Verified in `types/processors/index.ts` that `GrokProcessor` does not expose a `named_captures_only` field; the hardcoded `true` is therefore consistent with the DSL contract (Streamlang grok is named-captures-only by design, matching ingest grok). Treat as a future DSL-extension concern, not a compatibility gap.

---

## Per-Processor Detail

### `set`
All correct. `set(log.attributes["field"], value)` signature matches the OTTL editor. `nil` is the correct OTTL null literal. Literal encoding (strings, numbers, booleans) is valid. `where` clause syntax is valid. Bare strings in `log_statements` YAML list is the correct format. `override: false` emits `<target> == nil` which is correct.

### `remove`
All correct. `delete_key(log.attributes, "key")` matches the OTTL editor signature. `delete_key` is a no-op on missing keys, so the presence guard (`!= nil`) correctly preserves ingest-pipeline semantics for `ignore_missing: false` *within OTel's own semantics* — note the cross-target gap flagged as issue #6 above.

### `rename`
No blocking issues. The two-step `set()` + `delete_key()` pattern is the OTel-recommended approach — no atomic OTTL rename editor exists. See semantic issues #5 and #6 above.

### `uppercase`
**Blocking issue #1.** `StringGetter.Get` at `expression.go:414-433` returns `TypeError("expected string but got nil")` for nil and `TypeError(fmt.Sprintf("expected string but got %T", val))` for non-string types. Our `where` guard filters nil but not numeric/boolean attributes. Under `error_mode: ignore` the failure is a silent skip.

Fix sketch (replace the current `where` clause builder in `processors/uppercase.ts`):
```ts
// add alongside the existing presence guard
whereParts.push(`IsString(${fromAttr})`);
```
`IsString` is documented in `ottlfuncs/README.md` and evaluates without raising on non-string input.

### `grok`
**Blocking issue #2** — `pattern_definitions` not forwarded. The transpiler emits a warning whose text is factually incorrect (OTTL *does* support it via the 4th arg). Remediation options (a) forward as `["NAME=def"]` array, (b) inline via `unwrapPatternDefinitions`. Prefer (b) for portability.

**Semantic issue #4** — `set(log.attributes, merge_maps(...))` works via `merge_maps`'s in-place side effect. Replace with a direct `merge_maps(log.attributes, ExtractGrokPatterns(...), "upsert") where …` statement. This matches the documented idiom (filter README §merge_maps) and doesn't depend on the collector's current `set(pmap, nil) = no-op` behavior.

Empty-map behavior (no match): `ExtractGrokPatterns` returns an empty `pcommon.Map`, `merge_maps` with an empty source is a no-op — correct. Verified in `func_extract_grok_patterns.go:109-122`.

### `drop_document` / filter
**Style issue #7** — emit `log_conditions:` at the top of the filter config instead of `logs: log_record:`. No changes to the inner OTTL strings.

OR semantics when multiple `drop_document` steps are merged: a log is dropped if **any** condition matches. Verified against the filter README. Correct.

`error_mode: ignore` is appropriate for the drop filter; the OTel roadmap plans to make this the default.

### `conditions` (`condition_to_ottl.ts`)
**Blocking issue #3** — `HasPrefix(field, ...)` / `HasSuffix(field, ...)` need `String(field)` wrapping. Fix at lines 95 and 98:
```typescript
// current (raises TypeError on non-string <field>):
`HasPrefix(${field}, ${ottlStringLiteral(String(condition.startsWith))})`
// fix:
`HasPrefix(String(${field}), ${ottlStringLiteral(String(condition.startsWith))})`
```

All other condition constructs are correct:
- `nil` is the standard OTTL null keyword (`expression.go` and grammar accept `nil`, not `null`)
- `String()` is documented and backed by `StringLikeGetter` (auto-converts)
- `IsMatch(field, pattern)` uses `StringLikeGetter` for target — auto-converts, returns `false` on nil (verified `func_is_match.go:46-48`)
- `not (expr)` is the standard OTTL negation syntax (grammar has no `!` unary)
- Parenthesization with `and`/`or` is valid OTTL (verified in grammar)
- `includes` uses `String(field)` already — correct by accident (pre-existing fix that we missed extending to startsWith/endsWith)

---

## Suggested Fix Priority

1. **(trivial, blocking)** `condition_to_ottl.ts:95,98` — wrap `HasPrefix`/`HasSuffix` first arg in `String()`. Unblocks `startsWith`/`endsWith` on non-string attributes.
2. **(trivial, style)** `yaml.ts` `renderFilter()` — migrate `logs.log_record` → `log_conditions`. Forward-compat hedge.
3. **(low effort, blocking)** `processors/uppercase.ts` — add `IsString` guard to `where` clause.
4. **(low effort, semantic)** `processors/grok.ts` — replace `set(log.attributes, merge_maps(...))` with `merge_maps(...)` as a direct statement.
5. **(medium effort, blocking)** `processors/grok.ts` — plumb `pattern_definitions` through (prefer inlining via `unwrapPatternDefinitions`; fall back to OTTL 4th arg if inlining is unsafe for a given pattern shape).
6. **(design call)** `ignore_missing: false` parity — decide between documenting the gap (cheapest) and surfacing a transpile-time warning. Affects four processors.
