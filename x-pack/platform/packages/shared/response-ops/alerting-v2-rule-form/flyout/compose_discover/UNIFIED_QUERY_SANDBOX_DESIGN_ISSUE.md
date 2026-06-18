# Design issue: Unified ES|QL query sandbox (Rules v2 — Compose Discover)

_Use this document when filing a design issue on `elastic/platform-ux-team` (label: `Needs design`). Template source: [design-elastic-old `context/issue-templates.md`](https://github.com/elastic/design-elastic-old/blob/main/context/issue-templates.md) — **Design Issue (General)**._

**Related:** [POC spec & decisions](./UNIFIED_QUERY_SANDBOX_POC_SPEC.md) · Kibana POC branch `poc/query-sandbox-unified-editor`

---

## Problem to solve

Rules v2 alert rules are stored as a **base ES|QL query** plus an **alert condition** (appendable segment). Users naturally author **one continuous pipeline** in Discover style — they do not think in “base” vs “condition” until they need to tune recovery or reuse a shared base.

Today, exposing split editors upfront adds cognitive load and breaks the mental model of “write a query, run it, create a rule.” We need a **query sandbox** in the Compose Discover flyout that:

- Feels like Discover (editor, time range, Search, results grid)
- Defers split until the user is ready (after **Apply**)
- Offers **escape hatches** (manual base/alert tabs, YAML split tabs) without forcing them
- Keeps form/YAML mode switches safe while the sandbox is open

This work supports Rules v2 authoring (RnA program) and aligns ES|QL-first alert creation with how users already explore data.

---

## Goals

1. **Reduce time-to-first-valid query** — users can paste or write one pipeline and Apply without choosing split mode first.
2. **Make the base/alert model legible after commit** — form summary shows base + alert blocks when split succeeds; clear copy when it does not.
3. **Support power users** — manual split and YAML editing without blocking the default path.
4. **Meet SharedUX / EUI bar** — flyout chrome, callouts, helpers, keyboard/a11y patterns consistent with Kibana Borealis.

---

## Deliverables

| Artifact | Description |
|----------|-------------|
| **Figma** | Compose Discover flyout + query sandbox (unified, manual split, recovery, YAML); form step 1 summary states |
| **Interaction spec** | States, transitions, mode gating, copy (can extend [POC spec](./UNIFIED_QUERY_SANDBOX_POC_SPEC.md)) |
| **UX guidelines** (if pattern is reusable) | “Unified editor → auto-split on Apply” for ES|QL rule authoring |
| **Design critique sign-off** | EUI compliance, a11y, copy review before GA |

---

## Acceptance criteria

Key user journeys that must be designed and specified end-to-end:

1. **Create alert — happy path** — Open flyout → unified sandbox → Search → Apply → form shows base + alert → continue wizard.
2. **Create alert — split failed** — Heuristic cannot assign base → info callout + **Separate base and alert** → manual split sandbox.
3. **Create alert — no alert condition** — e.g. `STATS` without trailing `WHERE` → `no_where` → form shows base + *Not defined* + **No alert condition** callout ([POC spec §2](./UNIFIED_QUERY_SANDBOX_POC_SPEC.md#2-after-apply--form-summary-step-1)); user can proceed (OQ4).
4. **Re-edit query** — After Apply, **Edit query** reopens unified editor; edits do not corrupt split (no duplicated pipeline lines).
5. **Manual split ↔ unified** — Helper links *Separate base and alert* / *Use single editor* with confirm when merged text changed.
6. **YAML mode** — Split tabs in sandbox; toggle back to form **preserves** YAML split (not re-heuristicized).
7. **Recovery** — Custom recovery: locked base + editable recovery block in sandbox.
8. **Signal rules** — Single editor; no split helpers.
9. **Mode gating** — Alert/Signal and Form/YAML toggles disabled appropriately while sandbox is open in form mode; Next disabled until query is defined.

---

## Supporting documents and insights

- **POC implementation & decisions:** [UNIFIED_QUERY_SANDBOX_POC_SPEC.md](./UNIFIED_QUERY_SANDBOX_POC_SPEC.md) (includes flows, copy, open questions)
- **Rules v2 query model:** composed `base` + `breach.segment` vs standalone `breach.query` (`@kbn/alerting-v2-schemas`)
- **RnA architecture:** executor treats every row returned by breach query as breached
- **Heuristic split:** `use_heuristic_split.ts` (`split_succeeded`, `no_where`, `where_without_stats`, …)

_Evidence gaps for GA: FullStory / telemetry on rule create drop-off at query step; support themes on ES|QL rule authoring._

---

## Initial starting points

- **POC branch:** `poc/query-sandbox-unified-editor` in `elastic/kibana` — `@kbn/alerting-v2-rule-form` → `flyout/compose_discover/`
- **Principles already validated in POC:** one editor first; Apply as commit boundary; helper links (not title-row icons) for split/merge
- **Competitive reference:** Discover ES|QL editor + time picker; Grafana/Splunk alert query UIs (single editor default)

_Add screenshots or Loom from POC in the POC spec doc._

---

## Resources and links

| Resource | Link |
|----------|------|
| POC spec & media | [UNIFIED_QUERY_SANDBOX_POC_SPEC.md](./UNIFIED_QUERY_SANDBOX_POC_SPEC.md) |
| Kibana package | `x-pack/platform/packages/shared/response-ops/alerting-v2-rule-form/flyout/compose_discover/` |
| EUI patterns | [Error messages](https://eui.elastic.co/docs/patterns/error-messages/), [Help content](https://eui.elastic.co/docs/patterns/help-content/) |
| Figma (Elastic UI — Borealis) | _Add node URLs_ |
| PRD / problem brief | _Add link_ |
| RnA open question (recovery YAML) | [rna-program#268984](https://github.com/elastic/rna-program/issues/268984) |

---

## Suggested GitHub issue title

`[Rules v2] Design: Unified ES|QL query sandbox — Compose Discover flyout`

## Suggested labels

`Needs design`
