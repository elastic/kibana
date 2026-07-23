# Significant Events Live Evaluations

Full end-to-end replay evaluations for the Significant Events pipeline: from replayed logs, through detection and discovery, to the significant events the product raises. Each stage is scored separately, so a failure points at the stage that caused it.

This suite is intentionally **separate** from [`@kbn/evals-suite-significant-events`](../kbn-evals-suite-significant-events/README.md) (which scores each LLM stage in isolation and runs on PRs and the weekly schedule). The replay evals are slow and destructive, so this suite is registered as **manual-only** — no weekly schedule, excluded from `evals:all`, and it only runs when triggered explicitly (see [Running](#running)). It reuses the main suite's replay infrastructure, dataset ground truth, and discovery evaluators through that package's entry point.

> **Warning — destructive: run against a dedicated eval cluster only.**
> Between scenarios the specs wipe ALL documents from the live pipeline data streams (`.rule-events`,
> `.significant_events-detections/-discoveries/-events`, and the knowledge-indicators stream),
> delete the managed `logs` stream, and the live replay spec additionally deletes **every alerting
> v2 rule in the space** (`_delete_by_query` with `match_all`) and overrides the significant-events
> inference feature settings for the duration of the run. Anything a shared cluster has in those
> stores is lost.

## Specs

| Spec | What it does |
| --- | --- |
| `evals/replay_seeded/replay_seeded.spec.ts` | Seeded replay: canonical rule-backed queries are seeded and `.rule-events` signals are synthesized from them; detection, discovery, and triage run for real. Deterministic uuid-based scoring. Minutes per scenario. |
| `evals/replay_live/replay_live.spec.ts` | Live replay: no shortcuts. Real LLM onboarding installs real alerting rules, the incident tail streams at 1x wall clock while they fire, and the product orchestrator handles detection -> discovery -> triage. ~30-45 minutes per scenario. |

## Seeded replay

`evals/replay_seeded/replay_seeded.spec.ts` chains every pipeline stage against the live product instead of testing stages in isolation:

```
replay logs (timestamps shifted to now)
  -> seed KIs (snapshot features + canonical rule-backed queries with synthetic rule ids)
  -> synthesize `.rule-events` signals (bucketed ES|QL per canonical query)
  -> execute the `system-significant-events-detection` managed workflow (real change-point scan)
  -> discovery agent via /converse over the detections the workflow actually produced
  -> execute the `system-significant-events-triage` managed workflow (judge writes events)
  -> score `.significant_events-events`
```

Design notes:

- No Alerting rules are installed and no real-time waiting happens: the change-point scan only reads rule-backed KI query links and `.rule-events` signals, both of which the spec seeds. Canonical queries all sit in the critical severity band so the scan honours the lookback/bucket-interval the spec sizes to the replayed window.
- Discoveries written by the agent's `discovery_write` tool persist to the live discoveries stream, which is exactly what triage picks up — the discovery-to-judge handoff is the real product path.
- Pipeline data streams are wiped per scenario, and scenarios run serially.
- Datasets: bank-of-anthos only for now (`ledger-db-disconnect` checks recall — the cascade must end as an open event; `healthy-baseline` checks precision — no open events allowed).

Checkpoint scoring (`src/evaluators/replay_seeded/`):

- `detection_match` (CODE): per-rule F1 of produced detections vs `expected_detection_rule_uuids`, with an allowlist for benign volume rules. Detections with `stationary` or `indeterminable` change-point types never count.
- Discovery-stage evaluators reused from the main suite (grouping correctness, evidence collection, tool usage, ES|QL grounding, calibration).
- `event_outcome` (CODE): F1 over expected events — recall on expected entries (matched by underlying discovery rule_uuids + acceptable status), precision on unjustified `open` events.
- `funnel_completion` (CODE): fraction of stages (signals, detections, discoveries, events) that produced their expected output — a single trend metric for dashboards.
- `scenario_criteria` (LLM): scenario criteria judged over the full funnel output.

## Live replay

`evals/replay_live/replay_live.spec.ts` removes every shortcut the seeded spec takes. Nothing is
seeded and nothing is synthesized — the product does all the work:

```
replay ONLY the pre-incident baseline (shifted to end at ~now)
  -> run the real onboarding workflow: LLM feature extraction + query generation, then _promote
     (real alerting rules installed for every eligible generated query)
  -> stream the incident tail at 1x wall clock; the installed rules fire naturally and write
     real signals into `.rule-events`
  -> trigger the orchestrator (detect -> discover -> triage) and poll it to completion
  -> collect detections, discoveries, events, and the discovery/judge agent conversations
     (fetched from the Agent Builder API for trajectory scoring)
```

How it differs from the seeded spec:

| | Seeded replay | Live replay |
| --- | --- | --- |
| Queries | Canonical, seeded as KI docs | LLM-generated by real onboarding |
| Signals | Synthesized from bucketed ES\|QL | Real rule executions over a streamed tail |
| Detection | Real workflow, manually executed | Real workflow via the orchestrator |
| Discovery | Agent via `/converse` | Real discovery workflow (conversation fetched afterwards) |
| Judge | Standalone triage workflow | Real triage via the orchestrator |
| Deterministic scoring | uuid-based F1 per checkpoint | Count/status funnel + open-event outcome (no uuid catalog exists) |
| Model | Agents on suite connectors | ALL four LLM stages pinned to the evaluated `--model` connector |
| Wall clock | Minutes per scenario | ~30-45 minutes per scenario (onboarding + 1x tail streaming + orchestrator) |
| Determinism | High (regression signal) | Low by design — measures the real product experience |

Notes and known properties:

- Real alerting rules only evaluate `(now - lookback, now]` (2m for critical-cadence rules, 10m otherwise) — there is no backfill. That is why the incident tail must be streamed in real time; generated queries in the 60-79 severity band (below the critical threshold of 80) run on a 5m cadence and may not accumulate enough change-point buckets within a short tail. This is a real product property, not an eval bug.
- Per-scenario `live` config lives in the scenario files (`incident_onset_offset_minutes`, `max_tail_minutes`, live criteria) — see [src/scenarios/bank_of_anthos](src/scenarios/bank_of_anthos). Captured snapshots are SHORT (~3 min healthy + ~5 min failure, so 10-20 min total): the onset offset must leave real baseline data before the cut (the replay fails fast when <5% of docs land in the baseline), and `max_tail_minutes` must be >= the offset or the end of the snapshot — where the incident lives — is dropped from the stream (the streamer warns loudly).
- Onboarding variance is the point: on a bad run the generated queries never cover the incident signatures and the funnel shows the drop at the signals/detections stage.
- The generic trace-based token/latency evaluators are NOT attached: the LLM calls happen inside server-side workflow executions whose spans carry Kibana's trace ids, not the eval's, so trace queries always come back empty. Cost/latency is scored deterministically instead by the `live_*` usage evaluators — onboarding tokens from the workflow status payload, discovery/judge tokens and LLM-call counts from conversation `model_usage`, tool calls from the fetched conversation steps, and wall-clock stage durations.

## Running

The suite is registered in `.buildkite/pipelines/evals/evals.suites.json` as `significant-events-live`, but with `manualOnly: true`: it has no weekly schedule and `evals:all` skips it. It only runs when triggered deliberately — the `evals:significant-events-live` PR label, the on-demand Buildkite pipeline (`EVAL_SUITE_ID=significant-events-live`), or locally:

```bash
# prerequisites are the same as the main suite: GCS_CREDENTIALS + a Scout server
export GCS_CREDENTIALS='{"type":"service_account",...}'
node scripts/scout.js start-server --arch stateful --domain classic --serverConfigSet evals_tracing

# seeded replay (minutes per scenario)
SIGEVENTS_DATASET=bank-of-anthos node scripts/evals run \
  --suite significant-events-live \
  --project <connector-id> \
  --judge <gemini-3-pro-connector-id> \
  replay_seeded.spec.ts

# live replay (~30-45 min per scenario)
SIGEVENTS_DATASET=bank-of-anthos node scripts/evals run \
  --suite significant-events-live \
  --project <connector-id> \
  --judge <gemini-3-pro-connector-id> \
  replay_live.spec.ts
```

There are no env-flag gates: invoking this suite is the opt-in. Omit the trailing spec filter to run both specs. `SIGEVENTS_DATASET` and `SIGEVENTS_SNAPSHOT_RUN` behave exactly as in the main suite.
