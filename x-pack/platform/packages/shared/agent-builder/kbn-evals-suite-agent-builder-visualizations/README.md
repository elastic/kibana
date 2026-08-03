# @kbn/evals-suite-agent-builder-visualizations

Offline LLM evals for **standalone visualization generation** in Agent Builder — the `visualization-creation` skill and the `platform.core.create_visualization` tool.

It drives the full `/api/agent_builder/converse` flow, extracts the ES|QL backing each generated visualization from the `create_visualization` tool result, and scores it.

## What it evaluates

Per [issue #277136](https://github.com/elastic/kibana/issues/277136), "correct" for visualization ES|QL is not the same as for analytical ES|QL. This first increment covers:

- **Visualization skill activated** (`CODE`) — the request loaded the visualization skill and called `platform.core.create_visualization` (guards against the agent answering with raw ES|QL / a table instead of a rendered visualization).
- **ES|QL Validity** (`CODE`) — the generated query parses via `@kbn/esql-language`.
- **ES|QL Execution Validity** (`CODE`) — the query executes against real sample data and (per example) returns rows. This is the tier that surfaces the fast-model regressions that motivated the suite.
- **ES|QL Functional Equivalence** (`LLM` judge) — the generated query is equivalent to the ground-truth query. Uses a calibrated three-point rubric (`equivalent` / `equivalent_with_caveats` / `not_equivalent`) with explicit allow/deny lists, ported from `@kbn/evals-suite-security-esql-generation-regression`, so cosmetic differences (aliases, interchangeable bucketing, `?_tstart`/`?_tend` vs literal ranges) earn partial credit rather than a hard 0.
- **Trajectory** — the agent routed the request to `load_skill` → `platform.core.create_visualization`.
- **Trace-based** — tokens / latency / tool-call counts from OTel spans.

Not yet covered (tracked as follow-up increments in the issue): chart-compatible-result (does the ES|QL result shape fit the requested chart type), chart-type-vs-intent, Lens/Vega-Lite config validity, and an MLLM visual-fidelity judge.

## Running

```bash
node scripts/evals start --suite agent-builder-visualizations --model <connector> --judge <connector>
# or, when a stack is already running:
node scripts/evals run --suite agent-builder-visualizations
```

## Dataset

Seed examples live inline in `evals/visualization_creation/visualization_creation.spec.ts`. Most target the `kibana_sample_data_logs` index (loaded in `beforeAll`). One example reproduces an OTel host-metrics `TS` failure seen in dashboard-level evals and targets the replayed OTel data stream (`metrics-hostmetricsreceiver.otel-default`, `system.cpu.load_average.{1m,5m,15m}` gauges). Grow this to 20–30 real prompts with ground-truth ES|QL and expected chart types.

**Gold queries follow the agent's idiom** (see `agent-builder-visualizations-server/shared/esql_instructions.ts`):

- **Categorical / metric** golds include the raw-`@timestamp` time filter (`WHERE @timestamp >= ?_tstart AND @timestamp < ?_tend`).
- **Time-series** golds express the window via the auto-bucket-count form (`BUCKET(@timestamp, 75, ?_tstart, ?_tend)` / `TBUCKET(75, ?_tstart, ?_tend)`); an extra `@timestamp` WHERE is optional and stripped before equivalence scoring.

This keeps gold and candidate structurally parallel so the equivalence evaluators measure real differences instead of cosmetic ones. The `?_tstart` / `?_tend` bind params substitute to a **now-relative** window (see `src/evaluators/esql_bind_params.ts`), which brackets both `kibana_sample_data_logs` and the GCS snapshot replay data (whose timestamps are shifted to end at `now` by the replay pipeline).

### OTel data fixture

`src/fixtures/replay.ts` uses `@kbn/es-snapshot-loader` to replay a GCS snapshot (same pattern as `@kbn/evals-suite-observability-ai`) into `logs-*`, `metrics-*`, and `traces-*` data streams. The CPU-load examples specifically guard against the failure where the agent leaves the `.1m` / `.5m` / `.15m` field paths unquoted (Elasticsearch lexes `.1m` as a numeric literal → `parsing_exception`).

To create or refresh the snapshot:

1. Start ES with `path.repo` set (e.g. `yarn es snapshot -E path.repo=/tmp/es-snapshots`)
2. Make sure `gsutil` is installed and `gcloud auth login` (or ADC) is set up
3. Run:

```bash
ELASTICSEARCH_URL=http://localhost:9200 \
ELASTICSEARCH_USERNAME=elastic \
ELASTICSEARCH_PASSWORD=changeme \
npx ts-node scripts/create_snapshot.ts
```

The script seeds synthetic `system.cpu.load_average.*` documents, verifies the `TS` query executes, snapshots `metrics-hostmetricsreceiver.otel-default` to the local filesystem, then uploads to `gs://obs-ai-datasets/viz-evals/otel-host-metrics` via `gsutil`. No GCS credentials are needed in ES — only your local `gcloud` auth is used for the upload.

## Notes

The ES|QL validity, execution, and calibrated functional-equivalence evaluators plus the `?_tstart` / `?_tend` bind-param substitution are copied from `@kbn/evals-suite-security-esql-generation-regression` because Kibana module-visibility rules forbid importing across sibling `functional-tests` suites. If a third suite needs them, consider promoting them into `@kbn/evals` (which already exports the v1 `createEsqlEquivalenceEvaluator`).
