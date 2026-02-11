# Rule Executor

The Rule Executor is responsible for executing alerting rules on a schedule. It fetches rule definitions, executes ES|QL queries, builds alert events from query results, and stores them in Elasticsearch.

## Overview

When a rule is scheduled to run, the Task Manager triggers the Rule Executor. The executor follows a **pipeline pattern** where execution flows through a series of discrete steps, each handling a specific responsibility.

### What the Rule Executor Does

1. **Waits for resources** - Ensures required Elasticsearch resources (data streams, templates) are ready
2. **Fetches the rule** - Retrieves the rule definition from Saved Objects
3. **Validates the rule** - Checks if the rule is enabled and can be executed
4. **Builds the query** - Constructs the ES|QL query with time range filters
5. **Executes the query** - Runs the ES|QL query against Elasticsearch
6. **Builds alerts** - Transforms query results into alert events
7. **Stores alerts** - Persists alert events to the alerts event data stream

## Architecture

The executor uses a **hybrid architecture** combining:
- **Pipeline Pattern** for sequential step execution
- **Middleware** for global cross-cutting concerns
- **Decorators** for per-step operations

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
          │ • ErrorHandling │                 │                 │
          └─────────────────┘                 └─────────────────┘
                                                      │
    ┌─────────────┬─────────────┬─────────────┬──────┴──────┬─────────────┐
    ▼             ▼             ▼             ▼             ▼             ▼
┌───────┐   ┌───────┐   ┌───────┐   ┌───────┐   ┌───────┐   ┌───────┐   ┌───────┐
│ Wait  │──►│ Fetch │──►│Validate│──►│ Build │──►│Execute│──►│ Build │──►│ Store │
│  For  │   │ Rule  │   │ Rule  │   │ Query │   │ Query │   │Alerts │   │Alerts │
│Resources  │       │   │       │   │       │   │       │   │       │   │       │
└───────┘   └───────┘   └───────┘   └───────┘   └───────┘   └───────┘   └───────┘
                                      │
                                      ▼
                          ┌─────────────────────┐
                          │  RulePipelineState  │
                          │   (immutable)       │
                          └─────────────────────┘
```

## Core Components

### RuleExecutorTaskRunner

**Location:** `task_runner.ts`

The entry point for rule execution. It:
- Receives task instance data from Task Manager
- Extracts execution input (ruleId, spaceId, scheduledAt, abortSignal)
- Delegates to `RuleExecutionPipeline`
- Translates pipeline results back to Task Manager's `RunResult`

### RuleExecutionPipeline

**Location:** `execution_pipeline.ts`

Orchestrates step execution with middleware support. It:
- Maintains immutable pipeline state
- Executes steps sequentially
- Wraps each step with the middleware chain
- Handles halt conditions (rule deleted, rule disabled)

### Execution Steps

Steps are self-contained units of work that implement `RuleExecutionStep`:

| Step | Purpose |
|------|---------|
| `WaitForResourcesStep` | Waits for ES resources to be ready | 
| `FetchRuleStep` | Fetches rule from Saved Objects | 
| `ValidateRuleStep` | Validates rule is enabled | 
| `ExecuteRuleQueryStep` | Builds and executes ES|QL query | 
| `CreateAlertEventsStep` | Builds alert events batches | 
| `DirectorStep` | Attaches episode information to alert batches |
| `StoreAlertEventsStep` | Persists alert event batches |

## Key Design Principles

1. **Immutable Stream State**: Steps consume a `PipelineStateStream` and emit `StepStreamResult` objects. Never mutate incoming state directly; always emit a new state object when updating fields.

2. **Domain-Driven**: Steps work with domain concepts only. No task manager types (`taskInstance`, `RunResult`) are exposed to steps.

3. **Single Responsibility**: Each step handles one logical unit of work.

4. **Dependency Injection**: Steps use Inversify for dependency injection. Dependencies are injected via constructor.

5. **Separation of Concerns**: Global operations use middleware; step-specific operations use decorators.

## Middleware vs Decorators

| Layer | Purpose |  
|-------|---------|
| **Middleware** | Global cross-cutting concerns | ALL steps | 
| **Decorators** | Step-specific operations | Selected steps |  

---

## Creating a New Step

### Step 1: Create the Step File

Create a new file in `steps/` directory (e.g., `my_new_step.ts`):

```typescript
import { inject, injectable } from 'inversify';
import type { PipelineStateStream, RuleExecutionStep } from '../types';
import { mapOneToOneStep, requireState } from '../stream_utils';
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
    return mapOneToOneStep(input, async (state) => {
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

Add your step to `setup/bind_rule_executor.ts`:

```typescript
import { MyNewStep } from '../lib/rule_executor/steps';

const bindRuleExecutionServices = (bind: ContainerModuleLoadOptions['bind']) => {
  // Bind your new step
  bind(MyNewStep).toSelf().inRequestScope();

  // Add to the steps array at the desired position
  bind(RuleExecutionStepsToken)
    .toDynamicValue(({ get }) => [
      get(WaitForResourcesStep),
      get(FetchRuleStep),
      get(ValidateRuleStep),
      get(ExecuteRuleQueryStep),
      get(MyNewStep),          // <-- Insert at desired position
      get(CreateAlertEventsStep),
      get(DirectorStep),
      get(StoreAlertEventsStep),
    ])
    .inRequestScope();
};
```

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

Middleware applies to **all steps** and is ideal for global cross-cutting concerns like error handling, performance measurement, or request tracing.

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

Add your middleware to `setup/bind_rule_executor.ts`:

```typescript
import { PerformanceMiddleware } from '../lib/rule_executor/middleware';

const bindRuleExecutionServices = (bind: ContainerModuleLoadOptions['bind']) => {
  bind(ErrorHandlingMiddleware).toSelf().inSingletonScope();
  bind(PerformanceMiddleware).toSelf().inSingletonScope();

  // Order matters - first is outermost
  bind(RuleExecutionMiddlewaresToken)
    .toDynamicValue(({ get }) => [
      get(PerformanceMiddleware),     // Outermost - measures total time
      get(ErrorHandlingMiddleware),   // Inner - catches errors
    ])
    .inSingletonScope();
};
```

### Current Middleware

| Middleware | Purpose |
|------------|---------|
| `ErrorHandlingMiddleware` | Centralized error logging for all steps |

---

## Decorators

Decorators wrap **specific steps** to add behavior without modifying the step implementation. Use decorators when you need per-step control without adding conditionals to middleware.

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

### Applying Decorators

Wrap specific steps at DI binding time in `setup/bind_rule_executor.ts`:

```typescript
import { AuditLoggingDecorator } from '../lib/rule_executor/steps/decorators';

bind(RuleExecutionStepsToken)
  .toDynamicValue(({ get }) => {
    const auditService = get(AuditService);

    return [
      get(WaitForResourcesStep),
      get(FetchRuleStep),
      // Only ValidateRuleStep gets audit logging
      new AuditLoggingDecorator(get(ValidateRuleStep), auditService),
      get(ExecuteRuleQueryStep),
      get(CreateAlertEventsStep),
    ];
  })
  .inRequestScope();
```
---

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