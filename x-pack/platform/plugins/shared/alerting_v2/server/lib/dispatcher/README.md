# Dispatcher

> **Prerequisites:** Read the [server-level README](../../README.md) first for an overview of system concepts (rule events, series, episodes, rules) and how the components fit together.

The Dispatcher is the notification pipeline for alerting v2. It reads data from `.rule-events` and `.alert-actions`, decides what should or should not notify, sends eligible groups to destinations (for example workflows), and records final outcomes in `.alert-actions`.

It runs as its own Task Manager task, separate from per-rule execution. This separation keeps rule evaluation focused on producing events, while notification gating is handled asynchronously with its own cadence and state.

Policy matchers use KQL and are evaluated in-process. A policy with an empty matcher is a catch-all.

## Role in the system

```text
Rule Executor                    Dispatcher
(writes rule events)             (reads episodes, writes actions)
      |                                |
      v                                v
 `.rule-events`  ---------------->  queries + policy gating
      ^                                |
      |                                v
      +------------------------  `.alert-actions` (fire / suppress / notified / ...)
```

- Rule executor produces append-only documents on `.rule-events`.
- Dispatcher polls on a schedule, finds episodes that still need processing, applies policy gating, dispatches eligible notifications, and bulk-indexes outcomes to `.alert-actions`.

## Signal vs alert rule events

The dispatcher only considers alert-type rule events. Signal events are observation-only, they do not carry episode lifecycle fields and are not matched against notification policies or dispatched here. References to “episodes” or “alert episodes” in this document mean alert-type rule events that include `episode.*` (and thus participate in notification gating).

## Architecture

The dispatcher combines:

- Pipeline pattern: `DispatcherPipeline` runs injected `DispatcherStep` implementations in order (`DispatcherExecutionStepsToken` in `setup/bind_dispatcher_executor.ts`).
- Task boundary: `DispatcherTaskRunner` adapts Task Manager to `DispatcherService.run` (time anchors, feature flag).
- Observability: each step runs under `withDispatcherSpan` in `execution_pipeline.ts`.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              Task Manager                                   │
│                   (triggers dispatcher on a schedule)                       │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          DispatcherTaskRunner                               │
│              (feature flag, task instance state ↔ execution params)         │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           DispatcherService                                 │
│                   (starts pipeline with startedAt / previousStartedAt)      │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          DispatcherPipeline                                 │
│                   (sequential DispatcherStep execution)                     │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
┌────────┐   ┌────────┐   ┌────────┐   ┌────────┐   ┌────────┐
│ Fetch  │──►│ Fetch  │──►│ Apply  │──►│ Fetch  │──►│ Fetch  │
│Episodes│   │Suppress│   │Suppress│   │ Rules  │   │Policies│
└────────┘   └────────┘   └────────┘   └────────┘   └────┬───┘
                                                       │
                                                       ▼
┌────────┐   ┌────────┐   ┌────────┐   ┌────────┐   ┌────────┐
│Evaluate│──►│ Build  │──►│ Apply  │──►│Dispatch│──►│ Store  │
│Matchers│   │ Groups │   │Throttle│   │        │   │ Actions│
└────────┘   └────────┘   └────────┘   └────────┘   └────────┘
                                      │
                                      ▼
                          ┌───────────────────────┐
                          │ DispatcherPipelineState │
                          │   (merged per step)    │
                          └───────────────────────┘
