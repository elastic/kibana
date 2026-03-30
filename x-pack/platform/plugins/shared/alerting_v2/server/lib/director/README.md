# Director Service

The Director is a state engine responsible for deriving alert state transitions (e.g., pending → active) from the immutable stream of raw alert events.. It processes alert events and determines their episode status using configurable transition strategies. Strategies allows us to support different transition behaviors, based on rule configuration or alert event data, without modifying the core logic of the director. 

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              DirectorService                                │
│                                                                             │
│  ┌──────────────┐    ┌─────────────────────┐    ┌────────────────────────┐  │
│  │ Alert Events │───>│ TransitionStrategy  │───>│ Enriched Alert Events  │  │
│  │   (input)    │    │     Resolver        │    │  (with episode info)   │  │
│  └──────────────┘    └─────────────────────┘    └────────────────────────┘  │
│         │                     │                          ▲                  │
│         │                     ▼                          │                  │
│         │           ┌──────────────────────┐             │                  │
│         │           │  ITransitionStrategy │             │                  │
│         │           │   (e.g., Basic)      │             │                  │
│         │           └──────────────────────┘             │                  │
│         │                     │                          │                  │
│         ▼                     ▼                          │                  │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                         State Calculation                            │   │
│  │  - Fetches previous alert state from data stream                     │   │
│  │  - Applies transition strategy to determine next episode status      │   │
│  │  - Resolves episode ID (new or existing)                             │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Core Components

### DirectorService

The `DirectorService` is the main orchestrator that:

1. Receives alert events from rule executions
2. Fetches the latest alert state for each unique `group_hash`
3. Applies a transition strategy to calculate the next episode status
4. Resolves episode IDs (creates new ones for new lifecycles)
5. Returns enriched alert events with episode information

### TransitionStrategyFactory

The `TransitionStrategyFactory` is responsible for:

- Resolving which strategy to use for each rule at runtime
- Delegating selection to each strategy through `canHandle(rule)`
- Falling back to the default strategy when no specialized strategy matches
- Auto-discovering strategies through DI multi-injection (no constructor growth as strategies increase)

### ITransitionStrategy

The `ITransitionStrategy` interface defines the contract for all transition strategies:

```typescript
interface StateTransitionContext {
  rule: RuleResponse;
  alertEvent: AlertEvent;
  previousEpisode?: LatestAlertEventState;
}

interface ITransitionStrategy {
  name: string;
  canHandle(rule: RuleResponse): boolean;
  getNextState(ctx: StateTransitionContext): StateTransitionResult;
}

interface StateTransitionResult {
  status: AlertEpisodeStatus;
  statusCount?: number;
}
```

## Alert Statuses

### Alert Event Status (Input)

These are the possible statuses of an incoming alert event:

| Status      | Description                                           |
| ----------- | ------------------------------------------------------|
| `breached`  | The alert condition has been met (threshold exceeded) |
| `recovered` | The alert condition is no longer met                  |
| `no_data`   | No data was available to evaluate the condition       |

### Alert Episode Status (Output)

These are the possible statuses of an alert episode:

| Status       | Description                                           |
| ------------ | ----------------------------------------------------- |
| `inactive`   | The alert is not active (initial or recovered state)  |
| `pending`    | The alert has breached but is not yet confirmed       |
| `active`     | The alert is confirmed active                         |
| `recovering` | The alert was active and is now recovering            |

## Episode Lifecycle

An episode represents a complete alert lifecycle from activation to recovery. The Director manages episode IDs as follows:

1. **New Episode**: A new UUID is generated when:
   - There is no previous alert state for the group
   - The previous episode was `inactive` and the new status is not `inactive`

2. **Existing Episode**: The current episode ID is preserved when:
   - The alert remains in an active lifecycle (pending, active, or recovering)

```
        ┌──────────────────────────────────────────────────────────────┐
        │                     Episode Lifecycle                        │
        │                                                              │
        │   ┌──────────┐  breached   ┌─────────┐  breached  ┌────────┐ │
        │   │ inactive │────────────>│ pending │───────────>│ active │ │
        │   └──────────┘             └─────────┘            └────────┘ │
        │        ▲                        │                     │      │
        │        │                        │                     │      │
        │        │ recovered              │ recovered           │      │
        │        │                        │                     │      │
        │        │                        ▼                     ▼      │
        │        │                   ┌──────────┐           recovered  │
        │        └───────────────────│ inactive │<──────────────┘      │
        │                            └──────────┘                      │
        │                                 ▲                            │
        │                                 │                            │
        │                            ┌────┴─────┐                      │
        │                            │recovering│<───── active         │
        │                            └──────────┘      (recovered)     │
        └──────────────────────────────────────────────────────────────┘
```

