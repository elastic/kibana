<!--
  © Elasticsearch B.V. — Elastic License 2.0
  This file was written as part of implementation step 6.3 (query optional on
  the response schema). It records the consumer audit that preceded the fixes and
  serves as the rationale checklist committed with the change.
-->

# `query` optional on `ruleResponseSchema` — consumer audit (step 6.3)

`query` was made optional in `ruleResponseSchema` so that execution-compiled
rules (those whose `compilation` is `'execution_time'`) can be returned from the
API without a stored query.  Every consumer of `RuleResponse.query` was audited
before the schema change landed.

Design reference: [rule-execution-logic.md — "A rule without a persisted
query"](../../../../../../../../docs-security/detection-engine-v2/architecture-design/rule-execution/rule-execution-logic.md#a-rule-without-a-persisted-query).

---

## Fixes applied

| File | What changed |
|---|---|
| `server/lib/rules_client/utils.ts` | `toApiQuery` widened to accept `undefined` and return `undefined`; the response object now uses a conditional spread so the key is absent rather than `undefined` for query-less rules. |
| `server/lib/rule_executor/steps/compile_rule_query_step.ts` | Both pass-through branches (2a no builder_type, 2c write-time builder) now throw an `INVALID_RULE_QUERY_CONFIG` user-source error when `rule.query` is absent, instead of passing `undefined` as `effectiveQuery` and silently halting. The `!` non-null assertions are dropped. |
| `packages/response-ops/alerting-v2-rule-form/form/utils/query_mappers.ts` | `apiQueryToFormQuery` gains a third `kind?: RuleKind` parameter; when `q == null` it returns the kind's empty form query so the editor opens without pretending that text is the rule's persisted query. |
| `packages/response-ops/alerting-v2-rule-form/form/utils/rule_request_mappers.ts` | Call site passes `rule.kind` as the third argument. |
| `packages/response-ops/alerting-v2-rule-form/flyout/compose_discover/compose_mappers.ts` | Call site passes `rule.kind` as the third argument. |
| `packages/response-ops/alerting-v2-rule-form/form/utils/is_non_representable.ts` | `isNonRepresentableRule` returns `false` immediately when `rule.query == null`; a query-less rule is builder-authored and is represented by its builder form, not a query editor. |
| `public/hooks/use_compose_discover_flyout.tsx` | Deleted the `emptyQueryFor` helper and removed the `query: template.rule.query ?? emptyQueryFor(...)` synthesis from `templateToSyntheticRule`; the `...template.rule` spread now carries an optional `query`, making the synthetic rule genuinely query-less. |
| `public/components/rule_details/utils.ts` | `getRecoverEsqlSegment` parameter widened to `Query \| undefined`; returns `undefined` when `query` is absent. |
| `public/components/rule_details/sidebar/rule_conditions.tsx` | Data-source line guards on `rule.query`; the ES\|QL query title + code block are wrapped in `{rule.query ? (…) : null}`. |
| `public/components/rule_details/overview/signal_rule_overview.tsx` | `ruleEsql` now `rule.query ? getRootEsqlQuery(rule.query) : undefined`. |
| `public/components/rule_details/overview/alert_timeline/alert_timeline_section.tsx` | Same guard as signal_rule_overview. |
| `public/pages/episode_details_page/episode_details_page.tsx` | `ruleEsql` condition widened to also require `ruleState.rule.query`. |
| `packages/response-ops/alerting-v2-episodes-ui/components/details/metadata_section.tsx` | Guarded with `&& ruleState.rule.query` before `getRootEsqlQuery`. |
| `packages/response-ops/alerting-v2-episodes-ui/components/details/prepare_trend_inputs.ts` | Guard widened to `if (!rule \|\| !rule.query) return null`. |
| `packages/response-ops/alerting-v2-episodes-ui/components/details/rule_overview_panel.tsx` | `EuiCodeBlock` rendered only when `rule.query` is present; otherwise an `EuiText` placeholder with `data-test-subj="alertingV2EpisodeDetailsRuleNoQueryPlaceholder"` is shown. |
| `packages/response-ops/alerting-v2-episodes-ui/components/details/translations.ts` | Added `RULE_OVERVIEW_NO_QUERY_PLACEHOLDER`. |
| `public/components/rule_details/sidebar/rule_sidebar_preview_tab.tsx` | Returns `EuiEmptyPrompt` when `rule.query == null` instead of running `QuerySandbox` with an empty string. |
| `packages/response-ops/alerting-v2-utils/src/rule_mappers.ts` | `buildRulePayload` changed `query: data.query!` to a conditional spread. |
| `server/lib/rule_executor/steps/execute_rule_query_step.test.ts` | Jest fixture uses optional chaining on `rule.query?.format`. |
| `test/scout_alerting_v2/rules/api/tests/update_rule.spec.ts` | Scout assertion uses `stored.query?.format`. |
| `test/scout_alerting_v2/rules/ui/tests/compose_discover_recovery_yaml_sync.spec.ts` | Scout poll uses `rule.query?.format`. |

---

## Cleared (no change needed)

| File | Why cleared |
|---|---|
| `public/pages/rules_list_page/rules_list_table.tsx` | Already guards `const source = query ? … : undefined`. |
| `public/pages/alert_episodes_list_page/alert_episodes_list_page.tsx` | Already uses `rulesCache[ruleId]?.query ? …`. |
| `packages/response-ops/alerting-v2-episodes-ui/components/episodes_table_cell_renderers.tsx` | Already gated on `showQuery && rule.query`. |
| `packages/response-ops/alerting-v2-episodes-ui/components/details/overview_list_section.tsx` and `related_list.tsx` | Already use `isRuleLoaded(ruleState) && ruleState.rule.query ? …`. |
| `server/agent_builder/sml/rule_sml_type.ts` | `attrs?.query ? getBreachEsqlQuery(attrs.query) : ''` with `.filter(Boolean)`. |
| `server/agent_builder/tools/manage_rule/manage_rule.ts` | `updatedData.query ? getBreachEsqlQuery(…) : undefined`. |
| `server/lib/usage/lib/get_rule_stats.ts` | Painless runtime field null-guards `rule['query']`. |
| `packages/response-ops/alerting-v2-episodes-ui/classic_alerts/apis/resolve_classic_rules.ts` | Returns `RuleResponse` with no `query` already (v1 rules). |
| `packages/response-ops/alerting-v2-schemas/src/rule_attachment_schema.ts` | Inherits optional `query` from `ruleResponseSchema` automatically. |
| `packages/response-ops/alerting-v2-schemas/src/rule_change_history_schema.ts` | Uses `z.record(z.unknown())` at runtime; snapshot type inherits `Omit<RuleResponse, 'version'>`. |
| `packages/kbn-evals-suite-alerting-v2` | Already truthiness-guards `version.query` / `customRecovery.query` / `latest.query`. |
| `server/routes/rules/rule_oas_shared_examples.ts` | Example still carries a standalone query, which remains valid. |
| `oas_docs/output/kibana.yaml` and `kibana.serverless.yaml` | Stale bundles not regenerated on this branch. |
| `server/lib/test_utils.ts` | `createRuleResponse` hardcodes a standalone query; `createRuleResponse({ query: undefined })` yields a query-less rule. |
| `packages/response-ops/alerting-v2-episodes-ui/hooks/test_utils.tsx` | Uses `as RuleResponse` cast; no type error. |
| `packages/response-ops/alerting-v2-rule-form/form/utils/is_non_representable.test.ts` | Uses `as unknown as RuleResponse` cast; no type error. |
| `public/services/rules_api.ts` and Scout `rules_api_service.ts` | Only type HTTP responses as `RuleResponse`; do not dereference `query`. |
| `packages/security-detection-rule-schema/*` | Only produces `GeneratedQuery`; never reads `RuleResponse.query`. |

---

## Precondition flagged (not fixed here)

`server/saved_objects/schemas/rule_saved_object_attributes/v1.ts` declares
`query` as required (`schema.oneOf([…])`), so the write path physically cannot
persist a query-less rule yet.  A new model version must make it
`schema.maybe(…)` and `transformCreateRuleBodyToRuleSoAttributes` must stop
calling `toStoredQuery(data.query)` unconditionally before any of these
consumer fixes can be exercised end-to-end.  This is tracked as the write-path
change for step 6.4 / the persistence step of Phase 6.