```

## Notification policy

A notification policy is a persisted configuration (saved object) scoped to the Kibana space. It is not stored on the rule: the rule saved object has no notification policy id field. The dispatcher loads every enabled notification policy for the space and decides applicability per episode by evaluating each policy’s KQL `matcher` against the episode context including rule metadata.

Each policy specifies:

- Whether it is enabled, and optional `snoozedUntil` for time-bound pauses.
- A KQL `matcher` evaluated against each candidate episode (episode fields plus `data.*` from the rule event). An empty or omitted matcher matches every episode (catch-all).
- `groupBy` and `groupingMode` (`per_episode`, `all`, or `per_field`), which control how matched episodes are batched into notification groups before throttling and dispatch.
- `throttle` (strategy and optional interval) to limit how often the same notification group may fire.
- `destinations`: where to send a group (for example workflow ids). Optional `apiKey` for authenticated dispatch.
- `tags` for organization and filtering in the UI.

The same policy can match episodes produced by different rules when each episode satisfies that policy’s matcher; matching and grouping are still evaluated in the context of the episode’s rule and policy pair. Saved object schemas and HTTP APIs live under `saved_objects/` and `routes/`; the dispatcher-facing shape is in `lib/dispatcher/types.ts` (`NotificationPolicy`).

## Operational parameters

| Parameter | Value | Source |
| --- | --- | --- |
| Task schedule | `5s` | [`schedule_task.ts`](schedule_task.ts) (`INTERVAL`) |
| Episode query cap | `10000` rows | [`queries.ts`](queries.ts) (`LIMIT 10000`) |
| Lookback window | `10` minutes | [`constants.ts`](constants.ts) (`LOOKBACK_WINDOW_MINUTES`) |
| Matcher language | KQL  | `@kbn/eval-kql` |

## Pipeline shape

The dispatcher follows a pipeline pattern where execution flows through a series of discrete steps, each handling a specific responsibility. 


### What the Dispatcher Does

1. Fetch new episodes  
2. Fetch suppressions  
3. Apply suppressions
4. Fetch rules  
5. Fetch notification policies  
6. Evaluate KQL matchers  
7. Build notification groups  
8. Apply throttling  
9. Dispatch to destinations  
10. Record outcomes

## How a dispatcher execution works

At the start of each execution, the dispatcher has two time anchors:

- `startedAt`: current execution start
- `previousStartedAt`: previous execution start

It uses those anchors plus action history to avoid replaying already-handled episodes and to include newly arrived data safely. The pipeline then moves through filtering and enrichment phases until it reaches a final "decision set" (dispatch, throttled, suppressed, unmatched), which is persisted to `.alert-actions`.

## Implementation overview

1. Task Manager invokes [`DispatcherTaskRunner`](task_runner.ts) (`DispatcherTaskDefinition` in [`task_definition.ts`](task_definition.ts)).
2. [`DispatcherService`](dispatcher.ts) runs [`DispatcherPipeline`](execution_pipeline.ts): ordered `DispatcherStep` implementations on `DispatcherExecutionStepsToken` in `setup/bind_dispatcher_executor.ts`.
3. Each step reads `DispatcherPipelineState` and returns `continue` (optional state merge) or `halt` with a `DispatcherHaltReason` — halt is control flow, not necessarily an application error (see Halt reasons below).
4. Feature flag: dispatcher may be disabled via Kibana advanced settings (`DispatcherEnabledProviderToken` in `setup/bind_services.ts`).

### DispatcherTaskRunner

Location: `task_runner.ts`

The entry point for dispatcher runs. It:
- Resolves whether the dispatcher is enabled via `DispatcherEnabledProvider`; if disabled, returns the prior task state without running the pipeline.
- Builds `DispatcherExecutionParams` from the task instance (`previousStartedAt`, `abortController`).
- Delegates to `DispatcherService.run` and persists `previousStartedAt` in Task Manager state from the execution result.

### DispatcherService

Location: `dispatcher.ts`

Sets `startedAt`, invokes `DispatcherPipeline.execute` with `{ startedAt, previousStartedAt }`, and returns the timestamp used for subsequent runs’ `previousStartedAt`.

### DispatcherPipeline

Location: `execution_pipeline.ts`

Runs injected `DispatcherStep` implementations in registration order; merges `continue` payloads into `DispatcherPipelineState`; on `halt`, stops with `haltReason` and final state. Each step runs under `withDispatcherSpan` for tracing.

### Pipeline state (`DispatcherPipelineState`)

Key fields (full type in `types.ts`):

| Field | Set by | Purpose |
| --- | --- | --- |
| `input` | Pipeline | `startedAt`, `previousStartedAt` (drives lookback and fire-filter semantics for which episodes are “new”). |
| `episodes` | Fetch episodes | Candidate `AlertEpisode` rows from ES\|QL. |
| `suppressions` | Fetch suppressions | Ack / deactivate / snooze signals. |
| `dispatchable` / `suppressed` | Apply suppression | Who continues vs who is suppressed (with reason). |
| `rules` | Fetch rules | Rule metadata keyed by id. |
| `policies` | Fetch policies | Notification policies (matchers, throttle, destinations). |
| `matched` | Evaluate matchers | `(episode, policy)` pairs. |
| `groups` | Build groups | `NotificationGroup` for dispatch. |
| `dispatch` / `throttled` | Throttling | Groups to send vs hold. |

### Execution steps

Registered on `DispatcherExecutionStepsToken` in `setup/bind_dispatcher_executor.ts`. Order is execution order:

| # | Step | Summary |
| --- | --- | --- |
| 1 | `FetchEpisodesStep` | Loads candidate episodes that appear new or newly relevant for this execution window, defining the working set so downstream steps do not scan all historical episodes. |
| 2 | `FetchSuppressionsStep` | Loads suppression signals (ack/deactivate/snooze related state) for the candidate set so suppression decisions use the latest action state, not only event status. |
| 3 | `ApplySuppressionStep` | Splits candidates into `dispatchable` and `suppressed` with reasons, avoiding policy evaluation and dispatch for episodes already gated out. |
| 4 | `FetchRulesStep` | Loads rule metadata for dispatchable episodes so matchers and payloads have rule context (rules do not store notification policy ids). |
| 5 | `FetchPoliciesStep` | Loads all enabled notification policies for the space (decrypted where needed); every enabled policy is a candidate and matchers decide which episodes each policy applies to. |
| 6 | `EvaluateMatchersStep` | Evaluates each policy matcher against each applicable episode and builds episode-policy matches so eligibility is explicit. |
| 7 | `BuildGroupsStep` | Groups matches into notification groups per policy mode and keys so dispatch and throttling operate at group granularity, not on raw episodes alone. |
| 8 | `ApplyThrottlingStep` | Splits groups into `dispatch` and `throttled` using prior notification history, enforcing delivery frequency limits while preserving episode visibility. |
| 9 | `DispatchStep` | Sends dispatch groups to destinations with bounded concurrency and per-destination handling—side effects only after suppression, matcher, and throttle gating. |
| 10 | `StoreActionsStep` | Persists outcomes (`fire`, `suppress`, `notified`, `unmatched`, etc.) to `.alert-actions`, producing a durable audit trail so future executions stay consistent and idempotent-like. |

### Step-by-step semantics

The following section explains each stage in plain language:

1. Fetch episodes  
   The dispatcher queries for episodes that should be considered now. It relies on lookback plus prior action state so old handled episodes are not repeatedly reprocessed.

2. Fetch suppressions  
   For those episodes, it gathers any active suppression facts (for example episode-level acknowledgement/deactivation or series-level snooze context).

3. Apply suppressions  
   It marks episodes as suppressed or dispatchable. Suppressed episodes are not dropped; they are carried with reason metadata so outcome recording is explicit.

4. Fetch rules  
   It loads rule metadata only for the dispatchable subset to avoid unnecessary lookups.

5. Fetch notification policies  
   It loads full definitions for every enabled notification policy in the space, not from fields on the rule documents.

6. Evaluate matchers  
   It evaluates each policy matcher against each episode context. Result is a list of concrete episode-policy matches. Empty matcher means catch-all.

7. Build groups  
   It transforms matches into notification groups according to policy grouping mode. Group identity is important because throttling and notification history are tracked by group.

8. Apply throttling  
   It compares candidate groups with recent notified history and classifies each as dispatchable now or throttled for later.

9. Dispatch  
   It sends eligible groups to configured destinations. Delivery happens only for groups that survived suppression, matcher gating, and throttling.

10. Store outcomes  
    It writes action documents that describe what happened this execution. These writes become input for subsequent executions (both correctness and observability).

### Halt reasons

| Reason | Meaning |
| --- | --- |
| `no_episodes` | Nothing to process in this execution. |
| `no_actions` | No suppress/throttle/dispatch work produced (see `StoreActionsStep`). |

## Guarantees and limits

- At-least-once delivery to workflows is possible; workflows should be idempotent (e.g. crash after dispatch but before recording actions can cause a repeat).
- Batch cap: up to 10,000 episodes per query (`LIMIT` in [`queries.ts`](queries.ts)); with a sustained backlog, oldest events are prioritized first, remainder picked up on later executions.

## Key design principles

- Pipeline state advances only through explicit `continue` merges; a `halt` short-circuits without treating control flow as an unhandled error (see Halt reasons).
- Matchers are KQL evaluated in-process; policies are space-scoped saved objects, not fields on the rule.
- Side effects (workflow dispatch) happen only after suppression, matcher, throttle, and grouping decisions (`DispatchStep`).

## Middleware vs decorators

The dispatcher does not use the rule executor’s middleware/decorator stack. Cross-cutting behavior relies on `withDispatcherSpan` in `execution_pipeline.ts`, logging inside steps, and the feature-flag check in `DispatcherTaskRunner`. For middleware and decorator patterns (streams, per-step wrappers), see [`../rule_executor/README.md`](../rule_executor/README.md).

## Creating a new dispatcher step

### Step 1: Create the step file

Create a new file in `steps/` directory (e.g., `my_new_step.ts`):

```typescript
import { inject, injectable } from 'inversify';
import type {
  AlertEpisode,
  DispatcherPipelineState,
  DispatcherStep,
  DispatcherStepOutput,
} from '../types';
import {
  LoggerServiceToken,
  type LoggerServiceContract,
} from '../../services/logger_service/logger_service';

