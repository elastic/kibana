# Workload isolation research harness (RESEARCH ONLY — never merge)

Shared measurement harness for the Kibana workload isolation research programme
(`~/.agentic-work/projects/kibana/workload-isolation-research/PRD.md`). Lanes branch from
`feature/workload-isolation-harness`, add their variant, and compare against a paired baseline.

## Pieces

| Piece | Where | What |
|---|---|---|
| Research plugin | `server/` | Tier A offenders (route + TM task), Tier B replays, in-pod probes, samples endpoint. Enabled by default on this branch only. All routes `access: internal`, superuser only. |
| Research worker | `server/lib/research_worker.js` | Off-main thread: SharedArrayBuffer heartbeat sampler (stalls, longest slice), open-loop loopback HTTP probe, own CPU/heap, optional emulated supervisor (SIGKILL after N ms stall). Plain CJS: same file in dev and dist. |
| TM research channel | `task_manager/server/lib/research_channel.ts` | `diagnostics_channel` `kbn:research:task_manager`: poll cycles, claims, runs, discovery heartbeats. No-op without subscribers. |
| Contract tracer | `src/core/packages/plugins/server-internal/src/research_contract_tracer.ts` | `KBN_RESEARCH_CONTRACT_TRACER=true` only. Proxies every dependency contract; per edge calls, bytes, sync/Promise/Observable, arg/result kinds, reverse (callback) edges, serialize failures. **Never on for perf runs.** |
| Driver / store / scorecard | `harness/` | Laptop-side CLI: runs scenarios, pulls samples (pull-with-dedup across pods), writes a run dir, ingests into the research ES, derives scorecard rows. |

## Endpoints (`/internal/workload_isolation_research/*`)

