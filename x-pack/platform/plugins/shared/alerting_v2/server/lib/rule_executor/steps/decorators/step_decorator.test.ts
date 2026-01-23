/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { StepDecorator } from './step_decorator';
import type { RuleExecutionStep, RulePipelineState, RuleStepOutput } from '../../types';
import { createRuleExecutionInput } from '../../../test_utils';

// Concrete implementation for testing
class TestDecorator extends StepDecorator {
  public executeCalled = false;

  public async execute(state: Readonly<RulePipelineState>): Promise<RuleStepOutput> {
    this.executeCalled = true;
    return this.step.execute(state);
  }
}

describe('StepDecorator', () => {
  const createMockStep = (name: string = 'mock_step'): jest.Mocked<RuleExecutionStep> => ({
    name,
    execute: jest.fn(),
  });

  const createState = (): RulePipelineState => ({
    input: createRuleExecutionInput(),
  });

  it('returns the name of the wrapped step', () => {
    const mockStep = createMockStep('my_custom_step');
    const decorator = new TestDecorator(mockStep);

    expect(decorator.name).toBe('my_custom_step');
  });

  it('provides access to the wrapped step', async () => {
    const mockStep = createMockStep();
    const expectedResult: RuleStepOutput = { type: 'continue' };
    mockStep.execute.mockResolvedValue(expectedResult);

    const decorator = new TestDecorator(mockStep);
    const state = createState();

    const result = await decorator.execute(state);

    expect(decorator.executeCalled).toBe(true);
    expect(mockStep.execute).toHaveBeenCalledWith(state);
    expect(result).toEqual(expectedResult);
  });

  it('can wrap any step implementation', async () => {
    const mockStep = createMockStep('validate_rule');
    const haltResult: RuleStepOutput = { type: 'halt', reason: 'rule_disabled' };
    mockStep.execute.mockResolvedValue(haltResult);

    const decorator = new TestDecorator(mockStep);
    const state = createState();

    const result = await decorator.execute(state);

    expect(result).toEqual(haltResult);
    expect(decorator.name).toBe('validate_rule');
  });

  it('propagates errors from wrapped step', async () => {
    const mockStep = createMockStep();
    const error = new Error('Step execution failed');
    mockStep.execute.mockRejectedValue(error);

    const decorator = new TestDecorator(mockStep);
    const state = createState();

    await expect(decorator.execute(state)).rejects.toThrow('Step execution failed');
  });
});
