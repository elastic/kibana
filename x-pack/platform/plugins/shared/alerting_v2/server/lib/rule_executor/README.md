# Rule Executor

The Rule Executor runs v2 rules on a Task Manager schedule: load the rule saved object, execute ES|QL, materialize rule events, and persist rule events to `.rule-events`. For alert-type rules it coordinates recovery/no-data handling and alert episode fields.

When a rule is scheduled to run, the Task Manager triggers the Rule Executor. The executor follows a pipeline pattern where execution flows through a series of discrete steps, each handling a specific responsibility.

See also: [Director service](../director/README.md) (episode transitions) and [server README](../../README.md) (full map).

## Role in the system

```text
Rule Executor                    Downstream
(writes rule events)             (dispatcher, UIs, …)
      |                                |
      v                                v
 `.rule-events`  ---------------->  episodes, actions, search
```

- One Task Manager task per enabled rule.
- The executor writes append-only documents to the `.rule-events` data stream (`StoreAlertEventsStep`).
- The [dispatcher](../dispatcher/README.md) consumes alert-type episodes for notification gating; signal rows follow a different path.

## Alert vs signal rules

Rules have a `kind` of `alert` or `signal` (see the rule saved object schema). Alert rules participate in episode lifecycle: the director attaches `episode.*` fields, recovery and grouping semantics apply, and the dispatcher matches only `type: alert` rule events. Signal rules are observation-focused; the director skips episode tracking, and those events are not processed by the notification pipeline described in the dispatcher README.

## Architecture

The executor uses a hybrid architecture combining:
- Pipeline Pattern for sequential step execution
- Middleware for global cross-cutting concerns
- Decorators for per-step operations

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              Task Manager                                   │
│                         (triggers rule execution)                           │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           RuleExecutorTaskRunner                            │
│                    (translates task manager ↔ domain)                       │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          RuleExecutionPipeline                              │
│                    (orchestrates step execution)                            │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                    ┌─────────────────┴─────────────────┐
                    ▼                                   ▼
          ┌─────────────────┐                 ┌─────────────────┐
          │   Middleware    │                 │     Steps       │
          │ (global ops)    │    wraps each   │  (sequential    │
          │                 │ ─────────────►  │   execution)    │
          │ • Cancel / APM / │                 │                 │
          │   errors        │                 │                 │
          └─────────────────┘                 └─────────────────┘
                                                      │
    ┌──────────┬──────────┬──────────┬──────────┬──────────┬──────────┬──────────┬──────────┐
    ▼          ▼          ▼          ▼          ▼          ▼          ▼          ▼
┌────────┐ ┌────────┐ ┌────────┐ ┌─────────────┐ ┌─────────────┐ ┌────────┐ ┌────────┐ ┌────────┐
│ Wait   │ │ Fetch  │ │Validate│ │ExecuteRule  │ │CreateAlert  │ │Create  │ │Director│ │ Store  │
│For Res.│ │ Rule   │ │ Rule   │ │Query (ES|QL)│ │Events       │ │Recovery│ │ Step   │ │ Events │
└────────┘ └────────┘ └────────┘ └─────────────┘ └─────────────┘ └────────┘ └────────┘ └────────┘
                                      │
                                      ▼
                          ┌─────────────────────────┐
                          │    RulePipelineState    │
                          │   (merged per step)     │
                          └─────────────────────────┘
