/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UseFormReturn } from 'react-hook-form';
import type { FormValues } from '../../form/types';
import { createInitialState } from './use_compose_discover_state';
import type { StepDefinition } from './types';
import { validateStep, evaluateStepValidation } from './validate_step';

const createStep = (overrides: Partial<StepDefinition> = {}): StepDefinition => ({
  id: 'details',
  title: 'Details',
  render: () => null,
  ...overrides,
});

describe('validateStep', () => {
  it('returns false when meetsPrecondition fails', async () => {
    const step = createStep({
      meetsPrecondition: () => false,
      fields: ['metadata.name'],
    });
    const methods = {
      trigger: jest.fn(),
    } as unknown as UseFormReturn<FormValues>;

    await expect(validateStep(step, methods, createInitialState({ mode: 'create' }))).resolves.toBe(
      false
    );
    expect(methods.trigger).not.toHaveBeenCalled();
  });

  it('delegates to validate when present', async () => {
    const step = createStep({
      validate: jest.fn().mockReturnValue(true),
    });
    const methods = {} as UseFormReturn<FormValues>;

    await expect(validateStep(step, methods, createInitialState({ mode: 'create' }))).resolves.toBe(
      true
    );
    expect(step.validate).toHaveBeenCalled();
  });

  it('runs meetsPrecondition before validate', async () => {
    const step = createStep({
      meetsPrecondition: () => false,
      validate: jest.fn().mockReturnValue(true),
    });
    const methods = {} as UseFormReturn<FormValues>;

    await expect(validateStep(step, methods, createInitialState({ mode: 'create' }))).resolves.toBe(
      false
    );
    expect(step.validate).not.toHaveBeenCalled();
  });

  it('triggers declared fields when no validate is defined', async () => {
    const step = createStep({
      fields: ['metadata.name'],
    });
    const methods = {
      trigger: jest.fn().mockResolvedValue(true),
    } as unknown as UseFormReturn<FormValues>;

    await expect(validateStep(step, methods, createInitialState({ mode: 'create' }))).resolves.toBe(
      true
    );
    expect(methods.trigger).toHaveBeenCalledWith(['metadata.name']);
  });

  it('returns true when a step has no validation configured', async () => {
    const step = createStep();
    const methods = {} as UseFormReturn<FormValues>;

    await expect(validateStep(step, methods, createInitialState({ mode: 'create' }))).resolves.toBe(
      true
    );
  });

  it('evaluateStepValidation mirrors validateStep for synchronous results', async () => {
    const step = createStep({
      meetsPrecondition: () => true,
      validate: () => true,
    });
    const methods = {} as UseFormReturn<FormValues>;
    const state = createInitialState({ mode: 'create' });

    expect(evaluateStepValidation(step, methods, state)).toBe(true);
    await expect(validateStep(step, methods, state)).resolves.toBe(true);
  });
});
