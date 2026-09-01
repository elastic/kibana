# Rule Executor

> **Prerequisite:** Read the [server-level README](../../README.md) first for the plugin-wide architecture and terminology.

The rule executor is the hot path for alerting v2. It runs one rule on its Task Manager schedule, executes ES|QL, converts rows into rule events, enriches alert rules with episode state, and persists the final append-only documents into `.rule-events`.

See also: [Director](../director/README.md) and [Dispatcher](../dispatcher/README.md).

## What the rule executor owns

- Running one rule execution from start to finish
- Building the ES|QL request from rule configuration
- Streaming result rows through the execution pipeline
- Materializing breach / recovery rule events
- Invoking the director for alert rules
- Writing rule events to `.rule-events`

## What the rule executor does not own

- Notification matching or dispatch
- Policy throttling / suppression
- Long-lived alert action history

Those responsibilities belong to the dispatcher.

## Signal vs alert rules

Rules declare a `kind` of `signal` or `alert`.

- `signal` rules are observation-only. They produce rule events but skip episode lifecycle and dispatcher processing.
- `alert` rules participate in recovery semantics, episode lifecycle enrichment, and downstream notification dispatch.

That split is the most important branch in the executor.

## Architecture

The executor combines three mechanisms:

- **steps** for domain work
- **middleware** for global cross-cutting concerns
- **decorators** for step-specific wrapping when needed

```text
Task Manager
   |
   v
RuleExecutorTaskRunner
   |
   v
RuleExecutionPipeline
   |
   +--> middleware chain wraps each step
   |
   +--> WaitForResourcesStep
   +--> FetchRuleStep
   +--> ValidateRuleStep
   +--> FetchActiveGroupsStep
   +--> ExecuteRuleQueryStep
   +--> CreateAlertEventsStep
   +--> ClassifyAbsentGroupsStep
   +--> DirectorStep
   +--> StoreAlertEventsStep
```

## The most important design detail: streaming

The executor pipeline is streaming. `ExecuteRuleQueryStep` may emit multiple result batches, and downstream steps see each batch as it flows through the pipeline.

That means:

- later steps must tolerate multiple `continue` emissions for one logical execution
- `esqlRowBatch` and `alertEventsBatch` are per-batch, not global full-run accumulators
- a step must not assume it will be called exactly once per rule run

If you are adding a new step after `ExecuteRuleQueryStep`, design it with batch semantics in mind.

Streaming makes _presence_ classification (a group breached) safe to do per batch, but it makes _absence_ classification (a group did **not** breach anywhere this run) unsafe per batch: a group missing from the current batch may still breach in a later one. Recovery and no-data are absence-based, so they cannot be decided until the whole breach set is known. `ClassifyAbsentGroupsStep` handles this by forwarding every breach batch unchanged while accumulating the full-run breach set, then emitting a single classification batch after the upstream stream drains (the same emit-on-drain pattern as `withAtLeastOne` in `stream_utils.ts`).

## How one execution works

Each run starts with Task Manager task params:

- `ruleId`
- `spaceId`
- schedule metadata

`RuleExecutorTaskRunner` turns that into `RuleExecutionInput` with:

- `ruleId`
- `spaceId`
- `scheduledAt`
- `executionContext` for cancellation and scoped cleanup

`RuleExecutionPipeline` then:

1. creates initial pipeline state
2. wraps every step with the middleware chain
3. streams state through the ordered steps
4. halts early on domain reasons when appropriate

`.rule-events` writes are append-only and issued with `refresh: false`, so there is **no** end-of-run refresh: a run never reads back its own freshly written events. Documents become searchable via Elasticsearch's periodic `refresh_interval`. Downstream state resolution (director, dispatcher) instead relies on `LAST(status, @timestamp)` over previously persisted events, so the last-written event for a group wins once it is visible. This is what lets the absence-based classification defer to stream end without depending on within-run read-after-write visibility.

## Rule configuration

Rules are saved objects. Relevant attributes include:

- `kind`
- `metadata`
- `schedule`
- `query` — the new nested shape (see below)
- `grouping`
- `state_transition`
- server-managed flags such as `enabled`

The persisted shape lives in `saved_objects/schemas/rule_saved_object_attributes/`. API schemas live in `@kbn/alerting-v2-schemas`.

