/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { taskModelVersions } from './task_model_versions';
import { InstanceTaskCost } from '../../task';
import { taskSchemaV11 } from '../schemas/task';

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

describe('taskModelVersions v11 / callerSnapshot (caller-snapshot envelope)', () => {
  // Minimum task attribute shape satisfying v11 (extends v1..v10). Each test that needs
  // a `callerSnapshot` spreads on top of this baseline.
  const baseTaskAttributes = {
    taskType: 'test',
    scheduledAt: '2026-06-12T00:00:00.000Z',
    startedAt: null,
    retryAt: null,
    runAt: '2026-06-12T00:00:00.000Z',
    params: '{}',
    state: '{}',
    traceparent: '',
    ownerId: null,
    attempts: 0,
    status: 'idle' as const,
  };

  // v11's forwardCompatibility is `taskSchemaV11.extends({}, { unknowns: 'ignore' })` — a
  // permissive *schema*, not a function like v10's. We run it through `.validate()` to
  // exercise the same path the SO migration layer uses (which strips unknown top-level
  // keys but preserves them inside the permissive `callerSnapshot` record).
  const v11ForwardCompatibilitySchema = taskModelVersions['11']!.schemas!.forwardCompatibility as {
    validate: (attributes: Record<string, unknown>) => Record<string, unknown>;
  };
  const runV11ForwardCompatibility = (attributes: Record<string, unknown>) =>
    v11ForwardCompatibilitySchema.validate(attributes);

  describe('create schema', () => {
    it('accepts a task without `callerSnapshot` (back-compat with pre-v11 tasks)', () => {
      // Tasks created before v11 never carried `callerSnapshot`. The new schema must
      // continue to accept them so existing persisted state hydrates unchanged.
      expect(() => taskSchemaV11.validate(baseTaskAttributes)).not.toThrow();
    });

    it('accepts a task with a v1 `callerSnapshot` envelope', () => {
      const attributes = {
        ...baseTaskAttributes,
        callerSnapshot: { v: 1, authorization: 'ApiKey abc', spaceId: 'marketing' },
      };

      expect(() => taskSchemaV11.validate(attributes)).not.toThrow();
    });

    it('accepts a task whose `callerSnapshot` carries additive unknown keys from a newer producer', () => {
      // Forward-compat: an older node reading a SO written by a newer node may see
      // additive identity hints inside `callerSnapshot`. The schema uses
      // `unknowns: 'allow'`, so extra keys inside the bag round-trip unchanged.
      const attributes = {
        ...baseTaskAttributes,
        callerSnapshot: {
          v: 1,
          authorization: 'ApiKey abc',
          spaceId: 'marketing',
          futureHint: { profileUid: 'abc-123' },
        },
      };

      expect(() => taskSchemaV11.validate(attributes)).not.toThrow();
    });
  });

  describe('forwardCompatibility', () => {
    it('preserves a known v1 `callerSnapshot` envelope unchanged', () => {
      const attributes = {
        ...baseTaskAttributes,
        callerSnapshot: { v: 1, authorization: 'ApiKey abc', spaceId: 'marketing' },
      };

      const result = runV11ForwardCompatibility(attributes);

      expect(result.callerSnapshot).toEqual({
        v: 1,
        authorization: 'ApiKey abc',
        spaceId: 'marketing',
      });
    });

    it('preserves additive unknown keys inside `callerSnapshot` (not stripped)', () => {
      // The bag uses `schema.object({ ... }, { unknowns: 'allow' })`, so unknown
      // keys inside the bag must survive forwardCompatibility validation rather
      // than being stripped. This is what keeps rolling upgrades safe: an older
      // node reading a SO written by a newer node must not lose identity hints.
      const attributes = {
        ...baseTaskAttributes,
        callerSnapshot: {
          v: 1,
          authorization: 'ApiKey abc',
          spaceId: 'marketing',
          futureHint: { profileUid: 'abc-123' },
        },
      };

      const result = runV11ForwardCompatibility(attributes);

      expect(result.callerSnapshot).toEqual({
        v: 1,
        authorization: 'ApiKey abc',
        spaceId: 'marketing',
        futureHint: { profileUid: 'abc-123' },
      });
    });

    it('passes through a task without `callerSnapshot` without inventing one', () => {
      const result = runV11ForwardCompatibility(baseTaskAttributes);

      expect(result.callerSnapshot).toBeUndefined();
    });

    it('round-trips a `callerSnapshot` that includes `userProfileId` through forwardCompatibility', () => {
      const attributes = {
        ...baseTaskAttributes,
        callerSnapshot: {
          v: 1,
          authorization: 'ApiKey abc',
          spaceId: 'default',
          userProfileId: 'u_abc123',
        },
      };

      const result = runV11ForwardCompatibility(attributes);

      expect(result.callerSnapshot).toEqual({
        v: 1,
        authorization: 'ApiKey abc',
        spaceId: 'default',
        userProfileId: 'u_abc123',
      });
    });

    it('preserves a `callerSnapshot` envelope with an unknown future version (forward-compat with future replayers)', () => {
      // The Task Manager schema does NOT branch on `callerSnapshot.v` — that is the
      // replayer's job at run time. So an envelope written by a future producer
      // (e.g. `v: 2`) must still pass schema validation; the replayer will then
      // return `undefined` and the runner will fall back to the legacy path.
      const attributes = {
        ...baseTaskAttributes,
        callerSnapshot: { v: 2, somethingNew: 'opaque-payload' },
      };

      const result = runV11ForwardCompatibility(attributes);

      expect(result.callerSnapshot).toEqual({ v: 2, somethingNew: 'opaque-payload' });
    });
  });
});
