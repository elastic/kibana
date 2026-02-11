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
| `CreateAlertEventsStep` | Builds and stores alert events | 

## Key Design Principles

1. **Immutable State**: Steps receive `Readonly<RulePipelineState>` and return new data via `RuleStepOutput`. Never mutate state directly.

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
import type { RuleExecutionStep, RulePipelineState, RuleStepOutput } from '../types';
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

  public async execute(state: Readonly<RulePipelineState>): Promise<RuleStepOutput> {
    const { input, rule } = state;

    // Validate required state from previous steps
    if (!rule) {
      throw new Error('MyNewStep requires rule from previous step');
    }

    // Perform your logic here
    const myResult = await this.doSomething(rule);

    // Return one of three options:

    // Option 1: Continue with new data to add to state
    return { type: 'continue', data: { myNewField: myResult } };

    // Option 2: Continue without adding data
    // return { type: 'continue' };

    // Option 3: Halt pipeline with a domain reason
    // return { type: 'halt', reason: 'rule_disabled' };
  }

  private async doSomething(rule: RuleResponse): Promise<unknown> {
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
  readonly esqlResponse?: ESQLSearchResponse;
  readonly alertEvents?: Array<{ id: string; doc: AlertEvent }>;
  readonly myNewField?: MyNewFieldType; // Add your new field
}
```

### Step 4: Register in DI Container

Add your step to `setup/bind_services.ts`:

```typescript
import { MyNewStep } from '../lib/rule_executor/steps';

const bindRuleExecutionServices = (bind: ContainerModuleLoadOptions['bind']) => {
  // Bind your new step
  bind(MyNewStep).toSelf().inSingletonScope();

  // Add to the steps array at the desired position
  bind(RuleExecutionStepsToken)
    .toDynamicValue(({ get }) => [
      get(WaitForResourcesStep),
      get(FetchRuleStep),
      get(ValidateRuleStep),
      get(ExecuteRuleQueryStep),
      get(MyNewStep),          // <-- Insert at desired position
      get(CreateAlertEventsStep),
    ])
    .inRequestScope();
};
```

### Step 5: Add Tests

Create a test file `steps/my_new_step.test.ts`:

```typescript
import { MyNewStep } from './my_new_step';
import { createRuleExecutionInput, createRuleResponse } from '../test_utils';
import { createLoggerService } from '../../services/logger_service/logger_service.mock';

