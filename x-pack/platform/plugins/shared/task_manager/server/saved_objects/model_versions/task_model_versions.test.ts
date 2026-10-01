/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ObjectType } from '@kbn/config-schema';
import { taskModelVersions } from './task_model_versions';
import { InstanceTaskCost } from '../../task';

type Attributes = Record<string, unknown>;
type ForwardCompatibilityFn = (attributes: Attributes) => Attributes;

const forwardCompatibilityV10 = taskModelVersions['10']!.schemas!
  .forwardCompatibility as ForwardCompatibilityFn;
const forwardCompatibilityV13 = taskModelVersions['13']!.schemas!
  .forwardCompatibility as ObjectType;
const forwardCompatibilityV14 = taskModelVersions['14']!.schemas!
  .forwardCompatibility as ObjectType;

const getTaskAttributes = (overrides: Attributes = {}): Attributes => ({
  taskType: 'task-type',
  scheduledAt: '2026-09-29T00:00:00.000Z',
  runAt: '2026-09-29T00:00:00.000Z',
  params: '{}',
  state: '{}',
  traceparent: '',
  attempts: 0,
  status: 'idle',
  startedAt: null,
  ownerId: null,
  retryAt: null,
  ...overrides,
});

const credential = {
  type: 'service_account',
  workloadType: 'workflow',
  workloadId: 'workflow-1',
  spaceId: 'default',
  expectedServiceAccountId: null,
};

const credentialFields = {
  credential,
  encryptedCredential: 'encrypted-value',
};

describe('taskModelVersions v13 forwardCompatibility', () => {
  it('drops the fields added in v14', () => {
    const result = forwardCompatibilityV13.validate(getTaskAttributes(credentialFields));
    expect(result).not.toHaveProperty('credential');
    expect(result).not.toHaveProperty('encryptedCredential');
  });
});

describe('taskModelVersions v14 forwardCompatibility', () => {
  it('keeps the fields added in v14', () => {
    const attributes = getTaskAttributes(credentialFields);
    expect(forwardCompatibilityV14.validate(attributes)).toEqual(attributes);
  });

  it('accepts a credential type added in a later version, with its own fields', () => {
    const attributes = getTaskAttributes({
      ...credentialFields,
      credential: { type: 'future_credential_type', futureKeyId: 'key-1' },
    });
    expect(forwardCompatibilityV14.validate(attributes)).toEqual(attributes);
  });

  it('keeps credential fields added in a later version', () => {
    const attributes = getTaskAttributes({
      ...credentialFields,
      credential: { ...credential, futureField: 'value' },
    });
    expect(forwardCompatibilityV14.validate(attributes)).toEqual(attributes);
  });

  it('drops top-level fields added in a later version', () => {
    const result = forwardCompatibilityV14.validate(getTaskAttributes({ futureField: 'value' }));
    expect(result).not.toHaveProperty('futureField');
  });
});

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
