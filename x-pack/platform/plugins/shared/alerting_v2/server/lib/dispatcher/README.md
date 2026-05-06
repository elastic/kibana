# Dispatcher

> **Prerequisite:** Read the [server-level README](../../README.md) first for the plugin-wide architecture and terminology.

The dispatcher is the notification pipeline for alerting v2. It reads alert episodes from `.rule-events`, reads user/system action history from `.alert-actions`, decides what should notify now, dispatches eligible groups, and records the outcome back into `.alert-actions`.

It runs on its own Task Manager schedule, separate from per-rule execution.

## What the dispatcher owns

- Loading candidate alert episodes for the current execution window
- Applying suppression semantics from alert actions
- Matching episodes to notification policies
- Grouping matched episodes
- Throttling repeated delivery
- Dispatching to destinations
- Recording the final decision set in `.alert-actions`

## What the dispatcher does not own

- Running ES|QL for rules
- Creating breach, recovery, or no-data events
- Calculating episode state transitions

Those responsibilities are intentionally upstream in the rule executor and director.

## Mental model

```text
Rule executor / director               Dispatcher
    writes episodes                    reads episodes + actions
           |                                   |
           v                                   v
     `.rule-events` ----------------> policy evaluation
           ^                                   |
           |                                   v
           +--------------------------- `.alert-actions`
                           durable suppression / throttle / outcome history
```

Signal events never enter this pipeline. The dispatcher only processes alert-type rule events that carry `episode.*` state.

## How one execution works

Each dispatcher run has two time anchors:

- `startedAt`: start of the current run
- `previousStartedAt`: start of the previous run

Those anchors, plus persisted action history, let the dispatcher decide which episodes are new or still relevant without blindly replaying everything on every run.

The pipeline then moves through these phases:

1. Fetch candidate episodes
2. Fetch suppression facts
3. Split into dispatchable vs suppressed episodes
4. Load rule metadata for dispatchable episodes
5. Load enabled notification policies
6. Evaluate policy matchers
7. Build notification groups
8. Apply throttling
9. Dispatch eligible groups
10. Store final actions and reasons

### Decision outcomes written to `.alert-actions`

By the end of a dispatcher run, every episode that reached the later pipeline stages falls into one of these buckets:

| Outcome | What happened | Action documents written |
| --- | --- | --- |
| `dispatch` | The episode matched a policy, survived suppression and throttling, and was selected for delivery. | `fire` per episode, plus `notified` per notification group |
| `throttled` | The episode matched a policy, but the notification group was held back by throttling. | `suppress` with a throttle-related reason |
| `suppressed` | The episode was explicitly filtered out by suppression logic such as ack, snooze, or deactivate semantics. | `suppress` with the suppression reason |
| `unmatched` | The episode remained dispatchable but matched no enabled notification policy. | `unmatched` |

The full action taxonomy, including user-written actions such as `ack` and `snooze`, is documented in [`../../resources/README.md`](../../resources/README.md).

## Architecture

The dispatcher combines:

- a Task Manager boundary (`DispatcherTaskRunner`)
- a service boundary (`DispatcherService`)
- a sequential pipeline (`DispatcherPipeline`)
- explicit step contracts (`DispatcherStep`)

```text
Task Manager
   |
   v
DispatcherTaskRunner
   |
   v
DispatcherService
   |
   v
DispatcherPipeline
   |
   +--> FetchEpisodesStep
   +--> FetchSuppressionsStep
   +--> ApplySuppressionStep
   +--> FetchRulesStep
   +--> FetchPoliciesStep
   +--> EvaluateMatchersStep
   +--> BuildGroupsStep
   +--> ApplyThrottlingStep
   +--> DispatchStep
   +--> StoreActionsStep
```

Unlike the rule executor, the dispatcher is not streaming. Each step receives one immutable-looking state snapshot and returns either:

- `continue` with a partial state merge, or
- `halt` with a `DispatcherHaltReason`

## Notification policy model

A notification policy is a saved object scoped to a Kibana space. Policies are not embedded into the rule. Instead, the dispatcher loads enabled policies for the space and evaluates each policy against the candidate episodes.

Each policy defines:

- `matcher`: optional KQL filter evaluated against the episode context and `data.*`
- `groupBy` and `groupingMode`: how matched episodes are batched
- `throttle`: when repeated notifications are allowed
- `destinations`: where matching groups should go
- `snoozedUntil`: optional time-based suppression
- `apiKey`: optional credential used to dispatch

An empty matcher is a catch-all.

## Operational parameters

| Parameter | Value | Source |
| --- | --- | --- |
| Task schedule | `5s` | [`schedule_task.ts`](schedule_task.ts) |
| Episode query cap | `10000` rows | [`queries.ts`](queries.ts) |
| Lookback window | `10` minutes | [`constants.ts`](constants.ts) |
| Matcher language | KQL | `@kbn/eval-kql` |

## Important pipeline state

The dispatcher carries state forward through `DispatcherPipelineState` in `types.ts`.

| Field | Produced by | Meaning |
| --- | --- | --- |
| `input` | Pipeline | Time anchors that shape the run. |
| `episodes` | `FetchEpisodesStep` | Candidate `AlertEpisode` rows. |
| `suppressions` | `FetchSuppressionsStep` | Suppression facts from `.alert-actions`. |
| `dispatchable` / `suppressed` | `ApplySuppressionStep` | Split of episodes that may continue vs those that must not notify. |
| `rules` | `FetchRulesStep` | Rule metadata keyed by rule id. |
| `policies` | `FetchPoliciesStep` | Enabled notification policies keyed by id. |
| `matched` | `EvaluateMatchersStep` | Concrete `(episode, policy)` matches. |
| `groups` | `BuildGroupsStep` | Notification groups to consider for delivery. |
| `dispatch` / `throttled` | `ApplyThrottlingStep` | Groups that may send now vs groups held back. |