## Strategies

### BasicTransitionStrategy

The `BasicTransitionStrategy` implements a state machine with the following transition rules:

| Current Episode Status | Alert Event Status | Next Episode Status |
| ---------------------- | ------------------ | ------------------- |
| `inactive`             | `breached`         | `pending`           |
| `inactive`             | `recovered`        | `inactive`          |
| `inactive`             | `no_data`          | `inactive`          |
| `pending`              | `breached`         | `active`            |
| `pending`              | `recovered`        | `inactive`          |
| `pending`              | `no_data`          | `pending`           |
| `active`               | `breached`         | `active`            |
| `active`               | `recovered`        | `recovering`        |
| `active`               | `no_data`          | `active`            |
| `recovering`           | `breached`         | `active`            |
| `recovering`           | `recovered`        | `inactive`          |
| `recovering`           | `no_data`          | `recovering`        |

## Creating a Custom Strategy

To create a custom transition strategy, implement `ITransitionStrategy`.

### Step 1: Create the Strategy Class

```typescript
import { injectable } from 'inversify';
import { alertEpisodeStatus } from '../../../resources/alert_events';
import type { RuleResponse } from '../../rules_client/types';
import type {
  ITransitionStrategy,
  StateTransitionContext,
  StateTransitionResult,
} from './types';

@injectable()
export class CustomTransitionStrategy implements ITransitionStrategy {
  readonly name = 'custom';

  canHandle(rule: RuleResponse): boolean {
    // Return true when this strategy should be used for the given rule.
    return rule.kind === 'alert';
  }

  getNextState(ctx: StateTransitionContext): StateTransitionResult {
    // Implement your custom transition logic here.
    return { status: alertEpisodeStatus.pending, statusCount: 1 };
  }
}
```

### Step 2: Register the Strategy

Register your custom strategy with DI token-based multi-injection:

```typescript
import { BasicTransitionStrategy } from './basic_strategy';
import { TransitionStrategyFactory } from './strategy_resolver';
import { TransitionStrategyToken } from './types';
import { CustomTransitionStrategy } from './custom_strategy';

bind(TransitionStrategyFactory).toSelf().inSingletonScope();
bind(TransitionStrategyToken).to(CustomTransitionStrategy).inSingletonScope();
bind(TransitionStrategyToken).to(BasicTransitionStrategy).inSingletonScope();
```

**Important:** binding order matters.

- Specialized strategies first
- Fallback strategy (`BasicTransitionStrategy`) last

## Testing Strategies

When testing strategies, use the shared helpers in `director/test_utils.ts`:

- `buildLatestAlertEvent(...)`
- `buildStrategyStateTransitionContext(...)`

### Example: strategy unit test setup

```typescript
import { CountTimeframeStrategy } from './count_timeframe_strategy';
import { alertEpisodeStatus, alertEventStatus } from '../../../resources/alert_events';
import {
  buildLatestAlertEvent,
  buildStrategyStateTransitionContext,
} from '../test_utils';

describe('CountTimeframeStrategy', () => {
  let strategy: CountTimeframeStrategy;

  beforeEach(() => {
    strategy = new CountTimeframeStrategy();
  });

  it('transitions pending to active when threshold is met', () => {
    const result = strategy.getNextState({
      ...buildStrategyStateTransitionContext({
        eventStatus: alertEventStatus.breached,
        stateTransition: { pendingCount: 2 },
        previousEpisode: buildLatestAlertEvent({
          episodeStatus: alertEpisodeStatus.pending,
          eventStatus: alertEventStatus.breached,
          statusCount: 1,
        }),
      }),
    });

    expect(result).toEqual({ status: alertEpisodeStatus.active, statusCount: 1 });
  });
});
```

## Notes on Count/Timeframe Strategies

`CountTimeframeStrategy` extends `BasicTransitionStrategy` and adds threshold-based
gating for:

- `pending -> active`
- `recovering -> inactive`

Threshold evaluation supports:

- count only
- timeframe only
- count + timeframe with `AND` or `OR`

For timeframe evaluation, elapsed time is computed from:

- current alert event `@timestamp`
- previous episode `last_episode_timestamp`