```

## Rule configuration

Rules are persisted as saved objects; attributes include `kind`, `metadata` (name, description, tags, …), `time_field`, `schedule` (`every`, optional `lookback`), `evaluation` (ES\|QL `base` and optional `condition`), optional `recovery_policy`, `state_transition`, `grouping`, `no_data`, optional `artifacts`, and server-managed fields such as `enabled` and audit timestamps. The persisted shape is defined in `saved_objects/schemas/rule_saved_object_attributes/`; HTTP/API schemas live in `@kbn/alerting-v2-schemas`. The executor reads the rule via `FetchRuleStep` and does not embed notification policy ids on the document.

## Operational parameters

| Parameter | Value | Source |
| --- | --- | --- |
| Task type | `alerting_v2:rule_executor` | [`task_definition.ts`](task_definition.ts) |
| Task timeout | `5m` | [`task_definition.ts`](task_definition.ts) |
| Schedule | Per rule (interval from saved object) | [`schedule.ts`](schedule.ts) (`ensureRuleExecutorTaskScheduled`) |

## Pipeline shape

The rule executor follows a pipeline pattern where execution flows through a series of discrete steps, each handling a specific responsibility.

### What the Rule Executor Does

1. Waits for resources — Ensures required Elasticsearch resources (data streams, templates) are ready.
2. Fetches the rule — Loads the rule saved object.
3. Validates the rule — Ensures the rule can run (e.g. enabled).
4. Executes ES|QL — Builds the query (time bounds, condition, recovery semantics) and runs it.
5. Creates alert events — Maps query rows to alert event batches.
6. Creates recovery events — Emits recovery for groups that disappeared from the breach set when the rule defines recovery behavior.
7. Director — For alert-type rules, enriches batches with episode identity and status via `DirectorService`.
8. Stores events — Persists rule events to the configured data stream.

## How a rule execution works

Each run is driven by Task Manager with `ruleId` and `spaceId` in the task params. `RuleExecutorTaskRunner` builds `RuleExecutionInput` with `scheduledAt` (from the task instance) and an `executionContext` that carries the abort signal and scope for downstream services. The pipeline streams immutable `RulePipelineState` values: steps emit `continue` with merged state or `halt` with a `HaltReason`. ES\|QL results arrive in batches so memory stays bounded for large queries.

## Recovery events

Recovery is implemented in [`CreateRecoveryEventsStep`](steps/create_recovery_events_step.ts) after [`CreateAlertEventsStep`](steps/create_alert_events_step.ts), so `alertEventsBatch` already contains this run’s breach documents (`status: breached`, one `group_hash` per evaluated group). Recovery only applies to `kind: alert` rules; signal rules skip this step.

### What “active” means

The executor needs the set of groups that still have an open episode (not yet inactive) in `.rule-events`. [`getActiveAlertGroupHashesQuery`](queries.ts) runs against the alert events data stream for the rule id, keeps the latest `episode.status` per `group_hash`, and returns rows where that status is `pending`, `active`, or `recovering`. Those `group_hash` values are the **active** set. If that query returns nothing, no recovery events are produced for the run.

### Default: `no_breach` recovery (`recovery_policy.type` omitted or `no_breach`)

[`buildRecoveryAlertEvents`](build_alert_events.ts) compares:

- **Active group hashes** — from the index query above.
- **Breached group hashes** — the set of `group_hash` values on the current run’s breach events in `alertEventsBatch`.

It emits one **recovered** rule event per active group hash that is **not** in the breached set: the breach query no longer returns a row for that group, but the episode was still non-inactive in the index, so the group is treated as recovered. Empty `data` on those documents is expected for this path.

### Alternative: `query` recovery (`recovery_policy.type` is `query`)

When the rule defines `recovery_policy.query.base`, the step runs a **separate** ES\|QL recovery query with the same time-window plumbing as other rule queries (`getQueryPayload`, lookback from `schedule.lookback` or `schedule.every`). [`buildQueryRecoveryAlertEvents`](build_alert_events.ts) walks the result rows: for each row it computes `group_hash` using the same grouping fields as breach events. Rows whose hash appears in the **active** set (and are seen for the first time in the result) become recovered events, carrying that row as `data`. If the recovery query returns no rows or none of the rows match an active group hash, no recovery documents are added.

### Summary

| Mode | When recovery rows are emitted |
| --- | --- |
| `no_breach` | Active episode in the index, but this run’s breach batch does not include that `group_hash`. |
| `query` | Active episode in the index, and the dedicated recovery query returns a row whose computed `group_hash` matches that group (first row wins per hash). |

Recovered documents are appended to `alertEventsBatch` before the director and store steps.

## Implementation overview

1. Task Manager invokes [`RuleExecutorTaskRunner`](task_runner.ts) (`RuleExecutorTaskDefinition` in [`task_definition.ts`](task_definition.ts)).
2. [`RuleExecutionPipeline`](execution_pipeline.ts) runs ordered `RuleExecutionStep` implementations registered on `RuleExecutionStepsToken` in `setup/bind_rule_executor.ts`.
3. Each step consumes a `PipelineStateStream` and yields `continue` (updated state) or `halt` with a `HaltReason` — halt is control flow, not necessarily an application error (see Halt reasons below).
4. Middleware on `RuleExecutionMiddlewaresToken` wraps every step (cancellation boundary, APM, error handling).

### RuleExecutorTaskRunner

Location: `task_runner.ts`

The entry point for rule execution. It:
- Receives task instance data from Task Manager
- Extracts execution input (ruleId, spaceId, scheduledAt, abortSignal)
- Delegates to `RuleExecutionPipeline`
- Translates pipeline results back to Task Manager's `RunResult`

### RuleExecutionPipeline

Location: `execution_pipeline.ts`

Orchestrates step execution with middleware support. It:
- Maintains immutable pipeline state
- Executes steps sequentially
- Wraps each step with the middleware chain
- Handles halt conditions (see Halt reasons below)

### Pipeline state (`RulePipelineState`)

Key fields (full type in `types.ts`):

| Field | Set by | Purpose |
| --- | --- | --- |
| `input` | Pipeline / task runner | `ruleId`, `spaceId`, `scheduledAt`, `executionContext` — identity and scheduling context for the run. |
| `rule` | Fetch rule | Rule document from saved objects (`FetchRuleStep`). |
| `queryPayload` | Execute rule query | ES\|QL filter and params for the query (`ExecuteRuleQueryStep`). |
| `esqlRowBatch` | Execute rule query | One batch of ES\|QL result rows (the query step may emit multiple continues as batches stream). |
| `alertEventsBatch` | Create alert events, create recovery, director | Materialized `.rule-events` documents; recovery appends rows, director enriches episode fields for `kind: alert` before store. |

### Execution steps

Steps are self-contained units of work that implement `RuleExecutionStep`. They are registered on `RuleExecutionStepsToken` in `setup/bind_rule_executor.ts`; binding order is execution order.

| # | Step | Summary |
| --- | --- | --- |
| 1 | `WaitForResourcesStep` | Blocks until Elasticsearch resources for alerting v2 (data streams, templates, etc.) are ready via `ResourceManager.waitUntilReady`, so the run does not index or query before that infrastructure exists. |
| 2 | `FetchRuleStep` | Loads the rule saved object by id through `RulesClient`, merges `rule` into state, and halts with `rule_deleted` on 404 so downstream steps always have the rule definition. |
| 3 | `ValidateRuleStep` | Ensures `state.rule.enabled` is true and halts with `rule_disabled` otherwise, skipping work for disabled rules without mutating external state. |
| 4 | `ExecuteRuleQueryStep` | Builds `queryPayload` from the rule (time window, condition, recovery, grouping, no-data semantics) and streams ES\|QL; each batch merges `queryPayload` and `esqlRowBatch` into state so breach rows are produced incrementally instead of holding large result sets in memory. |
| 5 | `CreateAlertEventsStep` | Maps each `esqlRowBatch` to `alertEventsBatch` rule-event documents (`build_alert_events` / breach semantics), turning raw rows into the shape the director and indexer expect. |
| 6 | `CreateRecoveryEventsStep` | For `kind: alert`, loads active group hashes from Elasticsearch, compares them to the current breach batch, and appends recovery events (or, when `recovery_policy.type` is `query`, runs a dedicated recovery ES\|QL and builds recovery docs). Skipped for non-alert rules—surfaces transitions when groups leave the breach set, not only ongoing breaches. |
| 7 | `DirectorStep` | For `kind: alert`, calls `DirectorService.run` to enrich `alertEventsBatch` with episode identity and status; for `kind: signal` or an empty batch, yields state unchanged—centralizing episode lifecycle fields on alert events before persistence. |
| 8 | `StoreAlertEventsStep` | Bulk-indexes `alertEventsBatch` to the configured `.rule-events` data stream so events are durable and visible to the dispatcher and other readers. |

### Step-by-step semantics

The following section explains each stage in plain language:

1. Wait for resources  
   The run waits until required Elasticsearch assets are ready so later steps do not fail on missing indices or templates.

2. Fetch rule  
   It loads the current rule document. If the rule was deleted, the pipeline halts with a domain reason instead of throwing.

3. Validate rule  
   If the rule is disabled, the pipeline halts; there is nothing further to do for this execution.

4. Execute rule query  
   It builds the ES\|QL request from the rule (including lookback and conditions) and streams result batches into state. Each batch updates `esqlRowBatch` for the next step.

5. Create alert events  
   It converts each batch of result rows into alert rule-event documents (breach side of the model).

6. Create recovery events  
   For alert rules, it discovers which group hashes are still active in the index, compares that to the current breach batch, and appends recovery events (including query-based recovery when configured). Non-alert rules skip this step.

7. Director  
   For alert rules, it runs the director to attach or update episode-related fields. Signal rules skip episode tracking and pass the batch through unchanged.

8. Store alert events  
   It writes the final batches to the rule-events data stream so the rest of the platform can consume them.

### Halt reasons

A step may return `halt` (not an error — short-circuit). Reasons are defined on `HaltReason` in `types.ts`.

| Reason | Meaning |
| --- | --- |
| `rule_deleted` | The rule saved object was not found (`FetchRuleStep`). |
| `rule_disabled` | The rule exists but is disabled (`ValidateRuleStep`). |
| `state_not_ready` | Required pipeline state is missing (for example rule or intermediate batches not present in state when a step runs); defensive halt from stream wiring or ordering. |

## Guarantees and limits

- Streamed ES\|QL: `ExecuteRuleQueryStep` emits multiple batches; steps must tolerate partial `esqlRowBatch` / `alertEventsBatch` updates.
- Task timeout is `5m` per run (`task_definition.ts`); long queries or stalls should respect `executionContext` cancellation where applicable.
- Idempotency of side effects outside Kibana (for example workflows) is the caller’s concern once events are written; the executor focuses on durable indexing of rule events.

## Key design principles

1. Immutable Stream State: Steps consume a `PipelineStateStream` and emit `StepStreamResult` objects. Never mutate incoming state directly; always emit a new state object when updating fields.

2. Domain-Driven: Steps work with domain concepts only. No task manager types (`taskInstance`, `RunResult`) are exposed to steps.

3. Single Responsibility: Each step handles one logical unit of work.

4. Dependency Injection: Steps use Inversify for dependency injection. Dependencies are injected via constructor.

5. Separation of Concerns: Global operations use middleware; step-specific operations use decorators.

## Middleware vs decorators

| Layer | Applies to | Purpose |
| --- | --- | --- |
| Middleware | All steps | Global cross-cutting concerns (cancellation, APM, errors). |
| Decorators | Selected steps | Step-specific behavior without editing the step class. |

---

## Creating a new rule executor step

### Step 1: Create the Step File

Create a new file in `steps/` directory (e.g., `my_new_step.ts`):

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

      // The helper narrows the type, so `rule` is guaranteed here
      const { rule } = requiredState.state;

      // Perform your logic here
      const myResult = await this.doSomething(rule);

      // Return one of two options:

      // Option 1: Continue with new data merged into state
      return {
        type: 'continue',
        state: { ...requiredState.state, myNewField: myResult },
      };

      // Option 2: Halt pipeline with a domain reason
      // return { type: 'halt', reason: 'rule_disabled', state: requiredState.state };
    });
  }

  private async doSomething(rule: RuleResponse): Promise<MyNewFieldType> {
    return {};
  }
}
```