`GET info` · `POST samples {cursors}` · `POST probe/_start {rps,path}` (reuses the caller's `Authorization` header, in memory only) · `POST probe/_stop` · `POST ticks/_start {intervalMs,durationS,seriesId}` · `POST ticks/_stop` · `POST offender {kind,doseMs,mode:'route'|'task',sizeMb?}` · `POST supervise {killAfterMs}` · `GET edges` · `POST edges/_reset`

Offender kinds: `cpu_spin`, `json_stringify` (repeat-stringify of an `sizeMb` payload built in yielding chunks), `regex_backtrack` (`/^(a+)+$/`, repeated), `microtask_chain`, `infinite_loop` (non-terminating; `doseMs` is only a safety cap).

## Sample sources (`research-samples`)

| source | thread | meaning |
|---|---|---|
| `probe` | worker / driver | `intended`, `sent`, `end`, `latency_ms` (from intended → no coordinated omission), `status` |
| `stall` | worker | main heartbeat gap > `stallThresholdMs` (`gap_ms` = uninterrupted slice upper bound) |
| `stall_open` | worker | stall detected live (main still blocked) |
| `gap_window` | worker | per-second max heartbeat gap (incl. ongoing stall) |
| `worker_proc` | worker | research worker thread CPU ms/s, heap (subtract from variant overhead) |
| `proc` | main | RSS, heap, external, ELU, process + main-thread CPU, event-loop delay p50/p99/max |
| `gc` | main | every GC: duration, kind |
| `tm` | main | TM `TASK_POLLING_CYCLE` / `TASK_RUN` / `TASK_CLAIM` / `TASK_MARK_RUNNING` / `DISCOVERY_HEARTBEAT` |
| `tick` | main | tiny TM task: `drift_ms` = start − intended runAt |
| `offender`, `offender_start` | main | offender window and measured `blocked_ms` |

**Serverless role split:** QAF observability projects run separate `kb-ui` and `kb-background-tasks` pods; only UI pods are routable. TM-task offenders, ticks and TM poll data live on the background pod. Every pod therefore also pushes its samples every 2 s to `.kibana-research-samples` (internal user, hidden index); the driver exports them via `POST samples_es` at the end of each run (deduplicated by boot/thread/seq, tagged `via: es_push`). Stalls > 1 s and supervisor kills are also written by the worker straight to fd 2, so they reach serverless logs (QA overview) even if the process dies.

Ring buffers: 200k entries per thread (≈ hours at default rates; a 10 s block adds ≤ 100 probe entries). The samples endpoint is served by main, so pulls stall during blocks; the worker keeps recording.

## Run locally (paired)

```bash
docker start research-es || docker run -d --name research-es -p 127.0.0.1:9250:9200 \
  -v research-es-data:/usr/share/elasticsearch/data -e discovery.type=single-node \
  -e xpack.security.enabled=false -e ES_JAVA_OPTS="-Xms1g -Xmx1g" docker.elastic.co/elasticsearch/elasticsearch:9.5.4
node scripts/es snapshot --license trial &
node scripts/kibana --dev --no-base-path --no-watch --no-optimizer &
H=x-pack/platform/plugins/private/workload_isolation_research/harness/run.js
node $H setup-store
node $H run --scenario red-demo --lane lane-0 --variant baseline-main \
  --hypothesis "..." --expected '{"probe_p99_ms_min":5000}'
```

Paired = run `--variant baseline-<sha>` and `--variant <your-variant>` back to back (ABAB if you can) on the same machine; compare scorecard rows. Note host load (`manifest.host.loadavg_*`).

## Run on QAF

```bash
export WIR_KIBANA_URL=https://<project>.kb.<region>... WIR_KIBANA_API_KEY=<key>   # never commit/log
node $H run --scenario red-demo --target qaf --qaf-project-id <id> --image-digest <sha256> --expected-pods <n>
```

The probe start / supervise / drain calls repeat `expected-pods × 4` times so the load balancer reaches every Kibana pod; rows are computed for the pod that ran the offender.

Credentials file (never commit): `WIR_KIBANA_URL`, `WIR_KIBANA_API_KEY` (QAF stack key from `qaf elastic-cloud projects describe <name> --as-json --show-credentials`), `WIR_QAF_PROJECT_ID`, and for serverless seeding `WIR_ES_URL` / `WIR_ES_API_KEY` (the plugin's seed route sets shard counts, which serverless rejects; with these set the driver seeds ES directly).

Rollout: `qaf elastic-cloud projects update-images <name> --kb-docker-image <image>` returns immediately; the new UI pod serves after ~40–60 s. `describe` keeps the old build hash — verify `GET /internal/workload_isolation_research/info` → `build_sha`. Replaced pods may keep running (and pushing) for a while.

Limits on QAF: `supervise` and `probe/_start` reach only the UI pod (background pods are not routable), so emulated supervision and HTTP probing apply to UI pods only; background-pod evidence comes from the push path.

## Comparing variants (rule)

- Local: paired ABAB, same machine, back to back; note `manifest.host.loadavg_*`.
- QAF: p99 is noisy **per pod** (CV 0.24–0.55 on identical idle projects, even in the same minute). Never compare raw p99 against a separately measured baseline; compare each run's in-pod `vs_baseline` ratios across images over ≥ 3 runs. Only p50 (CV ≈ 0.09) and TM poll cadence are stable enough to compare with the shared baseline project directly; idle longest slices on QAF range 20–570 ms, so use dose-attributable slices (offender window minus idle max) and ABAB windows.
- Derived dispersion: `node $H variance --variant-prefix <prefix> --out <file>`.

## QA overview export

```bash
set -a; . ../kibana-operational-skills/.env; set +a   # O11Y_KIBANA_QA_URL / _API_KEY, never printed
node $H overview --project-id <id> --from <iso> --to <iso> --out <file>     # logs by logger, research lines, event-loop lines
node $H overview --query 'FROM serverless-metrics-*:metrics-service.kibana-* | ...'
```

Caveats: the ops gauge `kibana.stats.process.event_loop_delay.ms` is a mean and hides single long blocks; the TM `event loop blocked … while running task X` warning names bystanders, not synchronous culprits (see Lane 0 report).

## Pre-push checklist (CI fail-fast cancels the image job)

`node scripts/lint_ts_projects --fix`, `node scripts/build_plugin_list_docs`, `node scripts/generate codeowners`, `node scripts/regenerate_moon_projects.js --update --filter @kbn/workload-isolation-research-plugin`, `node scripts/eslint --fix <paths>`, scoped `node scripts/type_check --project <tsconfig>` (check for `Found N errors`, output is ANSI-coloured). Draft PRs need a `/ci` comment. Image job ≈ 30 min. Known red on this branch: TM `task_cost_check` / `task_priority_check` integration snapshots (new research task types).

## Scenarios

`red-demo`, `tier-a-sweep`, `tier-a-stress` (30 s / 120 s), `baseline-only`, `infinite-loop-supervised`, `tier-b-alerting`, `tier-b-field-caps`, `tier-b-workflow`, `tier-b-agent-builder`, `tier-b-agent-builder-stress`, `tier-b-tracer-suite` (tracer on; never a perf run). See `harness/src/scenarios.ts`. Add one by appending to `SCENARIOS`; Tier B replays are `action` phases in `harness/src/actions.ts` (`seed`, `alerting-esql`, `field-caps`, `workflow-map`, `agent-builder`).

## Add a variant

1. Branch from `feature/workload-isolation-harness`.
2. Implement the variant; keep the research plugin, probes and sample schema untouched (add fields, never rename).
3. Run the same scenario for baseline and variant, `--variant <name>`, `--baseline-commit <sha>`.
4. `node $H scorecard --run-id <id>`; cite run IDs. Each scorecard row carries a `drill` filter into `research-samples`.

## Data store

Local ES `research-es` on `127.0.0.1:9250` (volume `research-es-data`). Data streams: `research-runs` (manifest per run, PRD fields), `research-samples`, `research-edges`, `research-scorecards`. Run directories (raw ndjson + manifest + scorecard) live under `~/.agentic-work/projects/kibana/workload-isolation-research/runs/<run_id>/` and can be re-ingested with `run.js ingest --dir`.