## Execution steps

Step order is defined in `setup/bind_dispatcher_executor.ts`.

| # | Step | Responsibility |
| --- | --- | --- |
| 1 | `FetchEpisodesStep` | Load episodes that should be considered in this run. |
| 2 | `FetchSuppressionsStep` | Load alert-action facts needed for suppression decisions. |
| 3 | `ApplySuppressionStep` | Mark each episode as dispatchable or suppressed, preserving reasons. |
| 4 | `FetchRulesStep` | Load rule metadata for the remaining dispatchable set. |
| 5 | `FetchPoliciesStep` | Load enabled notification policies for the space. |
| 6 | `EvaluateMatchersStep` | Evaluate each policy matcher against each episode context. |
| 7 | `BuildGroupsStep` | Build `NotificationGroup` objects based on policy grouping settings. |
| 8 | `ApplyThrottlingStep` | Compare candidate groups with notification history and split them into dispatch vs throttled. |
| 9 | `DispatchStep` | Perform delivery side effects for eligible groups. |
| 10 | `StoreActionsStep` | Persist the execution outcome to `.alert-actions`. |

## Halt reasons

| Reason | Meaning |
| --- | --- |
| `no_episodes` | Nothing relevant was found for this run. |
| `no_actions` | The run produced no stored outcomes after evaluation. |

## Delivery guarantees and limits

- Delivery is effectively at-least-once. If delivery succeeds but action recording fails or the process crashes, a later run may retry.
- Destination handlers should therefore be idempotent.
- The episode query is capped at 10,000 rows per run. Sustained backlog is processed over multiple executions.

## When to add a new dispatcher step

Add a step when you need a new distinct phase in the notification decision pipeline, especially when that phase:

- introduces new pipeline state
- must run in a specific order relative to suppression, grouping, or dispatch
- is reusable and understandable as a standalone responsibility

Do **not** add a step when:

- you only need a small change to an existing step's local behavior
- the change really belongs in the rule executor or director
- the change is only a new destination type within `DispatchStep`

## Creating a new dispatcher step

### Step 1: Create the step class

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

  public async execute(
    state: Readonly<DispatcherPipelineState>
  ): Promise<DispatcherStepOutput> {
    if (!state.episodes?.length) {
      this.logger.debug({ message: `[${this.name}] No episodes available` });
      return { type: 'continue' };
    }

    const myResult = await this.doSomething(state.episodes);

    return {
      type: 'continue',
      data: { myNewMetadata: myResult },
    };
  }

  private async doSomething(_episodes: AlertEpisode[]): Promise<string> {
    return 'ok';
  }
}
```

### Step 2: Extend pipeline state if needed

If the step produces new state, add a field to `DispatcherPipelineState` in `types.ts`:

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
  readonly myNewMetadata?: string;
}
```

### Step 3: Export and bind in order

Export the step from `steps/index.ts`, then register it in `setup/bind_dispatcher_executor.ts` where it should execute.

```typescript
import { MyNewStep } from '../lib/dispatcher/steps';

bind(DispatcherExecutionStepsToken).to(FetchEpisodesStep).inSingletonScope();
bind(DispatcherExecutionStepsToken).to(MyNewStep).inSingletonScope();
bind(DispatcherExecutionStepsToken).to(FetchSuppressionsStep).inSingletonScope();
```

Binding order is execution order.

### Step 4: Add focused tests

```typescript
import { MyNewStep } from './my_new_step';
import {
  createAlertEpisode,
  createDispatcherPipelineState,
} from '../fixtures/test_utils';
import { createLoggerService } from '../../services/logger_service/logger_service.mock';

describe('MyNewStep', () => {
  it('adds state when episodes exist', async () => {
    const { loggerService } = createLoggerService();
    const step = new MyNewStep(loggerService);

    const result = await step.execute(
      createDispatcherPipelineState({
        episodes: [createAlertEpisode({ rule_id: 'rule-1' })],
      })
    );

    expect(result.type).toBe('continue');
    if (result.type !== 'continue') return;
    expect(result.data).toMatchObject({ myNewMetadata: 'ok' });
  });
});
```

## Adding a new destination type

If you are not adding a new pipeline phase, but instead want to support a new delivery target, start with:

- `types.ts` to extend `NotificationPolicyDestination`
- `steps/dispatch_step.ts` to add the new dispatch branch
- any saved object / route validation that defines allowed destinations

Current production delivery is workflow-based. `DispatchStep` uses the policy API key to craft a fake request and schedule workflows through the workflows management plugin.

## Testing

Useful coverage points:

- `steps/*.test.ts` for step-local behavior
- `execution_pipeline.test.ts` for ordering and halt semantics
- `dispatcher.test.ts` for service-level behavior
- `queries.test.ts` for ES|QL generation
- `integration_tests/dispatcher.test.ts` for end-to-end dispatcher behavior

## Safe contribution guidelines

- Keep side effects concentrated in `DispatchStep`. Earlier steps should mostly classify and shape data.
- Do not mutate existing state objects in place; return new partial state instead.
- If you add new action semantics, verify both the query side (`queries.ts`) and the write side (`StoreActionsStep`).
- If you change grouping or throttling identity, treat it as a behavioral change that needs explicit tests because it affects future deduplication.