### Step 2: Export from Index

Add your step to `steps/index.ts`:

```typescript
export { WaitForResourcesStep } from './wait_for_resources_step';
export { FetchRuleStep } from './fetch_rule_step';
// ... existing exports ...
export { MyNewStep } from './my_new_step'; // Add this
```

### Step 3: Update Pipeline State (if needed)

If your step produces new data, add the field to `RulePipelineState` in `types.ts`:

```typescript
export interface RulePipelineState {
  readonly input: RuleExecutionInput;
  readonly rule?: RuleResponse;
  readonly queryPayload?: QueryPayload;
  readonly esqlRowBatch?: Array<Record<string, unknown>>;
  readonly alertEventsBatch?: AlertEvent[];
  readonly myNewField?: MyNewFieldType; // Add your new field
}
```

### Step 4: Register in DI Container

Add your step to `setup/bind_rule_executor.ts`. Steps use multi-injection on `RuleExecutionStepsToken`: each `bind(RuleExecutionStepsToken).to(StepClass)` adds one step; file order is execution order.

```typescript
import { MyNewStep } from '../lib/rule_executor/steps';

export const bindRuleExecutionServices = ({ bind }: ContainerModuleLoadOptions) => {
  // ... middleware bindings ...

  bind(RuleExecutionStepsToken).to(WaitForResourcesStep).inSingletonScope();
  bind(RuleExecutionStepsToken).to(FetchRuleStep).inRequestScope();
  bind(RuleExecutionStepsToken).to(ValidateRuleStep).inSingletonScope();
  bind(RuleExecutionStepsToken).to(ExecuteRuleQueryStep).inRequestScope();
  bind(RuleExecutionStepsToken).to(CreateAlertEventsStep).inSingletonScope();
  bind(RuleExecutionStepsToken).to(CreateRecoveryEventsStep).inRequestScope();
  bind(RuleExecutionStepsToken).to(MyNewStep).inSingletonScope(); // example insertion
  bind(RuleExecutionStepsToken).to(DirectorStep).inSingletonScope();
  bind(RuleExecutionStepsToken).to(StoreAlertEventsStep).inSingletonScope();

  bind(RuleExecutionPipeline).toSelf().inRequestScope();
};
```

