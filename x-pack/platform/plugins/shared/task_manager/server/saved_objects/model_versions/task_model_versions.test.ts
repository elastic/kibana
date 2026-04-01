/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { taskModelVersions } from './task_model_versions';
import { InstanceTaskCost } from '../../task';

type ForwardCompatibilityFn = (attributes: unknown) => unknown;

const forwardCompatibilityV9 = taskModelVersions['9']!.schemas!
  .forwardCompatibility as ForwardCompatibilityFn;

describe('taskModelVersions v9 forwardCompatibility', () => {
  it('keeps cost unchanged when cost is undefined', () => {
    const attributes = { taskType: 'test', state: {} };
    const result = forwardCompatibilityV9(attributes) as typeof attributes & { cost?: string };
    expect(result.cost).toBeUndefined();
  });

  it('keeps cost unchanged when cost is "tiny"', () => {
    const attributes = { taskType: 'test', cost: InstanceTaskCost.Tiny };
    const result = forwardCompatibilityV9(attributes) as typeof attributes;
    expect(result.cost).toBe(InstanceTaskCost.Tiny);
  });

  it('keeps cost unchanged when cost is "normal"', () => {
    const attributes = { taskType: 'test', cost: InstanceTaskCost.Normal };
    const result = forwardCompatibilityV9(attributes) as typeof attributes;
    expect(result.cost).toBe(InstanceTaskCost.Normal);
  });

  it('resets cost to "normal" when cost is an unknown string', () => {
    const attributes = { taskType: 'test', cost: 'unknown_cost' };
    const result = forwardCompatibilityV9(attributes) as typeof attributes;
    expect(result.cost).toBe(InstanceTaskCost.Normal);
  });

  it('returns the same object reference when cost is valid', () => {
    const attributes = { taskType: 'test', cost: InstanceTaskCost.Tiny };
    const result = forwardCompatibilityV9(attributes);
    expect(result).toBe(attributes);
  });

  it('does not mutate the input attributes when cost is unknown', () => {
    const attributes = { taskType: 'test', cost: 'unknown_cost' };
    const originalAttributes = { ...attributes };
    const result = forwardCompatibilityV9(attributes) as unknown as Record<string, unknown>;
    expect(result).not.toBe(attributes);
    expect(result.cost).toBe(InstanceTaskCost.Normal);
    expect(attributes).toEqual(originalAttributes);
  });
});
