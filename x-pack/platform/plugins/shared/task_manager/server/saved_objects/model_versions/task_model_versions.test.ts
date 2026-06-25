/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { taskModelVersions } from './task_model_versions';
import { InstanceTaskCost } from '../../task';

type Attributes = Record<string, unknown>;
type ForwardCompatibilityFn = (attributes: Attributes) => Attributes;

const forwardCompatibilityV10 = taskModelVersions['10']!.schemas!
  .forwardCompatibility as ForwardCompatibilityFn;

describe('taskModelVersions v10 forwardCompatibility', () => {
  it('keeps cost unchanged when cost is undefined', () => {
    const attributes = { taskType: 'test', state: {} };
    const result = forwardCompatibilityV10(attributes);
    expect(result.cost).toBeUndefined();
  });

  it('keeps cost unchanged when cost is "tiny"', () => {
    const attributes = { taskType: 'test', cost: InstanceTaskCost.Tiny };
    const result = forwardCompatibilityV10(attributes);
    expect(result.cost).toBe(InstanceTaskCost.Tiny);
  });

  it('keeps cost unchanged when cost is "normal"', () => {
    const attributes = { taskType: 'test', cost: InstanceTaskCost.Normal };
    const result = forwardCompatibilityV10(attributes);
    expect(result.cost).toBe(InstanceTaskCost.Normal);
  });

  it('resets cost to "normal" when cost is an unknown string', () => {
    const attributes = { taskType: 'test', cost: 'unknown_cost' };
    const result = forwardCompatibilityV10(attributes);
    expect(result.cost).toBe(InstanceTaskCost.Normal);
  });

  it('returns the same object reference when cost is valid', () => {
    const attributes = { taskType: 'test', cost: InstanceTaskCost.Tiny };
    const result = forwardCompatibilityV10(attributes);
    expect(result).toBe(attributes);
  });

  it('does not mutate the input attributes when cost is unknown', () => {
    const attributes = { taskType: 'test', cost: 'unknown_cost' };
    const originalAttributes = { ...attributes };
    const result = forwardCompatibilityV10(attributes);
    expect(result).not.toBe(attributes);
    expect(result.cost).toBe(InstanceTaskCost.Normal);
    expect(attributes).toEqual(originalAttributes);
  });
});