Use `inRequestScope()` vs `inSingletonScope()` consistently with neighboring steps (see existing bindings).

### Step 5: Add Tests

Create a test file `steps/my_new_step.test.ts`:

```typescript
import { MyNewStep } from './my_new_step';
import { createPipelineStream, collectStreamResults, createRuleExecutionInput, createRuleResponse } from '../test_utils';
import { createLoggerService } from '../../services/logger_service/logger_service.mock';

describe('MyNewStep', () => {
  it('continues with data when successful', async () => {
    const { loggerService } = createLoggerService();
    const step = new MyNewStep(loggerService);

    const inputState = {
      input: createRuleExecutionInput(),
      rule: createRuleResponse(),
    };

    const stream = step.executeStream(createPipelineStream([inputState]));
    const [result] = await collectStreamResults(stream);

    expect(result.type).toBe('continue');
    expect(result.state).toHaveProperty('myNewField');
  });

  it('halts when required state is missing', async () => {
    const { loggerService } = createLoggerService();
    const step = new MyNewStep(loggerService);

    const inputState = { input: createRuleExecutionInput() };
    const stream = step.executeStream(createPipelineStream([inputState]));
    const [result] = await collectStreamResults(stream);

    expect(result).toEqual({
      type: 'halt',
      reason: 'state_not_ready',
      state: inputState,
    });
  });
});
```

