# Director

> **Prerequisite:** Read the [server-level README](../../README.md) first for the plugin-wide architecture and terminology.

The director is the alert lifecycle engine. It takes alert-type rule events from the rule executor, looks up the latest known state for each `group_hash`, chooses a transition strategy, and returns enriched alert events with `alert.*` fields attached.

It runs inside the rule executor as [`DirectorStep`](../rule_executor/steps/director_step.ts). It is not a standalone Task Manager task.

## What the director owns

- Mapping an incoming alert event plus prior alert state to the next episode state
- Assigning or reusing the episode id (`alert.id`)
- Encapsulating lifecycle rules behind transition strategies
- Returning the prior state it loaded (`previousAlertStateByGroupHash`) so downstream write-policy steps can compare against it without a second round trip

## What the director does not own

- Running ES|QL
- Deciding recovery semantics
- Deciding whether an enriched event is worth persisting — that is write policy, owned by `SuppressRedundantNoDataEventsStep` in the rule executor
- Sending notifications
- Persisting actions to `.alert-actions`

Those responsibilities belong to the rule executor or dispatcher.

## Data flow

```text
Rule executor batch
  (alert events only)
        |
        v
DirectorService
  1. load latest state by group_hash
  2. select strategy for the rule
  3. compute next episode state
  4. resolve episode id
        |
        v
Enriched alert events
  (same events + alert.id/status/status_count)
```

## How it works

### Inputs

The director receives:

- the current `rule`
- the current batch of `AlertEvent` documents
- an `ExecutionContext` for cancellation

Only alert-type events should reach the director. Signal rules skip lifecycle enrichment earlier in the rule executor.

### Previous state lookup

`DirectorService` queries `.rule-events` for the latest known alert state per `group_hash`. That prior state is the context used to decide whether an episode should stay open, advance, recover, or start fresh.

### Strategy selection

`TransitionStrategyFactory` selects the first registered strategy whose `canHandle(rule)` returns `true`. The last registered strategy is the fallback.

Today the default order is:

1. `CountTimeframeStrategy`
2. `BasicTransitionStrategy` (fallback)

That order is defined in `setup/bind_services.ts`.

### Episode id resolution

The director creates a new episode id when:

- there is no prior state for the series, or
- the previous episode was `inactive` and the new status is not `inactive`

Otherwise it preserves the existing episode id so the lifecycle stays correlated across runs.

A new episode id is **deterministic** (uuid v5), seeded from `rule.id | group_hash | scheduled_timestamp`, not a random uuid. This matters because the director runs once per streamed batch and a single-series (ungrouped) rule emits one event per returned row — many events sharing one `group_hash` within a run, spread across batches the director processes independently against the same (empty, for a new series) prior state. A random id per event would split that one series into many episodes; seeding from the run's scheduled timestamp collapses every new-episode event of a run to the same id (within and across batches, with no shared state), while a later run that reopens the series gets a different id because the timestamp differs. A series opens at most one episode per run, so distinct episodes never collide, and the id is idempotent across task retries of the same run.

## Lifecycle concepts

### Input event status

Incoming alert events can have one of these statuses:

| Status | Meaning |
| --- | --- |
| `breached` | The rule matched for that group in this run. |
| `recovered` | The group was previously active but no longer breaches. |
| `no_data` | The rule could not determine a normal breach/recovery outcome. |

### Output episode status

The director writes one of these episode statuses:

| Status | Meaning |
| --- | --- |
| `inactive` | No active lifecycle is in progress. |
| `pending` | The series is breaching but activation criteria are not satisfied yet. |
| `active` | The series is actively alerting. |
| `recovering` | The series stopped breaching but has not fully closed yet. |

`alert.status_count` tracks consecutive evaluations in the current status when a strategy needs count-based thresholds.

## Current strategies

### `BasicTransitionStrategy`

`BasicTransitionStrategy` is the fallback finite state machine. It handles the base lifecycle transitions without additional threshold gating.

| Current episode status | Incoming event status | Next episode status |
| --- | --- | --- |
| `inactive` | `breached` | `pending` |
| `inactive` | `recovered` | `inactive` |
| `pending` | `breached` | `active` |
| `pending` | `recovered` | `inactive` |
| `active` | `breached` | `active` |
| `active` | `recovered` | `recovering` |
| `recovering` | `breached` | `active` |
| `recovering` | `recovered` | `inactive` |

