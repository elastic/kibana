# Director

> **Prerequisite:** Read the [server-level README](../../README.md) first for the plugin-wide architecture and terminology.

The director is the alert lifecycle engine. It takes alert-type rule events from the rule executor, looks up the latest known state for each `group_hash`, chooses a transition strategy, and returns enriched alert events with `episode.*` fields attached.

It runs inside the rule executor as [`DirectorStep`](../rule_executor/steps/director_step.ts). It is not a standalone Task Manager task.

## What the director owns

- Mapping an incoming alert event plus prior alert state to the next episode state
- Assigning or reusing `episode.id`
- Encapsulating lifecycle rules behind transition strategies

## What the director does not own

- Running ES|QL
- Deciding recovery semantics
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
  (same events + episode.id/status/status_count)
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

`episode.status_count` tracks consecutive evaluations in the current status when a strategy needs count-based thresholds.

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

### `CountTimeframeStrategy`

`CountTimeframeStrategy` extends the basic state machine with threshold gating for:

- `pending -> active`
- `recovering -> inactive`

A `no_data` event on a rule with `no_data.strategy: 'resolve'` always bypasses this gating and resolves directly to `inactive`, regardless of `state_transition.recovering.count` / `state_transition.recovering.timeframe`.

It supports:

- count only
- timeframe only
- count + timeframe with `AND` / `OR`

For timeframe evaluation, it compares the director run time (`evaluatedAt`) with the last stored episode timestamp; the current event has no `@timestamp` yet, since ES sets it at ingest.

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

**Caveat:** elapsed time for an `and`-combined `timeframe` is measured against the previous evaluation's stored timestamp, not against when the phase was entered (see above), so it never accumulates past roughly one schedule interval. An `and`-combined `timeframe` therefore only resolves reliably when the rule's schedule interval is >= the timeframe; on a shorter schedule it holds the phase indefinitely. This applies to any count, not just `0`.

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