---

## Middleware

Middleware applies to all steps and is ideal for global cross-cutting concerns like error handling, performance measurement, or request tracing.

### Middleware Execution Flow

```
MiddlewareA.execute()
  └─► MiddlewareB.execute()
        └─► step.executeStream()
        ◄── returns stream
  ◄── returns stream
```

### Creating a New Middleware

Create a new file in `middleware/` directory (e.g., `performance_middleware.ts`):

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
        const duration = performance.now() - start;
        logger.debug({
          message: `Step [${ctx.step.name}] completed in ${duration.toFixed(2)}ms`,
        });
      }
    })();
  }
}
```

### Registering Middleware

Add your middleware class to `setup/bind_rule_executor.ts` and append it to `RuleExecutionMiddlewaresToken` in the order you want (same multi-injection pattern as steps: binding order = wrap order).

```typescript
import { PerformanceMiddleware } from '../lib/rule_executor/middleware';

export const bindRuleExecutionServices = ({ bind }: ContainerModuleLoadOptions) => {
  bind(PerformanceMiddleware).toSelf().inSingletonScope();

  bind(RuleExecutionMiddlewaresToken).to(CancellationBoundaryMiddleware).inSingletonScope();
  bind(RuleExecutionMiddlewaresToken).to(ApmMiddleware).inSingletonScope();
  bind(RuleExecutionMiddlewaresToken).to(PerformanceMiddleware).inSingletonScope();
  bind(RuleExecutionMiddlewaresToken).to(ErrorHandlingMiddleware).inSingletonScope();
};
```

### Current Middleware

| Middleware | Purpose |
|------------|---------|
| `CancellationBoundaryMiddleware` | Cooperative cancellation / abort integration |
| `ApmMiddleware` | APM spans around step execution |
| `ErrorHandlingMiddleware` | Centralized error logging for step failures |

---

## Decorators

Decorators wrap specific steps to add behavior without modifying the step implementation. Use decorators when you need per-step control without adding conditionals to middleware.

### Creating a Decorator

Create a new file in `steps/decorators/` directory (e.g., `audit_logging_decorator.ts`):

```typescript
import { RuleStepDecorator } from './step_decorator';
import type { PipelineStateStream } from '../../types';

export class AuditLoggingDecorator extends RuleStepDecorator {
  constructor(
    step: RuleExecutionStep,
    private readonly auditService: AuditServiceContract
  ) {
    super(step);
  }

  public executeStream(input: PipelineStateStream): PipelineStateStream {
    const stream = this.step.executeStream(input);
    const auditService = this.auditService;

    return (async function* () {
      for await (const result of stream) {
        await auditService.log({
          action: `rule_execution.step.${result.type}`,
          ruleId: result.state.input.ruleId,
          spaceId: result.state.input.spaceId,
        });

        yield result;
      }
    })();
  }
}
```

## Testing

### Test Utilities

Test utilities are available in `test_utils.ts`:

### Testing Steps

```typescript
import { MyStep } from './my_step';
import {
  collectStreamResults,
  createPipelineStream,
  createRuleExecutionInput,
  createRuleResponse,
} from '../test_utils';
import { createLoggerService } from '../../services/logger_service/logger_service.mock';