### Query shape

`query` is a discriminated union on `format`:

- `format: 'composed'` — `base` ES\|QL plus pipe-less segments for each phase.
- `format: 'standalone'` — independent ES\|QL queries for each phase.

In both formats the `breach` sub-object is required; the `recovery` sub-object is optional. Recovery and no-data behaviour are now controlled by **top-level rule fields** rather than fields nested inside `query`:

| Sub-object | Required? | Behavior |
| --- | --- | --- |
| `breach` | Yes | The breach query (composed: `segment`; standalone: `query`). Produces breached events on matching rows. |
| `recovery` | Optional | The recovery query payload only. Present when `recovery_strategy` is `'query'` and holds the leaf field: `segment` for composed, `query` for standalone. No `strategy` field — that is the top-level `recovery_strategy`. |
| `no_data` | Optional (standalone only) | Data-presence query. Present when `no_data_strategy` is not `'none'`. Composed queries do not have a `no_data` block. |

Top-level strategy fields (sit alongside `query` on the rule, not inside it):

| Top-level field | Values | Meaning |
| --- | --- | --- |
| `recovery_strategy` | `'no_breach'` \| `'query'` \| `'none'` | How the executor detects recovery. `'none'` disables recovery entirely. |
| `no_data_strategy` | `'emit'` \| `'last_known_status'` \| `'recover'` \| `'none'` | How the executor reacts when an active group is absent from the breach batch and the `no_data` query reports no data. See [No-data behavior](#no-data-behavior). |

## Operational parameters

| Parameter | Value | Source |
| --- | --- | --- |
| Task type | `alerting_v2:rule_executor` | [`task_definition.ts`](task_definition.ts) |
| Task timeout | `xpack.alerting_v2.rules.run.timeout`, defaults to `DEFAULT_RULE_EXECUTION_TIMEOUT` (`5m`) | [`task_definition.ts`](task_definition.ts) |
| Schedule | Per rule | [`schedule.ts`](schedule.ts) |
| Max alerts per run | `xpack.alerting_v2.rules.run.alerts.max`, default and ceiling `10000` | [`config.ts`](../../config.ts) |
| Max groups per execution | `xpack.alerting_v2.rules.run.maxGroupsPerExecution`, default `10000`, ceiling tied to `alerts.max` | [`config.ts`](../../config.ts) |
| Max JSON query rows | Internal `NON_STREAMING_MAX_ROWS` (`1000`); applied on the JSON path as `LIMIT min(alerts.max, NON_STREAMING_MAX_ROWS)` | [`config.ts`](../../config.ts) |
| ES\|QL response format | `xpack.alerting_v2.esql.responseFormat`, `json` or `arrow`, defaults to `json` | [`config.ts`](../../config.ts) |

`xpack.alerting_v2.rules.run.timeout`, when set, applies uniformly to the rule executor task. The rule executor task definition owns this via its `resolveTimeout` hook, which resolves the value as `config → DEFAULT_RULE_EXECUTION_TIMEOUT`; other task types (dispatcher, telemetry, API-key invalidation) omit the hook and keep their static `timeout`. The resolved value is applied where tasks are registered with Task Manager in [`setup/bind_tasks.ts`](../../setup/bind_tasks.ts).

`ExecuteRuleQueryStep` unconditionally appends `\| LIMIT <max>` to the breach query before execution. The LIMIT is `alerts.max` on the Arrow path and `min(alerts.max, NON_STREAMING_MAX_ROWS)` on the JSON path, so a transport choice cannot silently change the product-level alerts cap. ES|QL takes the min across multiple `LIMIT` commands, so an author-supplied smaller limit still wins.

`CreateAlertEventsStep` caps the number of distinct `group_hash` values a single execution can produce at `maxGroupsPerExecution`. The batch builder tracks the group set across every streamed batch of one run; once the cap is reached, rows that would introduce a **new** group are dropped (rows for already-seen groups still pass) and a single warning is logged for the run.

The cap only ever drops groups that have **no existing episode** — groups that were already active at the start of the run always pass, even past the cap. To do this, `FetchActiveGroupsStep` fetches the rule's active groups up front for every episode-tracked (`kind: 'alert'`) rule and threads them onto `state.activeGroups` so both `CreateAlertEventsStep` (for the cap) and `ClassifyAbsentGroupsStep` reuse the result instead of re-querying.

`xpack.alerting_v2.esql.responseFormat` selects how `QueryService.executeQueryStream` fetches results. `json` (default) runs the single-shot JSON query and yields the full result set as one in-memory batch; `arrow` streams self-contained Arrow record batches.

## Pipeline state

`RulePipelineState` in `types.ts` is the data contract between steps.

| Field | Produced by | Meaning |
| --- | --- | --- |
| `input` | Pipeline / task runner | Rule id, space id, schedule, and execution context. |
| `rule` | `FetchRuleStep` | Current rule document. |
| `queryPayload` | `ExecuteRuleQueryStep` | ES\|QL query/filter/params for the current run. |
| `esqlRowBatch` | `ExecuteRuleQueryStep` | One streamed batch of ES\|QL rows. |
| `alertEventsBatch` | Event-creation steps and director | Materialized rule events for the current batch. |
| `activeGroups` | `FetchActiveGroupsStep` | The rule's active groups, fetched once for every `kind: 'alert'` rule (bounded by `maxGroupsPerExecution`) so the group cap never drops one; reused by `CreateAlertEventsStep` and `ClassifyAbsentGroupsStep`. |

## Execution steps

Step order is defined in `setup/bind_rule_executor.ts`.

| # | Step | Responsibility |
| --- | --- | --- |
| 1 | `WaitForResourcesStep` | Ensure required Elasticsearch resources exist before doing work. |
| 2 | `FetchRuleStep` | Load the current rule saved object. |
| 3 | `ValidateRuleStep` | Halt early if the rule cannot run, for example because it is disabled. |
| 4 | `FetchActiveGroupsStep` | Fetch the rule's active groups once for every `kind: 'alert'` rule (bounded by `maxGroupsPerExecution`) and thread them onto `state.activeGroups`. |
| 5 | `ExecuteRuleQueryStep` | Build and run ES\|QL, emitting streamed row batches. |
| 6 | `CreateAlertEventsStep` | Turn a row batch into breached rule events (per batch). |
| 7 | `ClassifyAbsentGroupsStep` | Forward every breach batch unchanged while accumulating the full-run breach set. Once the stream drains, run the data-presence and recovery queries once and emit recovery / `no_data` / continued-`breached` events for the active groups absent from that set, as a single final batch. No-op for `signal` rules and when both `recovery_strategy` and `no_data_strategy` are `'none'`. |
| 8 | `DirectorStep` | Enrich alert-type events with episode state. |
| 9 | `StoreAlertEventsStep` | Persist the batch into `.rule-events`. |

The rule executor runs whenever the plugin is enabled (`xpack.alerting_v2.enabled`). The `alerting:v2:enabled` advanced setting gates only the user-facing surface (UI + APIs), not core engine execution, so rules keep producing events even while the UI and APIs stay hidden.

## How recovery and no-data fit together

For an alert rule with recovery and/or no-data enabled, `ClassifyAbsentGroupsStep` sets the correct rule-event `status` for every active group that is absent from the **full-run** breach set (all groups that breached in any batch this run, not just the last batch). It runs the three sub-classifications — data-presence detection, recovery, and no-data — once, after the breach stream drains. The `recovery_strategy` is the rule executor's job (it decides `recovered` vs continued `breached`); the `no_data_strategy` is the director's job (it maps a `no_data` event to an episode status).

Three signals drive the decision per active group:

- **B** — the group breached anywhere this run (present in the accumulated full-run breach set, from any `CreateAlertEventsStep` batch).
- **R** — the group matched the recovery query (`recovery_strategy: 'query'` only).
- **N** — the group is reported as still having data by the data-presence (`no_data`) query, run once via the `detectDataPresence` helper.

### Decision tables (source of truth)

`1` means the query returned the group; `0` means it did not. For `N`, `1` = data present, `0` = no data.

**Table 1 — `recovery_strategy: 'no_breach'`**

| B | N | Rule event | Why |
| --- | --- | --- | --- |
| 0 | 0 | `no_data` | Not breaching, and no data at all. |
| 0 | 1 | `recovered` | Not breaching, but data confirmed present — recovering. |
| 1 | 0 | `breached` | Breach matched even though the no_data query reported no data. Breach wins. |
| 1 | 1 | `breached` | Ordinary breach. |

**Table 2 — `recovery_strategy: 'query'`**

| B | R | N | Rule event | Why |
| --- | --- | --- | --- | --- |
| 0 | 0 | 0 | `no_data` | No underlying data exists. |
| 0 | 0 | 1 | `breached` | Data exists but neither breach nor recovery matched (e.g. a value in the gap between thresholds). Keep breaching until the recovery threshold is met. |
| 0 | 1 | 0 | `recovered` | Recovery query matched; a concrete query wins over the no_data check. |
| 0 | 1 | 1 | `recovered` | Ordinary recovery. |
| 1 | x | x | `breached` | Breach wins. `110` / `111` (breach and recovery both match) indicate a misconfigured rule. |

Mismatch rows where a concrete query wins (`10` in table 1; `100` / `010` / `110` in table 2) need no special handling: a breaching group is never "absent" from the full-run breach set, and a recovery-query match writes `recovered` first, so the no-data classification then skips it.

The three sub-classifications below all run inside `ClassifyAbsentGroupsStep` once the breach stream drains — they are no longer separate pipeline steps.

## Data-presence detection (`detectDataPresence` helper)

Runs once at drain, before recovery. For `kind: alert` rules it executes the data-presence query and returns the set of group hashes that still have data:

1. Standalone rules use the configured `query.no_data` block. The API schema requires this block whenever `no_data_strategy` is not `'none'`.
2. Composed rules use `base` — `breach.segment` is what filters `base` down to breaching rows, so any group that appears in `base` results has data.

The helper is not invoked (and the query is skipped for performance) when `no_data_strategy` is `'none'`, or defensively when a stale saved object has no `query.no_data` block. In those cases the data-presence set stays `undefined` and the classifier falls back to its data-presence-agnostic behavior.

## Recovery behavior

Recovery runs after data-presence detection, so the data-presence set is available. It only applies to `kind: alert` rules and is optional — a rule with `recovery_strategy: 'none'` (or none) never emits recovery events.

### `no_breach` recovery

Selected when `recovery_strategy === 'no_breach'`. The executor:

1. queries `.rule-events` for group hashes that still have non-inactive episode state (once, via `fetchActiveAlertGroupHashes`)
2. emits one `recovered` event for each active group that is absent from the full-run breach set **and still has data** — table 1 row `01`

Absent groups with no data (row `00`) are left for the no-data classification. When no data-presence result is available (`no_data_strategy: 'none'`), it falls back to recovering every absent group. No `query.recovery` block is needed for this mode.

### `query` recovery

Selected when `recovery_strategy === 'query'`. The executor runs the configured recovery query — composed `base` + `query.recovery.segment`, or standalone `query.recovery.query` — via the `executeRecoveryQuery` helper and emits `recovered` events for rows whose computed `group_hash` matches an active group, **excluding any group that breached anywhere this run** (breach wins — table 2 rows `110` / `111`). It does not consult data presence: a concrete recovery-query match recovers even if the no_data query disagrees (row `010`).

Recovered documents are added to the final classification batch alongside the no-data results, then flow through `DirectorStep` and storage.

## No-data behavior

No-data classification runs after recovery and classifies the active groups that are still absent from the full-run breach set, using the data-presence set. It only runs for `kind: alert` rules and is skipped entirely when no data-presence result is available (`no_data_strategy: 'none'`, or a stale saved object with no `query.no_data` block).

### Recovery takes priority

Groups already resolved this run — present in the full-run breach set or in the `recovered` set produced above — are excluded. Only **unresolved** absent groups are classified:

- **No data** (absent from the data-presence set): emit a `no_data` event (table 1 row `00`, table 2 row `000`). The director's FSM maps it to an episode status based on `no_data_strategy`.
- **Data present** and `recovery_strategy: 'query'`: emit a continued `breached` event with an empty `data` payload (table 2 row `001`) so the rule keeps breaching until the user's recovery threshold is met. Under `no_breach` these groups already recovered above, so this branch only applies to `query`.

### `no_data_strategy` outcomes

For a `no_data` event, the director's FSM decides the next episode status. There is no `'no_data'` episode status; the branch lives in `BasicTransitionStrategy.getNextState`.

| `no_data_strategy` | Episode status the FSM lands on |
| --- | --- |
| `'emit'` | Sets the episode to `'active'` so downstream consumers (dispatcher, actions) keep treating the group as live during the data gap. |
| `'last_known_status'` | Preserves the prior episode status (e.g. an `active` episode stays `active`). |
| `'recover'` | Mirrors the `'recovered'` FSM transitions, moving the episode toward `inactive` via the normal lifecycle. |
| `'none'` | The data-presence query is skipped and no `no_data` event is produced; the episode drifts out of lookback windows over time. |

## Severity behavior

Severity is a best-effort enrichment applied when the executor materializes
breached rule events in `CreateAlertEventsStep`.

The framework supports the following fixed severity values:

- `info`
- `low`
- `medium`
- `high`
- `critical`

Rules do **not** define arbitrary framework severities. Instead, the rule's
ES\|QL query is expected to map source data into one of the supported values and
emit that result as a `severity` column.

### How extraction works

For each breached ES\|QL row, the executor:

1. Looks for a `severity` column in the row payload returned by the ES\QL query.
2. Skips enrichment if the value is not a string.
3. Lowercases the string value.
4. Checks whether the normalized value matches the fixed supported set.
5. If it matches, writes it to the top-level event field `severity`.
6. If it does not match, leaves the top-level field unset.

### Important constraints

- Severity is only considered for `breached` events.
- `recovered` events do not carry severity.
- The original ES\|QL row is still stored in `data`, so `data.severity`
  is preserved even when the top-level `severity` field is absent or normalized.
- Unsupported values never fail the rule execution.

## Halt reasons

`HaltReason` is defined in `types.ts`.

| Reason | Meaning |
| --- | --- |
| `rule_deleted` | The saved object no longer exists. |
| `rule_disabled` | The rule is present but disabled. |
| `state_not_ready` | A step ran without required upstream state. Usually indicates ordering or stream wiring misuse. |

## Middleware vs decorators

| Mechanism | Use it for | Current examples |
| --- | --- | --- |
| Middleware | Global cross-cutting behavior for every step | cancellation, APM, error handling |
| Decorators | Optional wrapping for selected steps | step-specific extensions without changing middleware scope |

Choose the smallest tool that matches the concern.

## When to add a new step

Add a step when you need a new domain phase in the rule execution pipeline, especially if it:

- introduces a new piece of pipeline state
- needs to happen in a precise order relative to recovery or storage
- should remain understandable as a standalone unit of work

Do **not** add a step when:

- the logic is really global middleware
- the logic belongs inside the director
- the logic is only about notifications after events are written

## Creating a new rule executor step

### Step 1: Create the step class

```typescript
import { injectable } from 'inversify';
import type { PipelineStateStream, RuleExecutionStep } from '../types';
import { mapStep, requireState } from '../stream_utils';
import type { RuleResponse } from '../../rules_client';

@injectable()
export class MyNewStep implements RuleExecutionStep {
  public readonly name = 'my_new_step';

  public executeStream(input: PipelineStateStream): PipelineStateStream {
    return mapStep(input, async (state) => {
      const logger = state.logger.withLabels({ step: this.name });
      const requiredState = requireState(state, ['rule']);

      if (!requiredState.ok) {
        logger.debug({ message: 'State not ready, halting' });
        return requiredState.result;
      }

      const { rule } = requiredState.state;
      const myResult = await this.doSomething(rule);

      return {
        type: 'continue',
        state: { ...requiredState.state, myNewField: myResult },
      };
    });
  }

  private async doSomething(_rule: RuleResponse): Promise<Record<string, unknown>> {
    return {};
  }
}
```

### Step 2: Extend pipeline state if needed

```typescript
export interface RulePipelineState {
  readonly input: RuleExecutionInput;
  readonly rule?: RuleResponse;
  readonly queryPayload?: QueryPayload;
  readonly esqlRowBatch?: ReadonlyArray<Record<string, unknown>>;
  readonly alertEventsBatch?: ReadonlyArray<AlertEvent>;
  readonly myNewField?: Record<string, unknown>;
}
```

### Step 3: Export and bind it in order

Add the export to `steps/index.ts`, then register it in `setup/bind_rule_executor.ts`.

```typescript
bind(RuleExecutionStepsToken).to(WaitForResourcesStep).inSingletonScope();
bind(RuleExecutionStepsToken).to(FetchRuleStep).inRequestScope();
bind(RuleExecutionStepsToken).to(ValidateRuleStep).inSingletonScope();
bind(RuleExecutionStepsToken).to(FetchActiveGroupsStep).inRequestScope();
bind(RuleExecutionStepsToken).to(ExecuteRuleQueryStep).inRequestScope();
bind(RuleExecutionStepsToken).to(CreateAlertEventsStep).inSingletonScope();
bind(RuleExecutionStepsToken).to(MyNewStep).inSingletonScope();
bind(RuleExecutionStepsToken).to(ClassifyAbsentGroupsStep).inRequestScope();
bind(RuleExecutionStepsToken).to(DirectorStep).inSingletonScope();
bind(RuleExecutionStepsToken).to(StoreAlertEventsStep).inSingletonScope();
```

Binding order is execution order. Match neighboring scope conventions unless you have a clear reason not to.

### Step 4: Add focused tests

```typescript
import { MyNewStep } from './my_new_step';
import {
  collectStreamResults,
  createPipelineStream,
  createRulePipelineState,
  createRuleResponse,
} from '../test_utils';

describe('MyNewStep', () => {
  it('continues with data when successful', async () => {
    const step = new MyNewStep();

    const stream = step.executeStream(
      createPipelineStream([createRulePipelineState({ rule: createRuleResponse() })])
    );

    const [result] = await collectStreamResults(stream);

    expect(result.type).toBe('continue');
    expect(result.state).toHaveProperty('myNewField');
  });
});
```

## Creating new middleware

Middleware is the right extension point for global concerns like tracing, timing, or cancellation-aware instrumentation.

```typescript
import { inject, injectable } from 'inversify';
import type { RuleExecutionMiddlewareContext, RuleExecutionMiddleware } from './types';
import type { PipelineStateStream } from '../types';
import {
  LoggerServiceToken,
  type LoggerServiceContract,
} from '../../services/logger_service/logger_service';

@injectable()
export class StepCompletionMiddleware implements RuleExecutionMiddleware {
  public readonly name = 'step_completion';

  private readonly logger: LoggerServiceContract;

  constructor(@inject(LoggerServiceToken) loggerService: LoggerServiceContract) {
    this.logger = loggerService.forSubsystem('ruleExecutor');
  }

  public execute(
    ctx: RuleExecutionMiddlewareContext,
    next: (input: PipelineStateStream) => PipelineStateStream,
    input: PipelineStateStream
  ): PipelineStateStream {
    const stream = next(input);
    const logger = this.logger.withLabels({ step: ctx.step.name });

    return (async function* () {
      try {
        for await (const result of stream) {
          yield result;
        }
      } finally {
        logger.debug({ message: 'Step completed' });
      }
    })();
  }
}
```

Middleware wraps the stream rather than mapping over state, so it injects the logger service directly — unlike steps, which log through `state.logger`. Keep timings out of messages and labels; `ApmMiddleware` already spans each step.

Register middleware in `setup/bind_rule_executor.ts` on `RuleExecutionMiddlewaresToken`. Binding order defines wrapping order.

## Current middleware

| Middleware | Purpose |
| --- | --- |
| `CancellationBoundaryMiddleware` | Cooperative cancellation / abort handling |
| `ApmMiddleware` | APM spans around step execution |
| `ErrorHandlingMiddleware` | Centralized logging for step failures |

## Testing guidance

Useful coverage points:

- `steps/*.test.ts` for step-local logic
- `execution_pipeline.test.ts` for pipeline ordering and halt semantics
- middleware tests for cross-cutting behavior
- `build_alert_events.test.ts`, `queries.test.ts`, and related helpers for event/query correctness

## Safe contribution guidelines

- Preserve the streaming contract. That is the easiest place to introduce subtle bugs.
- Prefer `requireState(...)` and explicit halts over assuming a field exists.
- Keep rule execution focused on event production. If a change is really about lifecycle transitions, move toward the director. If it is really about notifications, move toward the dispatcher.
- If you change stored event shape, verify the resources schema and downstream readers together.