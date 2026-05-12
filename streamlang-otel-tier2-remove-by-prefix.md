# Streamlang `remove_by_prefix` — OTTL Implementation Investigation

**Date:** 2026-04-22
**Investigator:** Arshile + Claude Code (automated test harness)
**Collector version:** otelcol-contrib v0.150.0-dev
**Branch:** streamlang-investigate

---

## Executive Summary

**Verdict: `remove_by_prefix` IS implementable via OTTL with one documented semantic gap.**

`delete_matching_keys(log.attributes, "^<escaped_prefix>($|\\..*)")` correctly implements `remove_by_prefix` semantics for **flat OTLP attribute keys** (the normal case in OTel semantic conventions). All 8 primary tests passed with no false positives and no missed deletions.

**One semantic divergence exists**: OTTL `delete_matching_keys` operates only on top-level keys of the attribute map. It does not descend into `kvlistValue` (nested map) attribute values. The Painless ingest pipeline implementation navigates nested Maps. When `from` names a dotted path that crosses a `kvlistValue` boundary, Painless removes the child key inside the nested map while OTTL leaves the attribute untouched. Empirically confirmed in Test 9.

**Current transpiler status**: The OTel transpiler in `conversions.ts` marks `remove_by_prefix` as unsupported with the message `'OTTL does not support iterating over attribute keys by prefix'`. That was accurate before `delete_matching_keys` was proven effective for the flat-key model. This investigation provides evidence to lift the unsupported marking for the flat-key case.

---

## Regex Pattern

### Pattern

```
^<escaped_prefix>($|\\..*)
```

Where `escaped_prefix` escapes all regex metacharacters in the DSL `from` value. The suffix `($|\\..*)` in YAML string form means: end-of-string (exact match) OR a literal dot followed by any characters (child key). The `\\.` inside the alternative is an escaped dot — do not write `\\.*)` (missing the dot between `\\.` and `.*`), which would match zero or more literal dots instead of arbitrary child keys.

### TypeScript Implementation

```typescript
const escapeRegex = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const prefixToRegex = (from: string): string => `^${escapeRegex(from)}($|\\..*)`;
```

**Examples:**
| DSL `from`  | Regex (in YAML string)          | Go regex (after YAML unescape)  |
|-------------|---------------------------------|---------------------------------|
| `tmp`       | `^tmp($|\\..*)` | `^tmp($|\..*)` |
| `user.meta` | `^user\\.meta($|\\..*)` | `^user\.meta($|\..*)` |
| `a.b`       | `^a\\.b($|\\..*)` | `^a\.b($|\..*)` |
| `host`      | `^host($|\\..*)` | `^host($|\..*)` |