describe('MyNewStep', () => {
  it('continues with data when successful', async () => {
    const { loggerService } = createLoggerService();
    const step = new MyNewStep(loggerService);

    const state = {
      input: createRuleExecutionInput(),
      rule: createRuleResponse(),
    };

    const result = await step.execute(state);

    expect(result.type).toBe('continue');
    expect(result).toHaveProperty('data.myNewField');
  });

  it('throws when required state is missing', async () => {
    const { loggerService } = createLoggerService();
    const step = new MyNewStep(loggerService);

    const state = { input: createRuleExecutionInput() };

    await expect(step.execute(state)).rejects.toThrow(
      'MyNewStep requires rule from previous step'
    );
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
        └─► step.execute()
        ◄── returns result
  ◄── returns result
```

### Creating a New Middleware

Create a new file in `middleware/` directory (e.g., `performance_middleware.ts`):

```typescript
import { inject, injectable } from 'inversify';
import type { RuleExecutionMiddlewareContext, RuleExecutionMiddleware } from './types';
import type { RuleStepOutput } from '../types';
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

  public async execute(
    ctx: RuleExecutionMiddlewareContext,
    next: () => Promise<RuleStepOutput>
  ): Promise<RuleStepOutput> {
    const start = performance.now();
    try {
      return await next();
    } finally {
      const duration = performance.now() - start;
      this.logger.debug({
        message: `Step [${ctx.step.name}] completed in ${duration.toFixed(2)}ms`,
      });
    }
  }
}
```

### Registering Middleware

Add your middleware to `setup/bind_services.ts`:

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
import type { RulePipelineState, RuleStepOutput } from '../../types';

export class AuditLoggingDecorator extends RuleStepDecorator {
  constructor(
    step: RuleExecutionStep,
    private readonly auditService: AuditServiceContract
  ) {
    super(step);
  }

  public async execute(state: Readonly<RulePipelineState>): Promise<RuleStepOutput> {
    await this.auditService.log({
      action: `rule_execution.step.${this.name}.start`,
      ruleId: state.input.ruleId,
      spaceId: state.input.spaceId,
    });

    const result = await this.step.execute(state);

    await this.auditService.log({
      action: `rule_execution.step.${this.name}.${result.type}`,
      ruleId: state.input.ruleId,
      spaceId: state.input.spaceId,
    });

    return result;
  }
}
```

### Applying Decorators

Wrap specific steps at DI binding time in `setup/bind_services.ts`:

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
import { createRuleExecutionInput, createRuleResponse } from '../test_utils';
import { createLoggerService } from '../../services/logger_service/logger_service.mock';

describe('MyStep', () => {
  it('executes successfully', async () => {
    const { loggerService } = createLoggerService();
    const step = new MyStep(loggerService);

    const state = {
      input: createRuleExecutionInput(),
      rule: createRuleResponse(),
    };

    const result = await step.execute(state);

    expect(result.type).toBe('continue');
  });
});
```

### Testing Middleware

```typescript
import { ErrorHandlingMiddleware } from './error_handling_middleware';
import { createRuleExecutionInput } from '../test_utils';
import { createLoggerService } from '../../services/logger_service/logger_service.mock';

describe('ErrorHandlingMiddleware', () => {
  it('calls next and returns result on success', async () => {
    const { loggerService, mockLogger } = createLoggerService();
    const middleware = new ErrorHandlingMiddleware(loggerService);

    const expectedResult = { type: 'continue' as const };
    const next = jest.fn().mockResolvedValue(expectedResult);

    const context = {
      step: { name: 'test_step', execute: jest.fn() },
      state: { input: createRuleExecutionInput() },
    };

    const result = await middleware.execute(context, next);

    expect(result).toEqual(expectedResult);
    expect(mockLogger.error).not.toHaveBeenCalled();
  });

  it('logs error and rethrows on failure', async () => {
    const { loggerService, mockLogger } = createLoggerService();
    const middleware = new ErrorHandlingMiddleware(loggerService);

    const next = jest.fn().mockRejectedValue(new Error('Step failed'));
    const context = {
      step: { name: 'failing_step', execute: jest.fn() },
      state: { input: createRuleExecutionInput() },
    };

    await expect(middleware.execute(context, next)).rejects.toThrow('Step failed');
    expect(mockLogger.error).toHaveBeenCalled();
  });
});
```

### Testing Decorators

```typescript
import { AuditLoggingDecorator } from './audit_logging_decorator';
import { createRuleExecutionInput } from '../test_utils';

describe('AuditLoggingDecorator', () => {
  it('logs before and after step execution', async () => {
    const mockStep = {
      name: 'test_step',
      execute: jest.fn().mockResolvedValue({ type: 'continue' }),
    };
    const mockAuditService = { log: jest.fn() };

    const decorator = new AuditLoggingDecorator(mockStep, mockAuditService);
    const state = { input: createRuleExecutionInput() };

    await decorator.execute(state);

    expect(mockAuditService.log).toHaveBeenCalledTimes(1);
  });

  it('propagates errors from wrapped step', async () => {
    const mockStep = {
      name: 'failing_step',
      execute: jest.fn().mockRejectedValue(new Error('Step failed')),
    };
    const mockAuditService = { log: jest.fn() };

    const decorator = new AuditLoggingDecorator(mockStep, mockAuditService);
    const state = { input: createRuleExecutionInput() };

    await expect(decorator.execute(state)).rejects.toThrow('Step failed');
  });
});
```