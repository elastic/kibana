# Streamlang OTel Collector Transpiler — Production Readiness Assessment

**Date:** 2026-04-22  
**Branch:** `streamlang-investigate`  
**Scope:** OTel Collector transpiler only (`kbn-streamlang` → `otelcol-contrib` YAML)  
**Ingest pipeline and ES|QL transpilers are out of scope for this assessment.**

---

## Verdict

**Not ready for commercial offering.** The transpiler is a working Phase 1 prototype covering 6 of 21 processor actions. The code quality of what exists is good. The gaps that block production are not bugs — they are missing coverage, a hardcoded error mode that swallows failures silently in production, and the absence of any integration test suite connecting the transpiler to a real OTel Collector.

Addressing the two hard blockers below (processor coverage and error observability) is the minimum bar for a supportable commercial feature. The semantic gaps are manageable with documentation and warnings, but must be disclosed.

---

## Hard Blockers

### 1. Processor coverage is 29% — unsupported actions are silently dropped from the pipeline

The DSL defines 21 distinct processor actions (excluding `manual_ingest_pipeline`, which is ingest-only by design). The OTel transpiler handles 6:

| Supported | Unsupported |
|-----------|-------------|
| `set` | `append`, `concat`, `convert`, `date`, `dissect` |
| `rename` | `enrich`, `join`, `json_extract`, `lowercase`, `math` |
| `remove` | `network_direction`, `redact`, `remove_by_prefix`, `replace` |
| `uppercase` | `sort`, `split`, `trim` |
| `grok` | |
| `drop_document` | |

When an unsupported action appears in a pipeline, the transpiler emits a YAML comment and **removes the processor from `service.pipelines.logs.processors`**. The pipeline runs. The processor does not. No error is raised at runtime; no document is flagged. The customer's data silently exits the pipeline without the transformation they configured.

This is the primary commercial blocker. Customers migrating from ingest pipelines will routinely use `date`, `convert`, `redact`, `lowercase`, `dissect`, or `json_extract`. A pipeline that appears to run successfully while silently skipping 3 of its 8 steps is not a shippable product.

**What needs to happen:** Either raise a hard error at transpile time when unsupported actions are present (safest), or raise the coverage bar before shipping. Soft warnings that allow deployment are only acceptable if the product is explicitly labeled as a preview with clearly documented limitations shown at the point the user deploys.

---

### 2. `error_mode: ignore` is hardcoded — runtime failures are invisible

Every generated `transform` and `filter` processor is emitted with `error_mode: ignore`. In OTel Collector semantics, this means any OTTL statement that raises an error is silently skipped. The log record continues through the pipeline unchanged.

In practice this means:
- A type mismatch (e.g., calling `ToUpperCase` on an integer) is swallowed.
- A malformed OTTL expression that passes validation but fails at evaluation is swallowed.
- A field access on an unexpected data shape is swallowed.
- There is no way for a customer to know their pipeline is not executing correctly without instrumenting the collector separately.

This is fine for a prototype and for situations where partial execution is acceptable. It is not acceptable for a commercial product where customers expect to be told when something goes wrong.

**What needs to happen:** The transpiler should expose an `error_mode` option to the caller. Sensible default for production: `propagate` (failures surface to the pipeline and can be handled by the `on_error` receiver) or `silent` with explicit acknowledgment from the user. The current hardcoded `ignore` should not reach GA.

---

## Material Semantic Gaps

These do not block shipping but must be documented before any customer-facing release. Several represent behaviors that diverge from the ingest pipeline transpiler, which will be the reference point for most customers migrating or running cross-target pipelines.

### Grok: multi-pattern sequential evaluation overwrites earlier matches

Ingest grok evaluates patterns in order and stops at the first match. The OTel transpiler emits one `ExtractGrokPatterns` statement per pattern. All patterns are evaluated. If a later pattern matches the same field, it overwrites the earlier result.

**Example:** A pipeline that uses `[pattern_a, pattern_b]` expecting pattern_b to be a fallback will produce incorrect output in OTel if both patterns match a given document.

The transpiler already warns on multi-pattern inputs. That warning must be surfaced prominently in the UI — not buried in a warnings array — for any user configuring grok with more than one pattern.

### Rename: two-statement copy-then-delete is not atomic

Rename emits `set(target, source)` followed by `delete_key(source)` as independent OTTL statements. Under `error_mode: propagate`, if the `delete_key` raises an error, the document exits with both `source` and `target` populated. The original field is not removed.

This is a known limitation documented in the source (`rename.ts`). It is only exploitable in abnormal conditions, and the OTTL primitive to do it atomically does not exist. It is acceptable for Phase 1 with documentation.

### `ignore_missing: false` becomes a silent no-op

Ingest pipeline raises an error when `ignore_missing: false` and the source field is absent. In OTTL there is no "error on nil" primitive. The transpiler approximates by guarding on `field != nil` — which means it simply skips execution when the field is missing, matching `ignore_missing: true` behavior.

