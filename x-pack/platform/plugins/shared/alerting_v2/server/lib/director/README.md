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

### TransitionStrategyResolver

The `TransitionStrategyResolver` is responsible for:

- Registering available transition strategies
- Resolving which strategy to use for state transitions
- Providing a default strategy when none is specified

### ITransitionStrategy

The `ITransitionStrategy` interface defines the contract for all transition strategies:

```typescript
interface TransitionContext {
  currentAlertEpisodeStatus?: AlertEpisodeStatus | null;
  alertEventStatus: AlertEventStatus;
}

interface ITransitionStrategy {
  name: string;
  getNextState(ctx: TransitionContext): AlertEpisodeStatus;
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

To create a custom transition strategy, implement the `ITransitionStrategy` interface.

### Step 1: Create the Strategy Class

```typescript
import { injectable } from 'inversify';
import { alertEpisodeStatus, type AlertEpisodeStatus } from '../../../resources/alert_events';
import type { ITransitionStrategy, TransitionContext } from './types';

@injectable()
export class CustomTransitionStrategy implements ITransitionStrategy {
  readonly name = 'custom';

  getNextState({
    currentAlertEpisodeStatus,
    alertEventStatus,
  }: TransitionContext): AlertEpisodeStatus {
    // Implement your custom transition logic here
    
    return alertEpisodeStatus.pending;
    
  }
}
```

### Step 2: Register the Strategy

Register your custom strategy with the `TransitionStrategyResolver`:

```typescript
import { inject, injectable } from 'inversify';
import type { ITransitionStrategy } from './types';
import { BasicTransitionStrategy } from './basic_strategy';
import { CustomTransitionStrategy } from './custom_strategy';

@injectable()
export class TransitionStrategyResolver {
  private strategies = new Map<string, ITransitionStrategy>();
  private defaultStrategy: ITransitionStrategy;

  constructor(
    @inject(BasicTransitionStrategy) basic: BasicTransitionStrategy,
    @inject(CustomTransitionStrategy) custom: CustomTransitionStrategy
  ) {
    this.register(basic);
    this.register(custom);
    this.defaultStrategy = basic;
  }

  register(strategy: ITransitionStrategy) {
    this.strategies.set(strategy.name, strategy);
  }

  resolve(strategyName?: string): ITransitionStrategy {
    if (strategyName) {
      const strategy = this.strategies.get(strategyName);
      if (strategy) {
        return strategy;
      }
    }
    return this.defaultStrategy;
  }
}
```

### Step 3: Bind the Strategy in the DI Container

Add the binding in your module's DI container configuration:

```typescript
container.bind(CustomTransitionStrategy).toSelf().inSingletonScope();
```

## Testing Strategies

When testing custom strategies, you can use the following pattern:

```typescript
import { BasicTransitionStrategy } from './basic_strategy';
import { alertEpisodeStatus, alertEventStatus } from '../../../resources/alert_events';

describe('BasicTransitionStrategy', () => {
  let strategy: BasicTransitionStrategy;

  beforeEach(() => {
    strategy = new BasicTransitionStrategy();
  });

  it('should transition from inactive to pending on breach', () => {
    const result = strategy.getNextState({
      currentAlertEpisodeStatus: alertEpisodeStatus.inactive,
      alertEventStatus: alertEventStatus.breached,
    });

    expect(result).toBe(alertEpisodeStatus.pending);
  });

  it('should transition from pending to active on consecutive breach', () => {
    const result = strategy.getNextState({
      currentAlertEpisodeStatus: alertEpisodeStatus.pending,
      alertEventStatus: alertEventStatus.breached,
    });

    expect(result).toBe(alertEpisodeStatus.active);
  });

  it('should transition from active to recovering on recovery', () => {
    const result = strategy.getNextState({
      currentAlertEpisodeStatus: alertEpisodeStatus.active,
      alertEventStatus: alertEventStatus.recovered,
    });

    expect(result).toBe(alertEpisodeStatus.recovering);
  });

  it('should handle null current status', () => {
    const result = strategy.getNextState({
      currentAlertEpisodeStatus: null,
      alertEventStatus: alertEventStatus.breached,
    });

    expect(result).toBe(alertEpisodeStatus.pending);
  });
});
```