describe('MyStep', () => {
  it('executes successfully', async () => {
    const { loggerService } = createLoggerService();
    const step = new MyStep(loggerService);

    const state = {
      input: createRuleExecutionInput(),
      rule: createRuleResponse(),
    };

    const stream = step.executeStream(createPipelineStream([state]));
    const [result] = await collectStreamResults(stream);

    expect(result.type).toBe('continue');
  });
});
```

### Testing Middleware

```typescript
import { ErrorHandlingMiddleware } from './error_handling_middleware';
import { createPipelineStream, collectStreamResults, createRuleExecutionInput } from '../test_utils';
import { createLoggerService } from '../../services/logger_service/logger_service.mock';

describe('ErrorHandlingMiddleware', () => {
  it('calls next and returns result on success', async () => {
    const { loggerService, mockLogger } = createLoggerService();
    const middleware = new ErrorHandlingMiddleware(loggerService);

    const next = jest.fn((input) => input);

    const context = {
      step: { name: 'test_step', executeStream: jest.fn() },
    };
    const inputState = { input: createRuleExecutionInput() };
    const output = middleware.execute(context, next, createPipelineStream([inputState]));
    const [result] = await collectStreamResults(output);

    expect(result).toEqual({ type: 'continue', state: inputState });
    expect(mockLogger.error).not.toHaveBeenCalled();
  });

  it('logs error and rethrows on failure', async () => {
    const { loggerService, mockLogger } = createLoggerService();
    const middleware = new ErrorHandlingMiddleware(loggerService);

    const next = jest.fn(() =>
      (async function* () {
        throw new Error('Step failed');
      })()
    );
    const context = {
      step: { name: 'failing_step', executeStream: jest.fn() },
    };
    const output = middleware.execute(context, next, createPipelineStream());

    await expect(collectStreamResults(output)).rejects.toThrow('Step failed');
    expect(mockLogger.error).toHaveBeenCalled();
  });
});
```

### Testing Decorators

```typescript
import { AuditLoggingDecorator } from './audit_logging_decorator';
import { collectStreamResults, createPipelineStream, createRuleExecutionInput } from '../test_utils';

describe('AuditLoggingDecorator', () => {
  it('logs before and after step execution', async () => {
    const mockStep = {
      name: 'test_step',
      executeStream: jest.fn((input) => input),
    };
    const mockAuditService = { log: jest.fn() };

    const decorator = new AuditLoggingDecorator(mockStep, mockAuditService);
    const state = { input: createRuleExecutionInput() };
    const stream = decorator.executeStream(createPipelineStream([state]));

    await collectStreamResults(stream);

    expect(mockAuditService.log).toHaveBeenCalledTimes(1);
  });

  it('propagates errors from wrapped step', async () => {
    const mockStep = {
      name: 'failing_step',
      executeStream: jest.fn(() =>
        (async function* () {
          throw new Error('Step failed');
        })()
      ),
    };
    const mockAuditService = { log: jest.fn() };

    const decorator = new AuditLoggingDecorator(mockStep, mockAuditService);
    const stream = decorator.executeStream(
      createPipelineStream([{ input: createRuleExecutionInput() }])
    );

    await expect(collectStreamResults(stream)).rejects.toThrow('Step failed');
  });
});
```

## Related code

| File | Role |
| --- | --- |
| `execution_pipeline.ts` | `RuleExecutionPipeline`, middleware wrapping, stream iteration. |
| `task_runner.ts` / `task_definition.ts` | Task Manager integration and task type config. |
| `schedule.ts` | Schedule / ensure task for a rule. |
| `types.ts` | `RulePipelineState`, `HaltReason`, step/stream types. |
| `setup/bind_rule_executor.ts` | Middleware and step order. |
| `stream_utils.ts` | Helpers (`mapStep`, `guardedExpandStep`, …). |
| `queries.ts` | ES\|QL for active group hashes used in recovery (`getActiveAlertGroupHashesQuery`). |
| `build_alert_events.ts` | Breach batches, `buildRecoveryAlertEvents`, `buildQueryRecoveryAlertEvents`. |
| `get_query_payload.ts` | Time filter / params for the recovery query path. |