@injectable()
export class MyNewStep implements DispatcherStep {
  public readonly name = 'my_new_step';

  constructor(
    @inject(LoggerServiceToken) private readonly logger: LoggerServiceContract
  ) {}

  public async execute(state: Readonly<DispatcherPipelineState>): Promise<DispatcherStepOutput> {
    if (!state.episodes?.length) {
      this.logger.debug({ message: `[${this.name}] No episodes yet, skipping` });
      return { type: 'continue' };
    }

    const myResult = await this.doSomething(state.episodes);

    // Return one of two options:

    // Option 1: Continue with new data merged into state
    return {
      type: 'continue',
      data: { myNewMetadata: myResult },
    };

    // Option 2: Halt pipeline early (not an error — short-circuit)
    // return { type: 'halt', reason: 'no_episodes' };
  }

  private async doSomething(episodes: AlertEpisode[]): Promise<string> {
    return 'ok';
  }
}
```

### Step 2: Export from index

Add your step to `steps/index.ts`:

```typescript
export { FetchEpisodesStep } from './fetch_episodes_step';
export { FetchSuppressionsStep } from './fetch_suppressions_step';
// ... existing exports ...
export { MyNewStep } from './my_new_step'; // Add this
```

### Step 3: Update pipeline state (if needed)

If your step produces new data, add the field to `DispatcherPipelineState` in `types.ts`:

```typescript
export interface DispatcherPipelineState {
  readonly input: DispatcherPipelineInput;
  readonly episodes?: AlertEpisode[];
  readonly suppressions?: AlertEpisodeSuppression[];
  readonly dispatchable?: AlertEpisode[];
  readonly suppressed?: Array<AlertEpisode & { reason: string }>;
  readonly rules?: Map<RuleId, Rule>;
  readonly policies?: Map<NotificationPolicyId, NotificationPolicy>;
  readonly matched?: MatchedPair[];
  readonly groups?: NotificationGroup[];
  readonly dispatch?: NotificationGroup[];
  readonly throttled?: NotificationGroup[];
  readonly myNewMetadata?: string; // Add your new field
}
```

### Step 4: Register in DI container

Add your step to `setup/bind_dispatcher_executor.ts`. Steps use multi-injection on `DispatcherExecutionStepsToken`: each `bind(DispatcherExecutionStepsToken).to(StepClass)` adds one step; file order is execution order.

```typescript
import { MyNewStep } from '../lib/dispatcher/steps';

