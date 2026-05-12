# Rule Executor

> **Prerequisite:** Read the [server-level README](../../README.md) first for the plugin-wide architecture and terminology.

The rule executor is the hot path for alerting v2. It runs one rule on its Task Manager schedule, executes ES|QL, converts rows into rule events, enriches alert rules with episode state, and persists the final append-only documents into `.rule-events`.

See also: [Director](../director/README.md) and [Dispatcher](../dispatcher/README.md).

## What the rule executor owns

- Running one rule execution from start to finish
- Building the ES|QL request from rule configuration
- Streaming result rows through the execution pipeline
- Materializing breach / recovery / no-data rule events
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
- **middleware** for global cross-cutting concerns wrapping each step
- **events + observers** for fan-out observability (telemetry, audit, debug tracing, ...)

```text
Task Manager
   |
   v
RuleExecutorTaskRunner ─── mints executionUuid ───┐
   |                                              |
   |   emits execution_started                    |
   v                                              v
RuleExecutionPipeline               RuleExecutionObserverHub
   |                                  |   ^
   +--> middleware chain wraps step   |   | onEvent(...)
   |     (Cancellation,               |   |
   |      LifecycleEmitter,           |   +-- TelemetryObserver
   |      Apm, ErrorHandling)         |   +-- (future) AuditObserver
   |                                  |   +-- (future) ...
   +--> steps emit domain events      |
   |     via executionContext.emit ───+
   |
   +--> WaitForResourcesStep
   +--> FetchRuleStep
   +--> ValidateRuleStep
   +--> ExecuteRuleQueryStep
   +--> CreateAlertEventsStep
   +--> CreateRecoveryEventsStep
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

## How one execution works

Each run starts with Task Manager task params:

- `ruleId`
- `spaceId`
- schedule metadata

`RuleExecutorTaskRunner` mints an `executionUuid` for the run, emits `execution_started` to the observer hub, then turns the task params into `RuleExecutionInput` with:

- `ruleId`
- `spaceId`
- `scheduledAt`
- `executionUuid`
- `executionContext` carrying the abort signal and an `emit(event)` function wired to the observer hub

`RuleExecutionPipeline` then:

1. creates initial pipeline state
2. wraps every step with the middleware chain (cancellation guards, lifecycle event emission, APM spans, error handling)
3. streams state through the ordered steps; steps and services emit domain events (`batch_processed`, `episode_transitioned`, ...) along the way
4. halts early on domain reasons when appropriate
5. refreshes `.rule-events` after the stream completes so freshly written documents become searchable

Once `pipeline.execute` resolves or rejects, the task runner emits the matching terminal event (`execution_completed`, `execution_failed`, or `execution_cancelled`). The hub guarantees one terminal event per started execution.

## Rule configuration

Rules are saved objects. Relevant attributes include:

- `kind`
- `metadata`
- `schedule`
- `evaluation`
- `grouping`
- `recovery_policy`
- `state_transition`
- `no_data`
- server-managed flags such as `enabled`

The persisted shape lives in `saved_objects/schemas/rule_saved_object_attributes/`. API schemas live in `@kbn/alerting-v2-schemas`.

## Operational parameters

| Parameter | Value | Source |
| --- | --- | --- |
| Task type | `alerting_v2:rule_executor` | [`task_definition.ts`](task_definition.ts) |
| Task timeout | `5m` | [`task_definition.ts`](task_definition.ts) |
| Schedule | Per rule | [`schedule.ts`](schedule.ts) |

## Pipeline state

`RulePipelineState` in `types.ts` is the data contract between steps.

| Field | Produced by | Meaning |
| --- | --- | --- |
| `input` | Pipeline / task runner | Rule id, space id, schedule, and execution context. |
| `rule` | `FetchRuleStep` | Current rule document. |
| `queryPayload` | `ExecuteRuleQueryStep` | ES\|QL query/filter/params for the current run. |
| `esqlRowBatch` | `ExecuteRuleQueryStep` | One streamed batch of ES\|QL rows. |
| `alertEventsBatch` | Event-creation steps and director | Materialized rule events for the current batch. |

## Execution steps

Step order is defined in `setup/bind_rule_executor.ts`.

| # | Step | Responsibility |
| --- | --- | --- |
| 1 | `WaitForResourcesStep` | Ensure required Elasticsearch resources exist before doing work. |
| 2 | `FetchRuleStep` | Load the current rule saved object. |
| 3 | `ValidateRuleStep` | Halt early if the rule cannot run, for example because it is disabled. |
| 4 | `ExecuteRuleQueryStep` | Build and run ES\|QL, emitting streamed row batches. |
| 5 | `CreateAlertEventsStep` | Turn a row batch into breached rule events. |
| 6 | `CreateRecoveryEventsStep` | Append recovery events for alert rules when configured. |
| 7 | `DirectorStep` | Enrich alert-type events with episode state. |
| 8 | `StoreAlertEventsStep` | Persist the final batch into `.rule-events`. |

## Recovery behavior

Recovery is implemented in `CreateRecoveryEventsStep` after `CreateAlertEventsStep`, so the current batch already contains breach documents when recovery logic runs.

Recovery only applies to `kind: alert` rules.

### `no_breach` recovery

Default mode. The executor:

1. queries `.rule-events` for group hashes that still have non-inactive episode state
2. compares that active set to the current breach batch
3. emits one recovered event for each active group missing from the current breached set

### `query` recovery

If `recovery_policy.query.base` is configured, the executor runs a separate recovery ES|QL query and only emits recovery events for rows whose computed `group_hash` matches the active set.

### Summary

| Mode | Recovery is emitted when |
| --- | --- |
| `no_breach` | An active group is absent from the current breach batch. |
| `query` | A recovery query row matches a currently active group. |

Recovered documents are appended to `alertEventsBatch` before `DirectorStep` and storage.

## Halt reasons

`HaltReason` is defined in `types.ts`.

| Reason | Meaning |
| --- | --- |
| `rule_deleted` | The saved object no longer exists. |
| `rule_disabled` | The rule is present but disabled. |
| `state_not_ready` | A step ran without required upstream state. Usually indicates ordering or stream wiring misuse. |

## Middleware vs observers

| Mechanism | Use it for | Current examples |
| --- | --- | --- |
| Middleware | Behavior that wraps every step's stream (transformation, error handling, abort guards) | cancellation, lifecycle emission, APM, error handling |
| Observers | Pure consumers of the event stream — derive metrics, write logs, react to events without affecting the pipeline | telemetry → event_log document |

Choose the smallest tool that matches the concern. If you need to inspect or react to what happened, use an observer. If you need to wrap or transform what happens, use middleware.

## Events and observers

The executor emits a typed stream of {@link RuleExecutionEvent}s. The pipeline and middlewares emit lifecycle events (`execution_started`, `step_started`, `step_completed`, `step_cancelled`, terminal events). Steps and services emit domain events (`batch_processed`, `query_executed`, `alert_event_stored`, `episode_transitioned`, `recovery_mode_selected`, `recovery_event_built`).

Observers subscribe via DI multi-injection. The {@link RuleExecutionObserverHub} fans every event out to every observer; observer errors are caught by the hub and never affect the rule execution.

### Where events come from

Three categories, each with a different "remember to emit" answer:

| Category | Examples | Who emits | What you do |
| --- | --- | --- | --- |
| Lifecycle (universal) | `step_started`, `step_completed`, `step_cancelled`, `execution_*` | Middleware + task runner | Nothing — automatic. |
| Operation (any step that does X) | `query_executed`, `batch_processed`, `alert_event_stored` | Composition helpers in `lib/rule_executor/telemetry/` | Use the helper instead of calling the service directly (see below). |
| Domain (only this step knows) | `recovery_mode_selected`, `recovery_event_built`, `episode_transitioned` | The step or service itself | Emit explicitly via `emitEvent(...)`. |

If you can fit your new metric into one of the existing helpers, prefer that — it removes the "remember to emit" risk.

### Operation helpers — `lib/rule_executor/telemetry/`

| Helper | Wraps | Emits |
| --- | --- | --- |
| `withQueryTelemetry(input, step, () => qs.executeQuery(...))` | A single `executeQuery` call | `query_executed` on success |
| `withStreamingQueryTelemetry(input, step, qs.executeQueryStream(...))` | An `executeQueryStream` async iterable | `batch_processed` per yield, `query_executed` once at the end |
| `withAlertEventStorageTelemetry(input, docs, () => ss.bulkIndexDocs(...))` | A `bulkIndexDocs` call for alert events | `alert_event_stored` per persisted doc |

Use these from steps so the telemetry contract is satisfied by composition. The current steps pass them around like this:

```typescript
const stream = withStreamingQueryTelemetry(
  state.input,
  this.name,
  this.queryService.executeQueryStream({ query, filter, params, abortSignal })
);
for await (const batch of stream) { /* ... */ }
```

### Adding a new metric (case A — derivable from existing events)

Edit `TelemetryObserver` only. Add a switch arm for the event you need and update the `ExecutionMetricsCollector` if you're persisting a new counter. No other files change.

### Adding a new metric (case B — needs a new domain event)

1. Define a new event interface in `events/types.ts` extending `BaseEvent`, give it a unique `kind` literal, and append it to the `RuleExecutionEvent` union.
2. Emit it from the relevant step or service:

   ```typescript
   import { emitEvent } from '../events';
   import type { MyNewEvent } from '../events';

   emitEvent<MyNewEvent>(state.input.executionContext, state.input.executionUuid, {
     kind: 'my_new_event',
     foo: 42,
   });
   ```

3. Handle it in `TelemetryObserver` (or a new observer if it's a separate sink).
4. If the event is operation-shaped (i.e. "any step that does X should emit it"), consider adding a helper in `lib/rule_executor/telemetry/` and routing call sites through it, so future steps don't need to remember to emit.

### Adding a new observer (e.g. audit log, profiler, debug tracer)

1. Implement `RuleExecutionObserver`:

   ```typescript
   import { injectable } from 'inversify';
   import type { RuleExecutionEvent, RuleExecutionObserver } from '../rule_executor/events';

   @injectable()
   export class MyAuditObserver implements RuleExecutionObserver {
     public readonly name = 'audit_observer';

     public onEvent(event: RuleExecutionEvent): void {
       if (event.kind !== 'execution_completed') return;
       // ... write to audit sink
     }
   }
   ```

2. Bind it in `setup/bind_rule_executor.ts` with one line:

   ```typescript
   bind(MyAuditObserver).toSelf().inSingletonScope();
   bind(RuleExecutionObserverToken).to(MyAuditObserver).inSingletonScope();
   ```

The pipeline, the steps, the task runner, and existing observers do not change.

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
import { inject, injectable } from 'inversify';
import type { PipelineStateStream, RuleExecutionStep } from '../types';
import { mapStep, requireState } from '../stream_utils';
import type { RuleResponse } from '../../rules_client';
import {
  LoggerServiceToken,
  type LoggerServiceContract,
} from '../../services/logger_service/logger_service';

@injectable()
export class MyNewStep implements RuleExecutionStep {
  public readonly name = 'my_new_step';

  constructor(
    @inject(LoggerServiceToken) private readonly logger: LoggerServiceContract
  ) {}

  public executeStream(input: PipelineStateStream): PipelineStateStream {
    return mapStep(input, async (state) => {
      const requiredState = requireState(state, ['rule']);

      if (!requiredState.ok) {
        this.logger.debug({ message: `[${this.name}] State not ready, halting` });
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
bind(RuleExecutionStepsToken).to(ExecuteRuleQueryStep).inRequestScope();
bind(RuleExecutionStepsToken).to(CreateAlertEventsStep).inSingletonScope();
bind(RuleExecutionStepsToken).to(MyNewStep).inSingletonScope();
bind(RuleExecutionStepsToken).to(CreateRecoveryEventsStep).inRequestScope();
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
  createRuleExecutionInput,
  createRuleResponse,
} from '../test_utils';
import { createLoggerService } from '../../services/logger_service/logger_service.mock';

describe('MyNewStep', () => {
  it('continues with data when successful', async () => {
    const { loggerService } = createLoggerService();
    const step = new MyNewStep(loggerService);

    const stream = step.executeStream(
      createPipelineStream([
        {
          input: createRuleExecutionInput(),
          rule: createRuleResponse(),
        },
      ])
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
export class PerformanceMiddleware implements RuleExecutionMiddleware {
  public readonly name = 'performance';

  constructor(
    @inject(LoggerServiceToken) private readonly logger: LoggerServiceContract
  ) {}

  public execute(
    ctx: RuleExecutionMiddlewareContext,
    next: (input: PipelineStateStream) => PipelineStateStream,
    input: PipelineStateStream
  ): PipelineStateStream {
    const stream = next(input);
    const logger = this.logger;

    return (async function* () {
      const start = performance.now();
      try {
        for await (const result of stream) {
          yield result;
        }
      } finally {
        logger.debug({
          message: `Step [${ctx.step.name}] took ${performance.now() - start}ms`,
        });
      }
    })();
  }
}
```

Register middleware in `setup/bind_rule_executor.ts` on `RuleExecutionMiddlewaresToken`. Binding order defines wrapping order.

## Current middleware

| Middleware | Purpose |
| --- | --- |
| `CancellationBoundaryMiddleware` | Cooperative cancellation / abort handling. Emits `step_cancelled` when the abort signal fires inside a step boundary. |
| `LifecycleEmitterMiddleware` | Emits `step_started` on entry and `step_completed` (with `durationMs`) on successful stream completion. |
| `ApmMiddleware` | APM spans around step execution. |
| `ErrorHandlingMiddleware` | Centralized logging for step failures; wraps thrown errors in `StepExecutionError` so observers can recover the originating step name. |

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