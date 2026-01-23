# Rule Execution Pipeline Steps

This directory contains the execution steps for the rule executor pipeline. Each step is a self-contained unit of work that follows the **Pipeline Pattern** with immutable state.

## Architecture Overview

The pipeline uses a hybrid architecture combining **middleware** for global operations and **decorators** for per-step control.

```
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
          │ (global ops)    │                 │  (some wrapped  │
          │                 │    wraps each   │  with decorators│
          │ • ErrorHandling │ ─────────────►  │  for per-step   │
          │ • Performance   │                 │  operations)    │
          │ • ...           │                 │                 │
          └─────────────────┘                 └─────────────────┘
                                                      │
          ┌───────────────────────────┬───────────────┴───────────────┐
          ▼                           ▼                               ▼
   ┌─────────────┐             ┌─────────────┐                 ┌─────────────┐
   │   Step 1    │  ────────►  │   Step 2    │  ────────────►  │   Step N    │
   └─────────────┘             └─────────────┘                 └─────────────┘
          │                           │                               │
          └───────────────────────────┴───────────────────────────────┘
                                      ▼
                          ┌─────────────────────┐
                          │  RulePipelineState  │
                          │   (immutable)       │
                          └─────────────────────┘
```

### Middleware vs Decorators

| Layer | Purpose | Scope | When to Use |
|-------|---------|-------|-------------|
| **Middleware** | Global cross-cutting concerns | ALL steps | Error handling, performance timing, logging |
| **Decorators** | Step-specific operations | Selected steps | Audit logging on sensitive operations |

## Key Design Principles

1. **Immutable State**: Steps receive `Readonly<RulePipelineState>` and return new data via `RuleStepOutput`. Never mutate state directly.

2. **Domain-Driven**: Steps work with domain concepts only. No task manager types (`taskInstance`, `RunResult`) are exposed to steps.

3. **Single Responsibility**: Each step handles one logical unit of work.

4. **Dependency Injection**: Steps use Inversify for dependency injection. Dependencies are injected via constructor.

5. **Separation of Concerns**: Global operations use middleware; step-specific operations use decorators.

## Creating a New Step

### Step 1: Create the Step File

Create a new file in `steps/` directory (e.g., `my_new_step.ts`):

```typescript
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { inject, injectable } from 'inversify';
import type { RuleExecutionStep, RulePipelineState, RuleStepOutput } from '../types';
import { continueWith, continueExecution, halt } from '../types';
import {
  LoggerServiceToken,
  type LoggerServiceContract,
} from '../../services/logger_service/logger_service';

@injectable()
export class MyNewStep implements RuleExecutionStep {
  // Step name - used for logging and debugging
  public readonly name = 'my_new_step';

  constructor(
    // Inject dependencies via constructor
    @inject(LoggerServiceToken) private readonly logger: LoggerServiceContract
  ) {}

  public async execute(state: Readonly<RulePipelineState>): Promise<RuleStepOutput> {
    // Access input and previously accumulated state
    const { input, ruleDoc } = state;

    // Validate required state from previous steps
    if (!ruleDoc) {
      throw new Error('MyNewStep requires ruleDoc from previous step');
    }

    // Perform your logic here
    const myResult = await this.doSomething(ruleDoc);

    // Return one of three options:

    // Option 1: Continue with new data to add to state
    return continueWith({ myNewField: myResult });

    // Option 2: Continue without adding data
    // return continueExecution();

    // Option 3: Halt pipeline with a domain reason
    // return halt('rule_disabled');
  }

  private async doSomething(ruleDoc: RuleResponse): Promise<unknown> {
    // Your implementation
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
  readonly ruleDoc?: RuleResponse;
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
  // ... existing bindings ...
  
  // Bind your new step
  // Use inSingletonScope() for stateless steps
  // Use inRequestScope() for steps that need request-scoped dependencies
  bind(MyNewStep).toSelf().inSingletonScope();

  // Add to the steps array at the desired position
  bind(RuleExecutionStepsToken)
    .toDynamicValue(({ get }) => [
      get(WaitForResourcesStep),
      get(FetchRuleStep),
      get(ValidateRuleStep),
      get(BuildQueryStep),
      get(MyNewStep),          // <-- Insert at desired position
      get(ExecuteQueryStep),
      get(BuildAlertsStep),
      get(StoreAlertsStep),
    ])
    .inRequestScope();

  bind(RuleExecutionPipeline).toSelf().inRequestScope();
};
```

### Step 5: Add Tests

Create a test file `steps/my_new_step.test.ts`:

```typescript
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MyNewStep } from './my_new_step';
import type { RulePipelineState, RuleExecutionInput } from '../types';
import { createMockLoggerService } from '../../services/logger_service/logger_service.mock';

describe('MyNewStep', () => {
  const createInput = (): RuleExecutionInput => ({
    ruleId: 'rule-1',
    spaceId: 'default',
    scheduledAt: '2025-01-01T00:00:00.000Z',
    abortSignal: new AbortController().signal,
  });

  const createState = (overrides: Partial<RulePipelineState> = {}): RulePipelineState => ({
    input: createInput(),
    ...overrides,
  });

  it('continues with data when successful', async () => {
    const { loggerService } = createMockLoggerService();
    const step = new MyNewStep(loggerService);

    const state = createState({
      ruleDoc: { id: 'rule-1', name: 'Test', /* ... */ },
    });

    const result = await step.execute(state);

    expect(result).toEqual({
      type: 'continue',
      data: { myNewField: expect.anything() },
    });
  });

  it('throws when required state is missing', async () => {
    const { loggerService } = createMockLoggerService();
    const step = new MyNewStep(loggerService);

    const state = createState(); // No ruleDoc

    await expect(step.execute(state)).rejects.toThrow(
      'MyNewStep requires ruleDoc from previous step'
    );
  });

  it('has correct step name', () => {
    const { loggerService } = createMockLoggerService();
    const step = new MyNewStep(loggerService);

    expect(step.name).toBe('my_new_step');
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
import type { MiddlewareContext, StepMiddleware } from './types';
import type { RuleStepOutput } from '../types';
import {
  LoggerServiceToken,
  type LoggerServiceContract,
} from '../../services/logger_service/logger_service';

@injectable()
export class PerformanceMiddleware implements StepMiddleware {
  public readonly name = 'performance';

  constructor(
    @inject(LoggerServiceToken) private readonly logger: LoggerServiceContract
  ) {}

  public async execute(
    ctx: MiddlewareContext,
    next: () => Promise<RuleStepOutput>
  ): Promise<RuleStepOutput> {
    const start = performance.now();
    try {
      return await next();  // Call next middleware or step
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
  // Bind middleware classes
  bind(ErrorHandlingMiddleware).toSelf().inSingletonScope();
  bind(PerformanceMiddleware).toSelf().inSingletonScope();

  // Bind middleware array (order matters - first is outermost)
  bind(StepMiddlewareToken)
    .toDynamicValue(({ get }) => [
      get(PerformanceMiddleware),     // Outermost - measures total time
      get(ErrorHandlingMiddleware),   // Inner - catches errors
    ])
    .inSingletonScope();

  // ... rest of bindings
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
import { StepDecorator } from './step_decorator';
import type { RulePipelineState, RuleStepOutput } from '../../types';

export class AuditLoggingDecorator extends StepDecorator {
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
      get(BuildQueryStep),
      get(ExecuteQueryStep),
      get(BuildAlertsStep),
      get(StoreAlertsStep),
    ];
  })
  .inRequestScope();
```

### When to Use Decorators vs Middleware

| Scenario | Use |
|----------|-----|
| Operation applies to ALL steps | Middleware |
| Operation applies to SOME steps | Decorator |
| Need conditionals based on step name | Decorator (avoid conditionals in middleware) |
| Global error handling | Middleware |
| Audit logging for sensitive operations | Decorator |

---

## Testing

### Testing Steps

See the step testing example above. Use `createLoggerService()`, `createRulesClient()`, and other utilities from `lib/test_utils.ts`.

### Testing Middleware

```typescript
import { ErrorHandlingMiddleware } from './error_handling_middleware';
import { createLoggerService } from '../../test_utils';

describe('ErrorHandlingMiddleware', () => {
  it('calls next and returns result on success', async () => {
    const { loggerService, mockLogger } = createLoggerService();
    const middleware = new ErrorHandlingMiddleware(loggerService);

    const expectedResult = { type: 'continue' as const };
    const next = jest.fn().mockResolvedValue(expectedResult);

    const context = {
      step: { name: 'test_step', execute: jest.fn() },
      state: { input: { ruleId: 'r1', spaceId: 's1', scheduledAt: '', abortSignal: new AbortController().signal } },
    };

    const result = await middleware.execute(context, next);

    expect(result).toEqual(expectedResult);
    expect(next).toHaveBeenCalledTimes(1);
    expect(mockLogger.error).not.toHaveBeenCalled();
  });

  it('logs error and rethrows on failure', async () => {
    const { loggerService, mockLogger } = createLoggerService();
    const middleware = new ErrorHandlingMiddleware(loggerService);

    const error = new Error('Step failed');
    const next = jest.fn().mockRejectedValue(error);

    const context = {
      step: { name: 'failing_step', execute: jest.fn() },
      state: { input: { ruleId: 'r1', spaceId: 's1', scheduledAt: '', abortSignal: new AbortController().signal } },
    };

    await expect(middleware.execute(context, next)).rejects.toThrow('Step failed');
    expect(mockLogger.error).toHaveBeenCalled();
  });
});
```

### Testing Decorators

```typescript
import { AuditLoggingDecorator } from './audit_logging_decorator';

describe('AuditLoggingDecorator', () => {
  it('logs before and after step execution', async () => {
    const mockStep = {
      name: 'test_step',
      execute: jest.fn().mockResolvedValue({ type: 'continue' }),
    };
    const mockAuditService = { log: jest.fn() };

    const decorator = new AuditLoggingDecorator(mockStep, mockAuditService);
    const state = { input: { ruleId: 'r1', spaceId: 's1', scheduledAt: '', abortSignal: new AbortController().signal } };

    await decorator.execute(state);

    expect(mockAuditService.log).toHaveBeenCalledTimes(2);
    expect(mockAuditService.log).toHaveBeenNthCalledWith(1, expect.objectContaining({
      action: 'rule_execution.step.test_step.start',
    }));
    expect(mockAuditService.log).toHaveBeenNthCalledWith(2, expect.objectContaining({
      action: 'rule_execution.step.test_step.continue',
    }));
  });
});
```