`no_data` transitions depend on `rule.no_data.strategy`:

| Current episode status | `no_data.strategy` | Next episode status |
| --- | --- | --- |
| any | `'alert'` | `active` |
| any | `'keep_last'` | (unchanged — preserve current status) |
| `inactive` | `'resolve'` | `inactive` |
| `pending` | `'resolve'` | `inactive` |
| `active` | `'resolve'` | `inactive` |
| `recovering` | `'resolve'` | `inactive` |

For `'resolve'`, the episode resolves directly to `inactive` on the first no-data run. `'ignore'` never produces a `no_data` event to begin with.

#### Held groups write one marker

The executor re-synthesizes a `no_data` event for every active group that is absent from the breach set and has no data, on every run. For a held group (`'keep_last'`, or a user `activate` lock) that would persist one identical event per run for as long as the group stays absent.

The director does **not** drop those events — it stays a pure 1:1 state function and returns every enriched event. Instead it threads the prior state it loaded onto `state.previousAlertStateByGroupHash`, and [`SuppressRedundantNoDataEventsStep`](../rule_executor/steps/suppress_redundant_no_data_events_step.ts) (the step right after `DirectorStep`) drops a `no_data` event when the previous persisted event for the group was also `no_data` **and** the resolved episode id, `alert.status` and `alert.status_count` match the persisted state. The effect:

- The first `no_data` after a `breached` / `recovered` event is the **transition marker** and is always written. Its `alert.status` carries the held status, so `LAST(alert.status, @timestamp)` readers keep seeing it. (Raw `status` is `no_data` on that marker — readers that want the held status must read `alert.status`.)
- While the group stays absent nothing further is written. The held alert is **sparse**: time-windowed queries stop seeing it once the marker leaves their window.
- `breached` / `recovered` events are never dropped, so a group that resumes reporting resumes normal event writing through them.
- The strategy still runs every tick; only the director's output is compared. A rule edited from `'keep_last'` to `'resolve'` while a group is absent therefore resolves on the next run.

### `CountTimeframeStrategy`

`CountTimeframeStrategy` extends the basic state machine with threshold gating for:

- `pending -> active`
- `recovering -> inactive`

A `no_data` event on a rule with `no_data.strategy: 'resolve'` always bypasses this gating and resolves directly to `inactive`, regardless of `state_transition.recovering.count` / `state_transition.recovering.timeframe`.

It supports:

- count only
- timeframe only
- count + timeframe with `AND` / `OR`

For timeframe evaluation, it compares the director run time (`evaluatedAt`) with the timestamp the phase was entered; the current event has no `@timestamp` yet, since ES sets it at ingest.

#### Count semantics

A count of `N` is the number of evaluations the episode spends in the phase. The phase resolves on the evaluation after that, so with consecutive breaches:

| `pending.count` | eval 1 | eval 2 | eval 3 | Becomes `active` on |
| --- | --- | --- | --- | --- |
| `0` | `active` | `active` | `active` | evaluation 1 |
| `1` | `pending` | `active` | `active` | evaluation 2 |
| `2` | `pending` | `pending` | `active` | evaluation 3 |
| `3` | `pending` | `pending` | `pending` | evaluation 4 |

`recovering.count` behaves the same way for `recovering -> inactive`.

A count of `0` skips the phase, unless a `timeframe` is combined with it using `and`: then the timeframe still has to elapse, so `{ count: 0, timeframe: '5m', operator: 'and' }` holds the phase until the timeframe is met. With `or`, the count alone is enough and the phase is skipped.

#### Timeframe semantics

Elapsed time for a `timeframe` is measured against the timestamp the phase was entered. That timestamp is not persisted as its own field; it is **derived** by `getLatestAlertEventStateQuery` as `MAX(@timestamp)` over the episode's `status_count == 1` events. `status_count` resets to `1` on every phase entry and increments while the phase is held, so the latest `status_count == 1` event marks the start of the current run (`last_episode_phase_started_at`).