export const bindDispatcherExecutionServices = ({ bind }: ContainerModuleLoadOptions) => {
  bind(DispatcherExecutionStepsToken).to(FetchEpisodesStep).inSingletonScope();
  bind(DispatcherExecutionStepsToken).to(MyNewStep).inSingletonScope(); // example insertion
  bind(DispatcherExecutionStepsToken).to(FetchSuppressionsStep).inSingletonScope();
  bind(DispatcherExecutionStepsToken).to(ApplySuppressionStep).inSingletonScope();
  bind(DispatcherExecutionStepsToken).to(FetchRulesStep).inSingletonScope();
  bind(DispatcherExecutionStepsToken).to(FetchPoliciesStep).inSingletonScope();
  bind(DispatcherExecutionStepsToken).to(EvaluateMatchersStep).inSingletonScope();
  bind(DispatcherExecutionStepsToken).to(BuildGroupsStep).inSingletonScope();
  bind(DispatcherExecutionStepsToken).to(ApplyThrottlingStep).inSingletonScope();
  bind(DispatcherExecutionStepsToken).to(DispatchStep).inSingletonScope();
  bind(DispatcherExecutionStepsToken).to(StoreActionsStep).inSingletonScope();

  bind(DispatcherPipeline).toSelf().inSingletonScope();
};
```

Use `inSingletonScope()` consistently with neighboring steps (see existing bindings).

### Step 5: Add tests

Create a test file `steps/my_new_step.test.ts`:

```typescript
import { MyNewStep } from './my_new_step';
import { createAlertEpisode, createDispatcherPipelineState } from '../fixtures/test_utils';
import { createLoggerService } from '../../services/logger_service/logger_service.mock';

