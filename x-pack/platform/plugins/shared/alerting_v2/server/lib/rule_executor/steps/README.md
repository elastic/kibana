# Rule Execution Pipeline Steps

This directory contains the execution steps for the rule executor pipeline. Each step is a self-contained unit of work that follows the **Pipeline Pattern** with immutable state.

## Architecture Overview

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
          ┌───────────────────────────┼───────────────────────────┐
          ▼                           ▼                           ▼
   ┌─────────────┐             ┌─────────────┐             ┌─────────────┐
   │   Step 1    │  ────────►  │   Step 2    │  ────────►  │   Step N    │
   └─────────────┘             └─────────────┘             └─────────────┘
          │                           │                           │
          └───────────────────────────┼───────────────────────────┘
                                      ▼
                          ┌─────────────────────┐
                          │  RulePipelineState  │
                          │   (immutable)       │
                          └─────────────────────┘
```

## Key Design Principles

1. **Immutable State**: Steps receive `Readonly<RulePipelineState>` and return new data via `RuleStepOutput`. Never mutate state directly.

2. **Domain-Driven**: Steps work with domain concepts only. No task manager types (`taskInstance`, `RunResult`) are exposed to steps.

3. **Single Responsibility**: Each step handles one logical unit of work.

4. **Dependency Injection**: Steps use Inversify for dependency injection. Dependencies are injected via constructor.

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
