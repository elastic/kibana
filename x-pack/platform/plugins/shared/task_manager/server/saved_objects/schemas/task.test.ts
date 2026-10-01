/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { validateDuration } from './task';
import { taskModelVersions } from '../model_versions/task_model_versions';
import type {
  SavedObjectsFullModelVersion,
  SavedObjectsModelVersion,
} from '@kbn/core-saved-objects-server';

test('allows valid duration', () => {
  expect(validateDuration('1s')).toBeUndefined();
  expect(validateDuration('45346s')).toBeUndefined();
  expect(validateDuration('10m')).toBeUndefined();
  expect(validateDuration('30000000h')).toBeUndefined();
  expect(validateDuration('3245d')).toBeUndefined();
});

test('returns error message for invalid duration', () => {
  expect(validateDuration('10x')).toBe('string is not a valid duration: 10x');
  expect(validateDuration('PT1M')).toBe('string is not a valid duration: PT1M');
  expect(validateDuration('foo')).toBe('string is not a valid duration: foo');
  expect(validateDuration('1 minute')).toBe('string is not a valid duration: 1 minute');
  expect(validateDuration('1hr')).toBe('string is not a valid duration: 1hr');
});

test('allows any cost value up to 100 characters', () => {
  const taskSchema = getLatestModelVersion()?.schemas?.create;
  expect(taskSchema).toBeDefined();

  const costs = [undefined, 'tiny', 'normal', 'large', 'extralarge', 'waaaaytoobig'];
  costs.forEach((cost) => {
    const task = getTask({ cost });
    expect(taskSchema?.validate(task)).toEqual(task);
  });
});

test('throws error message for cost > 100 characters', () => {
  const taskSchema = getLatestModelVersion()?.schemas?.create;
  expect(taskSchema).toBeDefined();

  const longCost = 'a'.repeat(101);
  const task = getTask({ cost: longCost });
  expect(() => taskSchema?.validate(task)).toThrow('cost');
});

describe('service account fields', () => {
  const runAs = {
    workloadType: 'workflow',
    workloadId: 'workflow-1',
    spaceId: 'default',
    expectedServiceAccountId: 'sa-1',
  };

  test('allows a task without service account fields', () => {
    const taskSchema = getLatestModelVersion()?.schemas?.create;
    const task = getTask();
    expect(taskSchema?.validate(task)).toEqual(task);
  });

  test('allows credentialType, runAs and runAsIntegrityCheck', () => {
    const taskSchema = getLatestModelVersion()?.schemas?.create;
    const task = getTask({
      credentialType: 'service_account',
      runAs,
      runAsIntegrityCheck: 'encrypted-value',
    });
    expect(taskSchema?.validate(task)).toEqual(task);
  });

  test('allows a null expectedServiceAccountId', () => {
    const taskSchema = getLatestModelVersion()?.schemas?.create;
    const task = getTask({
      credentialType: 'service_account',
      runAs: { ...runAs, expectedServiceAccountId: null },
    });
    expect(taskSchema?.validate(task)).toEqual(task);
  });

  test('throws when runAs is null', () => {
    const taskSchema = getLatestModelVersion()?.schemas?.create;
    const task = getTask({ credentialType: 'service_account', runAs: null });
    expect(() => taskSchema?.validate(task)).toThrow('runAs');
  });

  test('throws when a runAs field is missing', () => {
    const taskSchema = getLatestModelVersion()?.schemas?.create;
    const { workloadId, ...rest } = runAs;
    const task = getTask({ credentialType: 'service_account', runAs: rest });
    expect(() => taskSchema?.validate(task)).toThrow('workloadId');
  });

  test('throws when credentialType is longer than 100 characters', () => {
    const taskSchema = getLatestModelVersion()?.schemas?.create;
    const task = getTask({ credentialType: 'a'.repeat(101) });
    expect(() => taskSchema?.validate(task)).toThrow('credentialType');
  });

  test('throws when a runAs field is longer than 1024 characters', () => {
    const taskSchema = getLatestModelVersion()?.schemas?.create;
    const task = getTask({
      credentialType: 'service_account',
      runAs: { ...runAs, workloadId: 'a'.repeat(1025) },
    });
    expect(() => taskSchema?.validate(task)).toThrow('workloadId');
  });
});

function getTask(overrides = {}) {
  return {
    taskType: 'task-type',
    scheduledAt: new Date().toISOString(),
    runAt: new Date().toISOString(),
    params: '{}',
    state: '{}',
    traceparent: 'trace-parent',
    attempts: 1,
    status: 'idle',
    schedule: { interval: '1d' },
    startedAt: null,
    ownerId: null,
    retryAt: null,
    ...overrides,
  };
}

function getLatestModelVersion():
  | SavedObjectsFullModelVersion
  | SavedObjectsModelVersion
  | undefined {
  const keys = Object.keys(taskModelVersions) as Array<keyof typeof taskModelVersions>;

  const latestKey = keys.reduce((maxKey, currentKey) => {
    return Number(currentKey) > Number(maxKey) ? currentKey : maxKey;
  });

  return taskModelVersions[latestKey];
}