Elapsed time therefore accumulates across evaluations, so an `and`-combined `timeframe` resolves once cumulative elapsed time exceeds it regardless of how the rule's schedule interval compares to the timeframe (a 5m timeframe on a 1m schedule resolves after ~5 evaluations). This holds for any count.

> **Note:** the derivation reads the phase-entry event back from the `.rule-events` data stream, so the entry event can be missing when a `timeframe` outlives the stream's retention, or when `state_transition` is configured while an episode is already mid-phase. In that case `last_episode_phase_started_at` is `null` and elapsed time falls back to `last_episode_timestamp` (the previous evaluation), so the phase keeps advancing instead of stalling at 0 until the signal flaps. Phase durations are expected to be well within retention, where the exact phase-entry timestamp is used.

## When to add a new strategy

Add a strategy when the lifecycle rules depend on rule configuration and the variation can be isolated behind `canHandle(rule)` + `getNextState(...)`.

Do **not** add a new strategy when:

- you only need a small change to the existing basic or count/timeframe behavior
- the problem is really about how rule events are created upstream
- the problem is really about dispatching or suppression downstream

## Creating a custom strategy

### Step 1: Implement `ITransitionStrategy`

```typescript
import { injectable } from 'inversify';
import { alertEpisodeStatus } from '../../../resources/datastreams/alert_events';
import type { RuleResponse } from '../../rules_client/types';
import type {
  ITransitionStrategy,
  StateTransitionContext,
  StateTransitionResult,
} from './types';

@injectable()
export class CustomTransitionStrategy implements ITransitionStrategy {
  public readonly name = 'custom';

  public canHandle(rule: RuleResponse): boolean {
    return rule.kind === 'alert';
  }

  public getNextState(_ctx: StateTransitionContext): StateTransitionResult {
    return { status: alertEpisodeStatus.pending, statusCount: 1 };
  }
}
```

### Step 2: Register it in binding order

Strategies are registered through `TransitionStrategyToken` in `setup/bind_services.ts`.

```typescript
import { CountTimeframeStrategy } from '../lib/director/strategies/count_timeframe_strategy';
import { CustomTransitionStrategy } from '../lib/director/strategies/custom_transition_strategy';
import { BasicTransitionStrategy } from '../lib/director/strategies/basic_strategy';
import { TransitionStrategyToken } from '../lib/director/strategies/types';

bind(TransitionStrategyToken).to(CountTimeframeStrategy).inSingletonScope();
bind(TransitionStrategyToken).to(CustomTransitionStrategy).inSingletonScope();
bind(TransitionStrategyToken).to(BasicTransitionStrategy).inSingletonScope();
```

Binding order matters:

- specialized strategies first
- fallback last

## Testing strategies

Use `test_utils.ts` to build stable fixtures:

- `buildLatestAlertEvent(...)`
- `buildStrategyStateTransitionContext(...)`

Example:

```typescript
import { CountTimeframeStrategy } from './count_timeframe_strategy';
import { alertEpisodeStatus, alertEventStatus } from '../../../resources/datastreams/alert_events';
import { createLoggerService } from '../../services/logger_service/logger_service.mock';
import {
  buildLatestAlertEvent,
  buildStrategyStateTransitionContext,
} from '../test_utils';

describe('CountTimeframeStrategy', () => {
  it('transitions pending to active when threshold is met', () => {
    const { loggerService } = createLoggerService();
    const strategy = new CountTimeframeStrategy(loggerService);

    const result = strategy.getNextState(
      buildStrategyStateTransitionContext({
        eventStatus: alertEventStatus.breached,
        stateTransition: { pendingCount: 2 },
        previousEpisode: buildLatestAlertEvent({
          episodeStatus: alertEpisodeStatus.pending,
          eventStatus: alertEventStatus.breached,
          statusCount: 1,
        }),
      })
    );

    expect(result).toEqual({ status: alertEpisodeStatus.active, statusCount: 1 });
  });
});
```

## Safe contribution guidelines

- Keep `DirectorService` orchestration small. Strategy-specific branching belongs in strategy classes, not in the director.
- Treat `.rule-events` as the source of truth for prior lifecycle state.
- If you change lifecycle semantics, update both the strategy tests and the server-level architecture docs.
- If you add fields consumed by the director, verify the resources schema and the upstream rule executor both produce them consistently.