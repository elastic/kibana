# SigEvents v2 target architecture — validation checklist

Manual acceptance path for the event-driven alerting v2 pipeline on `sigevents-target-arch`.

## Prerequisites

- Kibana with Workflows, Alerting v2, and Streams SigEvents enabled
- Managed workflows installed (including v2 workflows):
  - `system-significant-events-rule-on-rule-provision`
  - `system-significant-events-rule-on-rule-deprovision`
  - `system-significant-events-discovery-v2`

## Happy path

1. **Promote MATCH query** → base `kind: signal` rule writes to `.rule-events`
2. **Promote STATS query** → base signal rule with STATS aggregation template
3. **`alerting.ruleCreated`** (trigger filter passes) → LLM planner → rule-on-rule(s) provisioned via internal API
4. **Base rule firings** → rule-on-rule runs `CHANGE_POINT` → changepoint signals in `.rule-events`
5. **`alerting.ruleSignalsWritten` burst** → single Discovery v2 run (`concurrency: drop`), 30s debounce, fetches all changepoints from `.rule-events`
6. **`alerting_v2.create_alert`** → confirmed events visible in episodes UI (interim external-source model; see rna-program#520)
7. **Demote / delete base rule** → `alerting.ruleDeleted` → rule-on-rule children removed
8. **Trigger filter** — base rule `ruleSignalsWritten` must **not** schedule Discovery v2
9. **Debounce** — burst of N rule-on-rule triggers → one Discovery run processes all N changepoints after the 30s window

## Internal API smoke tests

```bash
# Provision (after obtaining a planner JSON plan)
curl -X POST http://localhost:5601/internal/streams/sig_events/rule_on_rule/_provision \
  -H "Content-Type: application/json" \
  -H "kbn-xsrf: true" \
  -H "x-elastic-internal-origin: kibana" \
  -u elastic:changeme \
  -d '{"baseRule": {...}, "plan": {...}}'

# Deprovision
curl -X POST http://localhost:5601/internal/streams/sig_events/rule_on_rule/_deprovision \
  -H "Content-Type: application/json" \
  -H "kbn-xsrf: true" \
  -H "x-elastic-internal-origin: kibana" \
  -u elastic:changeme \
  -d '{"monitoredRuleId": "<base-rule-uuid>"}'

# Discovery source-of-truth fetch
curl -X POST http://localhost:5601/internal/streams/sig_events/discovery_v2/_fetch_changepoints \
  -H "Content-Type: application/json" \
  -H "kbn-xsrf: true" \
  -H "x-elastic-internal-origin: kibana" \
  -u elastic:changeme \
  -d '{"lookback": "now-35s"}'
```

## Coexistence and migration (Phase 0)

### Advanced settings

| Setting | Default | Effect |
|---------|---------|--------|
| Significant Events | off | Master feature gate |
| Alerting v2 architecture | off | Selects engine for new promotions; enables auto-migration on Kibana start |

### Scenarios

| Scenario | SigEvents | v2 flag | Expected behavior |
|----------|-----------|---------|-------------------|
| **A** v1-only | on | off | v1 rules, histogram from `.alerts-streams.*`, v1 orchestrator active |
| **B** greenfield v2 | on | on | v2 rules, rule-on-rules via `alerting.ruleCreated`, histogram from `.rule-events` |
| **C** upgrade | on | off → on + restart | Auto-migrate promoted queries (v2 create + v1 delete); rule-on-rules provisioned async |
| **D** downgrade | on | on → off after C | No v1 recreation, no v2 cleanup; migrated queries unmonitored until v2 re-enabled |

### Migration status API

```bash
curl http://localhost:5601/internal/streams/sig_events/migration/_status \
  -H "kbn-xsrf: true" \
  -H "x-elastic-internal-origin: kibana" \
  -u elastic:changeme
```

### Workflow coexistence gate

Both pipeline families are installed from `install_workflows.ts` with no runtime flag gating:

- v1: Detection → Discovery → Triage (+ orchestrator cron)
- v2: `alerting.ruleCreated` → rule-on-rule provision; `alerting.ruleSignalsWritten` → discovery_v2

Prerequisite: workflow trigger types `alerting.ruleCreated` and `alerting.ruleSignalsWritten` merged (kibana#272376, kibana#272738).

## Design decisions (v1 parity)

### No v1 bootstrap / stationary detection path

v1 Detection writes a detection document when `change_point` returns **stationary** if the rule has ≥20 alerts in the lookback and no open detection episode yet (“bootstrap”). That covers newly promoted rules firing at a steady rate and chronic high-volume rules with no statistical edge.

**v2 intentionally omits this.** Rule-on-rule only emits signal rows when `CHANGE_POINT` returns a non-null `type` (spike, dip, step_change, etc.). We do not add a second rule-on-rule (or fetch-layer synthetic candidate) for “enough alerts but no changepoint”.

Rationale:

- Steady high-volume rules are usually ambient noise; v1 Discovery already treats `stationary` skeptically and often demotes.
- Ongoing incidents without a firing-pattern **change** are not the v2 trigger model — Discovery v2 is event-driven on pattern change, not raw alert volume.
- Avoids extra rules, cooldown/state parity, and LLM runs for low-value candidates.

Revisit only if product requires “investigate every newly active rule once” regardless of changepoint.

### Count-based rule-on-rule query shape

Count-based children must use `BUCKET(@timestamp, 30 seconds)` (aligned with v1 detection `bucketInterval: 30s`) and must **not** filter on `space_id`. The LLM planner prompt and `_provision` validation enforce this; plans that drift (e.g. `5 minutes`, `space_id == "default"`) are rejected.

## Known interim limitations

- Significant Event output uses `alerting_v2.create_alert` (external source) until rna-program#520
- v1 Detection/Discovery/Triage workflows remain installed alongside v2 (Phase 2 retirement deferred)
- v2 migration is one-way — disabling v2 after migration does not restore v1 rules
- Histogram switches to `.rule-events` after migration; historical v1 sparkline data is not unioned
- ES|QL `BUCKET` does not zero-fill empty intervals like v1 `date_histogram` + `extended_bounds`; dense-bucket changepoint parity is tracked separately (see rule-on-rule planner / validation docs above)