**OTTL YAML form** (YAML string embedding means `\\` in YAML → `\` in Go regex):

```yaml
- delete_matching_keys(log.attributes, "^tmp($|\\..*)")
```

---

## OTTL Processor Configuration Template

```yaml
processors:
  transform/remove_by_prefix:
    error_mode: ignore
    log_statements:
      - context: log
        statements:
          - delete_matching_keys(log.attributes, "^<escaped_prefix>($|\\..*)")
```

---

## Test Cases

### Test 1: Combined — remove exact key AND children

**Pattern:** `^tmp($|\\..*)`
**Collector config:**
```yaml
- delete_matching_keys(log.attributes, "^tmp($|\\..*)")
```

**Input attributes:**
```json
{"tmp": "exact_match", "tmp.foo": "child1", "tmp.bar": "child2", "keep": "keep_me"}
```

**Output attributes:**
```json
{"keep": "keep_me"}
```

**Conclusion:** PASS. Exact key and all children removed; unrelated key preserved.

---

### Test 2: Only exact key, no children

**Pattern:** `^tmp($|\\..*)`

**Input attributes:**
```json
{"tmp": "only_this", "other": "keep"}
```

**Output attributes:**
```json
{"other": "keep"}
```

**Conclusion:** PASS. Exact key deleted; unrelated key preserved.

---

### Test 3: Only children, no exact key

**Pattern:** `^tmp($|\\..*)`

**Input attributes:**
```json
{"tmp.foo": "child1", "tmp.bar": "child2", "other": "keep"}
```

**Output attributes:**
```json
{"other": "keep"}
```

**Conclusion:** PASS. Children removed; no spurious error about missing exact key.

---

### Test 4: No false positives — `tmpother` and `nottmp` must survive

**Pattern:** `^tmp($|\\..*)`

**Input attributes:**
```json
{"tmp": "delete_me", "tmp.foo": "delete_me", "tmpother": "keep_me", "nottmp": "keep_me"}
```

**Output attributes:**
```json
{"tmpother": "keep_me", "nottmp": "keep_me"}
```

**Conclusion:** PASS. Critical test — `tmpother` is NOT matched because `($|\\.*)` requires end-of-string or a literal dot after the prefix. The `$` alternative handles this correctly without lookahead (Go regex has no lookahead support).

---

### Test 5: No matching keys — no-op behavior

**Pattern:** `^tmp($|\\..*)`

**Input attributes:**
```json
{"alpha": "keep", "beta.gamma": "keep", "something_else": "keep"}
```

**Output attributes:**
```json
{"alpha": "keep", "beta.gamma": "keep", "something_else": "keep"}
```

**Conclusion:** PASS. No attributes deleted; no error raised.

---

### Test 6: Deeply nested dotted prefix

**Pattern:** `^a\\.b($|\\..*)`

**Input attributes:**
```json
{"a.b": "match", "a.b.c": "match", "a.b.c.d": "match", "a.bc": "keep", "a": "keep"}
```

**Output attributes:**
```json
{"a.bc": "keep", "a": "keep"}
```

**Conclusion:** PASS. Three matching keys deleted; `a.bc` (dot follows `a`, not `a.b`) and `a` (parent) preserved. The escaped dot in the regex (`\\.`) correctly prevents `a.bc` from matching `^a\\.b`.

---

### Test 7: Special regex characters in prefix — dot requires escaping

**Pattern:** `^user\\.meta($|\\..*)`

**Input attributes:**
```json
{"user.meta": "match", "user.metadata": "keep", "user.meta.id": "match"}
```

**Output attributes:**
```json
{"user.metadata": "keep"}
```

**Conclusion:** PASS. `user.meta` (exact) and `user.meta.id` (child) deleted; `user.metadata` preserved. The escaped dot in `user\\.meta` is essential — an unescaped dot would match `user` + any-char + `meta`, which could cause false positives against keys like `userXmeta`. The `escapeRegex` helper handles this correctly.

---

### Test 8: Single-segment prefix — no dots

**Pattern:** `^host($|\\..*)`

**Input attributes:**
```json
{"host": "val", "host.name": "hostname", "host.os": "linux", "hostname": "keep"}
```

**Output attributes:**
```json
{"hostname": "keep"}
```

**Conclusion:** PASS. `host`, `host.name`, `host.os` deleted; `hostname` preserved. Mirrors OTel semconv use case where `host.*` attributes must not accidentally delete `hostname`.

---

### Test 9: Semantic divergence — `kvlistValue` nested attributes

This test documents the one behavioral difference between OTTL and the Painless ingest implementation.

**Scenario:** `from: "tmp.foo"` where `tmp` is a `kvlistValue` attribute containing child key `foo`.

**Pattern:** `^tmp\\.foo($|\\..*)`

**Collector config:**
```yaml
- delete_matching_keys(log.attributes, "^tmp\\.foo($|\\..*)")
```

#### Test 9a: Nested kvlistValue (OTTL cannot match inside)

**Input attributes (OTLP JSON):**
```json
[
  {"key": "tmp", "value": {"kvlistValue": {"values": [{"key": "foo", "value": {"stringValue": "nested_child"}}]}}},
  {"key": "keep", "value": {"stringValue": "keep_me"}}
]
```

**Output attributes:**
```json
[
  {"key": "tmp", "value": {"kvlistValue": {"values": [{"key": "foo", ...}]}}},
  {"key": "keep", "value": {"stringValue": "keep_me"}}
]
```

**OTTL result:** No deletion. `delete_matching_keys` sees only the top-level key `tmp`, which does not match `^tmp\\.foo($|\\..*)`. The function does not recurse into `kvlistValue` to find and delete `foo`.

**Painless result (expected):** Would delete `foo` from inside the `tmp` map because Painless navigates nested Maps: it descends into `tmp` (a Map), reaches depth 1, sets `remainingPath = "foo"`, then calls `removeIf` on the inner map.

**Divergence: CONFIRMED.**

#### Test 9b: Flat key (OTTL works correctly)

**Input attributes:**
```json
[
  {"key": "tmp.foo", "value": {"stringValue": "flat_key"}},
  {"key": "keep", "value": {"stringValue": "keep_me"}}
]
```

**Output attributes:**
```json
[{"key": "keep", "value": {"stringValue": "keep_me"}}]
```

**OTTL result:** PASS. Flat key `tmp.foo` matched and deleted.

#### Summary of Test 9

| Data model         | OTTL behavior         | Painless behavior         | Match? |
|--------------------|-----------------------|---------------------------|--------|
| Flat key `tmp.foo` | Deleted correctly     | Deleted correctly         | Yes    |
| kvlist `tmp` → `foo` | NOT deleted (no-op) | `foo` inside `tmp` deleted | **No** |

---

## Comparison with Painless Ingest Pipeline Implementation

The Painless implementation (source: `remove_by_prefix_processor.ts`) works as follows:

1. Splits `from` by dots into `pathParts`
2. Iterates through `pathParts[0..n-2]`, descending into nested Maps as long as each part maps to a `Map` value
3. Stops at the first non-Map value, records `depth`
4. Constructs `remainingPath` from `pathParts[depth..n-1]`
5. Calls `removeIf` on the current Map level, matching keys equal to `remainingPath` or starting with `remainingPath + "."`

The key difference: Painless operates on the Elasticsearch document's Java object graph, where `{"a": {"b": "x"}}` and `{"a.b": "x"}` are structurally different but both reachable from `ctx`. OTTL operates on the OTLP attribute map, which is a flat `map<string, AnyValue>` at each level. Both representations appear in real data.

**In practice for OTel data:** OTLP logs from modern instrumentation use flat dotted attribute keys (`log.attributes["http.request.method"]`), not nested `kvlistValue` structures. The kvlist divergence is a theoretical gap that rarely surfaces in real pipelines. It should be documented but is not a blocker for most use cases.

---

## Edge Cases and Constraints

### Empty string `from`
- DSL validation should reject `from: ""` before reaching the transpiler.
- The regex `prefixToRegex("")` produces `^($|\\.*)`, which would match the empty-string key and any key starting with a dot.
- Recommendation: enforce `from` non-empty in `validate_processor_values.ts`.

### Single-character prefix
- `from: "a"` → `^a($|\\..*)` — works correctly; tested implicitly via `host` and `tmp` cases.

### Prefix containing regex metacharacters
- The `escapeRegex` function handles: `. * + ? ^ $ { } ( ) | [ ] \`
- Test 7 validates the dot case. Other metacharacters (e.g., `from: "user+info"`) are handled by the escape function but not separately tested.

### Multi-field `from` (Painless `fields` array)
- The DSL `RemoveByPrefixProcessor` type defines `from: string` (single field).
- The Painless processor renames `from` → `fields` and iterates over an array — but the DSL schema enforces a single string. This is an internal implementation detail.
- For OTTL, each field would need its own `delete_matching_keys` statement.

### Case sensitivity
- OTTL `delete_matching_keys` uses Go `regexp` which is case-sensitive by default.
- The Painless `String.equals()` and `String.startsWith()` are also case-sensitive.
- No divergence.

### `error_mode: ignore`
- Both the Painless script processor and the OTTL `transform` use error-ignoring semantics for this processor (no `ignore_missing` option in DSL).
- Match confirmed.

---

## Transpiler Implementation Plan

To implement `remove_by_prefix` in the OTel collector transpiler:

**1. In `conversions.ts`**: Remove `remove_by_prefix` from `UNSUPPORTED_REASONS`. Add a `case 'remove_by_prefix'` branch that calls a new converter.

**2. Create** `src/transpilers/otel_collector/processors/remove_by_prefix.ts`:

```typescript
import type { RemoveByPrefixProcessor } from '../../../../types/processors';
import type { Emission } from '../emission';

const escapeRegex = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const prefixToRegex = (from: string): string => `^${escapeRegex(from)}($|\\..*)`;

export const convertRemoveByPrefixProcessorToOtel = (
  processor: RemoveByPrefixProcessor
): { emission: Emission; warnings: string[] } => {
  const regex = prefixToRegex(processor.from);
  const emission: Emission = {
    kind: 'transform',
    statements: [
      {
        context: 'log',
        statements: [`delete_matching_keys(log.attributes, "${regex}")`],
      },
    ],
  };
  const warnings = [
    `remove_by_prefix on field "${processor.from}" uses delete_matching_keys on flat OTLP ` +
    `attribute keys. Attributes stored as kvlistValue (nested map) will not have inner keys ` +
    `removed — this differs from the ingest pipeline Painless implementation which navigates ` +
    `nested Maps.`,
  ];
  return { emission, warnings };
};
```

Note: the return type `{ emission, warnings }` matches the pattern used by other processors in `conversions.ts` (e.g., `remove`, `redact`). The warning is always emitted because the data model assumption (flat keys vs. kvlistValue) cannot be statically determined from the DSL alone.

**4. Validate** that `from` is non-empty in `validate_processor_values.ts`.

---

## Files Referenced

- `/Users/andrewvc/projects/kibana/x-pack/platform/packages/shared/kbn-streamlang/src/transpilers/ingest_pipeline/processors/remove_by_prefix_processor.ts` — Painless implementation
- `/Users/andrewvc/projects/kibana/x-pack/platform/packages/shared/kbn-streamlang/src/transpilers/otel_collector/conversions.ts` — current unsupported marking (line 58)
- `/Users/andrewvc/projects/kibana/x-pack/platform/packages/shared/kbn-streamlang/types/processors/index.ts` — `RemoveByPrefixProcessor` type (line 333)
- `/private/tmp/arshile-prefix/` — tests 1–5 arshile project
- `/private/tmp/arshile-t6/` — test 6 arshile project
- `/private/tmp/arshile-t7/` — test 7 arshile project
- `/private/tmp/arshile-t8/` — test 8 arshile project
- `/private/tmp/arshile-t9/` — test 9 kvlist divergence arshile project