Customers relying on `ignore_missing: false` as a validation gate (i.e., expecting a downstream failure when a required field is absent) will not get that behavior in OTel. This is currently undocumented at the DSL level.

### `@timestamp` in grok capture field names does not extract

go-grok (the OTel Collector's grok implementation) does not sanitize `@` in named capture group names, unlike `.` which it handles via a dotSep substitution. A pattern like `%{MY_TS:@timestamp}` starts the collector without crashing (this was a bug fixed in this branch) but the `@timestamp` field is silently not populated.

The transpiler now emits a warning for this case. The field name restriction itself cannot be fixed at the transpiler level — it is a go-grok limitation.

### `includes` condition uses regex against JSON-stringified arrays

OTTL has no native list-contains operator. The `includes` condition is approximated as `IsMatch(String(field), regex_of_value)`. This is fragile: the regex matches against the JSON encoding of the attribute's list value. Values containing regex metacharacters or quote characters can produce false positives or false negatives. This is documented in the source (`condition_to_ottl.ts`) but not surfaced as a warning to users.

### `startsWith`/`endsWith` coerce all types to strings

`HasPrefix(String(field), ...)` and `HasSuffix(String(field), ...)` coerce the field to a string before comparison. A boolean field `is_active: true` will match `startsWith: "t"`. The ingest equivalent would not coerce. This is a silent semantic difference for pipelines that apply string prefix/suffix conditions to fields that may carry mixed types.

---

## What Is Solid

The code quality of the implemented scope is high. These components can be relied on as-is:

- **Condition translation** (`condition_to_ottl.ts`) — All logical operators, comparisons, range checks, and string operators are correctly translated and conservatively parenthesized. Comprehensive test coverage.
- **set, remove, drop_document** — Straightforward, correct, well-tested. No known issues.
- **grok (single-pattern, non-`@`-field)** — live-verified against otelcontribcol v0.148.0-dev. Custom pattern definitions, dotted field names, and standard grok built-in patterns all work.
- **Transpile-time warnings** — The warning system is well-designed. Warnings are returned as a structured array alongside the config and surfaced in YAML comments. The grok processor currently warns on: multi-pattern, cyclic definitions, and `@`-prefixed capture names. This pattern should be extended as more processors are added.
- **YAML output** — Hand-rolled renderer is correct. Keys containing `/` are quoted. OTTL string literals are double-quoted with proper escape handling. Output round-trips through a real collector without modification.
- **Graceful degradation** — Unsupported actions don't crash transpilation. The architectural choice to return structured warnings rather than throw is the right one.
- **Type safety** — Internal emission types are well-modeled. The dispatch table is exhaustive with a typed default case.

---

## Testing Coverage

The unit test suite (`transpile.test.ts`, `condition_to_ottl.test.ts`) covers the Phase 1 surface well. But the project-level integration test infrastructure (`kbn-streamlang-tests`) exposes a significant gap.

`kbn-streamlang-tests` contains cross-compatibility Scout tests for **ingest pipeline** (21 processors) and **ES|QL** (20 processors) that run against a live Elasticsearch/Kibana stack. There are **zero OTel Collector integration tests**. This means:

- There is no automated test verifying that OTel-transpiled YAML produces the same output as an ingest-transpiled pipeline on the same input.
- Semantic regressions in the OTel transpiler will not be caught by CI.
- The 6 existing processors have been manually live-tested via Arshile but not wired into any repeatable test suite.

An OTel integration test suite equivalent to the existing ingest/ES|QL suites is required before commercial release. At minimum, the 6 Phase 1 processors should have parity tests against the ingest baseline.

---

## Recommended Path to Production

**Phase 1.5 (required before any customer exposure):**
1. Make unsupported actions a hard transpile error, or expose the limitation prominently in the product UI with a user acknowledgment gate before deployment.
2. Expose `error_mode` as a transpiler option. Default to `silent` with a UI-visible indicator; allow users to opt into `propagate` for diagnostic environments.
3. Add OTel integration tests to `kbn-streamlang-tests` for the 6 Phase 1 processors, covering at minimum the same test cases as the ingest suite for those processors.
4. Document `ignore_missing: false` behavior divergence in the DSL schema and any user-facing documentation.

**Phase 2 (required for general availability):**
5. Implement the 8 straightforward OTTL-mappable processors: `lowercase`, `trim`, `replace`, `dissect`, `convert` (partial), `join`, `split`, `concat`. These cover the majority of real-world pipeline patterns.
6. Implement `redact` (grok-based regex masking). This is a frequent customer requirement for PII handling.
7. Evaluate `date` and `json_extract`; both are implementable with OTTL functions but require careful handling of format strings and path syntax differences.
8. Flag `enrich`, `math`, and `network_direction` as not available in OTel target (no equivalent OTel primitives) and surface this limitation at pipeline authoring time, not at deploy time.
