# Rule executor metrics

Per-run metric collection for the rule executor. Collects lightweight counters
across streaming batches, exposes a finalized snapshot on the pipeline result,
and publishes a `rule.execution.completed` event on the alerting bus so
asynchronous subscribers (event log, usage counters, OTel exporter) can react
without coupling to Task Manager state.

## How collection works

1. `RuleExecutionPipeline.execute()` asks `MetricCollectorFactory` for a fresh
   collector. The collector holds a UUID (`executionId`), a `startedAt`
   timestamp and a `Map<string, number>` for counter aggregation.
2. The **write-only** view of the collector is threaded through
   `RuleExecutionMiddlewareContext.collector`. Steps cannot see it — only the
   middleware can, and only via the writer contract.
3. `MetricsMiddleware` is registered **last** in the middleware chain so it
   wraps the raw step output (before any other middleware transforms it).
4. On every `{ type: 'continue' }` emission of a step, the middleware invokes
   every recorder that observes that step. Each recorder receives the current
   pipeline state, the ephemeral emission `meta`, the step name and the
   emission index.
5. Recorder failures are caught and logged as warnings. Telemetry must never
   break a rule execution.
6. At the end of the run (success, halt, or thrown), the pipeline `finalize`s
   the collector, returns the snapshot on `RuleExecutionPipelineResult.metrics`
   AND publishes it on the alerting bus in the `finally` block.

Steps never import the collector. They contribute to metrics via one of two
per-emission channels on `EmissionMeta`:

- **`meta.counters`** — the DIRECT channel. Step names the metric and its
  value. Consumed generically by `EmittedCountersRecorder` (observes `'all'`),
  which merges every key into the collector without knowing what any of them
  mean.
- **`meta.observations`** — the RAW channel. Step exposes a typed,
  domain-shaped payload; a domain-aware recorder derives metrics from it.
  Adding a new observation kind extends `EmissionObservations` (in
  `rule_executor/types.ts`).

`EmissionMeta` is per-emission and never threaded forward — the next step
rebuilds its own emission, so `meta` never reaches `bulkIndexDocs` or any
persisted document.

## Two ways to add a metric

Adding a metric is done by the **owner** of the datum. Both paths keep the
collector, middleware, forwarder, and pipeline closed for modification.

### 1. Step-emitted counter (the common case)

Use when the step already knows the count as part of its natural output
(e.g. batch length, transitions applied). Steps depend only on the name
catalog — a value-only import.

1. Add the counter name to `RULE_EXECUTION_COUNTERS` in
   `metrics/counters.ts`.
2. In the owning step, emit the counter on `meta.counters` on the
   `continue` result:

   ```ts
   yield {
     type: 'continue',
     state,
     meta: {
       counters: { [RULE_EXECUTION_COUNTERS.myCounter]: n },
     },
   };
   ```

3. That's it. `EmittedCountersRecorder` (observes `'all'`) forwards it into
   the collector for you. No recorder file, no DI change.

### 2. Derived / cross-step recorder (the exception)

Use when the datum is computed from `state` the step already exposes
(filters, joins across fields), or from a typed observation emitted on
`meta.observations`, or spans multiple steps and doesn't belong in any
single step. Requires **no step change** for the state-derived case; for
observation-driven metrics, the producing step publishes to
`meta.observations` and the recorder consumes it (see
`PersistedRuleEventsRecorder` for a worked example).

1. Add the counter name to `RULE_EXECUTION_COUNTERS`.
2. Implement a `MetricRecorder` that observes the relevant step(s) and reads
   `ctx.state` (and/or `ctx.meta`) to compute the datum:

   ```ts
   @injectable()
   export class CriticalSignalsRecorder implements MetricRecorder {
     public readonly name = 'critical_signals';
     public readonly observes = { stepName: 'create_alert_events' };
     public record(collector: MetricCollectorWriter, { state }: MetricRecorderContext) {
       const n = state.alertEventsBatch?.filter((e) => e.severity === 'critical').length ?? 0;
       collector.increment(RULE_EXECUTION_COUNTERS.criticalSignalsGenerated, n);
     }
   }
   ```

3. Bind it under `MetricRecorderToken` in `setup/bind_rule_executor.ts`:

   ```ts
   bind(MetricRecorderToken).to(CriticalSignalsRecorder).inSingletonScope();
   ```

## Decision rule

- The datum is a natural product of one step's work → **step-emitted counter**.
- The datum requires filtering / joining `state` fields, or spans multiple
  steps → **derived recorder**.

## Scale and error-handling contract

- Every `continue` emission does O(number of counters on `meta`) map writes.
- No I/O on the hot path. Recorders MUST be synchronous.
- The alerting bus dispatches on `setImmediate`, so publishing never blocks
  the pipeline.
- Recorder failures are isolated and logged; they never propagate.
- The `finally` block guarantees the completion event is emitted even on
  throw or halt.