describe('MyNewStep', () => {
  it('continues with data when episodes exist', async () => {
    const { loggerService } = createLoggerService();
    const step = new MyNewStep(loggerService);

    const state = createDispatcherPipelineState({
      episodes: [createAlertEpisode({ rule_id: 'r1' })],
    });

    const result = await step.execute(state);

    expect(result.type).toBe('continue');
    if (result.type !== 'continue') return;
    expect(result.data).toMatchObject({ myNewMetadata: 'ok' });
  });

  it('continues without data when no episodes', async () => {
    const { loggerService } = createLoggerService();
    const step = new MyNewStep(loggerService);

    const state = createDispatcherPipelineState();

    const result = await step.execute(state);

    expect(result.type).toBe('continue');
    if (result.type !== 'continue') return;
    expect(result.data).toBeUndefined();
  });
});
```

## Testing

Co-located unit tests: `steps/*.test.ts`, `execution_pipeline.test.ts`, `dispatcher.test.ts`, `queries.test.ts`, etc. Integration coverage lives under `integration_tests/` (see `integration_tests/dispatcher.test.ts`).

## Related code

| File | Role |
| --- | --- |
| `execution_pipeline.ts` | `DispatcherPipeline` loop. |
| `dispatcher.ts` | `DispatcherService`. |
| `task_runner.ts` / `task_definition.ts` | Task Manager integration. |
| `schedule_task.ts` | Schedule interval. |
| `queries.ts` | ES\|QL for episodes / suppressions. |
| `setup/bind_dispatcher_executor.ts` | Step order. |
