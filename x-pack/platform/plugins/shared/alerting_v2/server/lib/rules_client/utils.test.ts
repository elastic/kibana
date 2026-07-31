/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CreateRuleData, UpdateRuleData } from '@kbn/alerting-v2-schemas';
import { TaskStatus } from '@kbn/task-manager-plugin/server';
import { createRuleSoAttributes } from '../test_utils';
import type { RotationCandidate } from './types';
import {
  transformCreateRuleBodyToRuleSoAttributes,
  transformRuleSoAttributesToRuleApiResponse,
  buildUpdateRuleAttributes,
  assertImmutableUnchanged,
  pickImmutable,
  bulkErrorCodeForStatus,
  toBulkError,
  groupCandidatesByInterval,
  isTaskMidRun,
  ruleDisabledError,
  ruleRunningError,
  rotationFailedError,
} from './utils';

const serverFields = {
  enabled: true,
  createdBy: 'user-1',
  createdAt: '2025-01-01T00:00:00.000Z',
  updatedBy: 'user-1',
  updatedAt: '2025-01-01T00:00:00.000Z',
};

const baseCreateData: CreateRuleData = {
  kind: 'alert',
  metadata: { name: 'test-rule' },
  time_field: '@timestamp',
  schedule: { every: '5m' },
  query: { format: 'standalone', breach: { query: 'FROM logs-* | LIMIT 1' } },
};

describe('utils', () => {
  describe('transformCreateRuleBodyToRuleSoAttributes', () => {
    it('maps description into saved object attributes', () => {
      const data: CreateRuleData = {
        ...baseCreateData,
        metadata: { name: 'rule-with-desc', description: 'My rule description' },
      };

      const result = transformCreateRuleBodyToRuleSoAttributes(data, serverFields);

      expect(result.metadata.description).toBe('My rule description');
    });

    it('sets description to undefined when not provided', () => {
      const result = transformCreateRuleBodyToRuleSoAttributes(baseCreateData, serverFields);

      expect(result.metadata.description).toBeUndefined();
    });

    it('passes metadata.builder_type through to SO attributes', () => {
      const data: CreateRuleData = {
        ...baseCreateData,
        metadata: { name: 'test-rule', builder_type: 'threshold' },
      };

      const result = transformCreateRuleBodyToRuleSoAttributes(data, serverFields);

      expect(result.metadata.builder_type).toBe('threshold');
    });

    it('sets metadata.builder_type to undefined when not provided', () => {
      const result = transformCreateRuleBodyToRuleSoAttributes(baseCreateData, serverFields);

      expect(result.metadata.builder_type).toBeUndefined();
    });
  });

  describe('buildUpdateRuleAttributes', () => {
    it('merges description into existing attributes', () => {
      const existing = createRuleSoAttributes({ metadata: { name: 'original' } });
      const updateData: UpdateRuleData = {
        metadata: { description: 'Added description' },
      };

      const result = buildUpdateRuleAttributes(existing, updateData, {
        updatedBy: 'user-2',
        updatedAt: '2025-01-02T00:00:00.000Z',
      });

      expect(result.metadata.name).toBe('original');
      expect(result.metadata.description).toBe('Added description');
    });

    it('preserves existing description when update does not include it', () => {
      const existing = createRuleSoAttributes({
        metadata: { name: 'original', description: 'Existing desc' },
      });
      const updateData: UpdateRuleData = {
        metadata: { name: 'renamed' },
      };

      const result = buildUpdateRuleAttributes(existing, updateData, {
        updatedBy: 'user-2',
        updatedAt: '2025-01-02T00:00:00.000Z',
      });

      expect(result.metadata.name).toBe('renamed');
      expect(result.metadata.description).toBe('Existing desc');
    });

    it('clears state_transition when update sends null (immediate mode)', () => {
      const existing = createRuleSoAttributes({
        state_transition: { pending_count: 3 },
      });
      const updateData: UpdateRuleData = {
        state_transition: null,
      };

      const result = buildUpdateRuleAttributes(existing, updateData, {
        updatedBy: 'user-2',
        updatedAt: '2025-01-02T00:00:00.000Z',
      });

      expect(result.state_transition).toBeNull();
    });

    it('preserves existing state_transition when update omits it', () => {
      const existing = createRuleSoAttributes({
        state_transition: { pending_count: 3 },
      });
      const updateData: UpdateRuleData = {};

      const result = buildUpdateRuleAttributes(existing, updateData, {
        updatedBy: 'user-2',
        updatedAt: '2025-01-02T00:00:00.000Z',
      });

      expect(result.state_transition).toEqual({ pending_count: 3 });
    });

    it('sets state_transition when update provides a value', () => {
      const existing = createRuleSoAttributes({});
      const updateData: UpdateRuleData = {
        state_transition: { pending_count: 5 },
      };

      const result = buildUpdateRuleAttributes(existing, updateData, {
        updatedBy: 'user-2',
        updatedAt: '2025-01-02T00:00:00.000Z',
      });

      expect(result.state_transition).toEqual({ pending_count: 5 });
    });

    it('preserves metadata.builder_type when query is not changed', () => {
      const existing = createRuleSoAttributes({
        metadata: { name: 'test-rule', builder_type: 'threshold' },
      });
      const updateData: UpdateRuleData = {
        metadata: { name: 'renamed' },
      };

      const result = buildUpdateRuleAttributes(existing, updateData, {
        updatedBy: 'user-2',
        updatedAt: '2025-01-02T00:00:00.000Z',
      });

      expect(result.metadata.builder_type).toBe('threshold');
    });

    it('auto-clears metadata.builder_type when query is changed without explicit builder_type', () => {
      const existing = createRuleSoAttributes({
        metadata: { name: 'test-rule', builder_type: 'threshold' },
      });
      const updateData: UpdateRuleData = {
        query: { format: 'standalone', breach: { query: 'FROM new-index | LIMIT 1' } },
      };

      const result = buildUpdateRuleAttributes(existing, updateData, {
        updatedBy: 'user-2',
        updatedAt: '2025-01-02T00:00:00.000Z',
      });

      expect(result.metadata.builder_type).toBeUndefined();
    });

    it('keeps metadata.builder_type when query is changed with explicit builder_type', () => {
      const existing = createRuleSoAttributes({
        metadata: { name: 'test-rule', builder_type: 'threshold' },
      });
      const updateData: UpdateRuleData = {
        query: { format: 'standalone', breach: { query: 'FROM new-index | LIMIT 1' } },
        metadata: { builder_type: 'threshold' },
      };

      const result = buildUpdateRuleAttributes(existing, updateData, {
        updatedBy: 'user-2',
        updatedAt: '2025-01-02T00:00:00.000Z',
      });

      expect(result.metadata.builder_type).toBe('threshold');
    });

    it('clears metadata.builder_type when explicitly set to null', () => {
      const existing = createRuleSoAttributes({
        metadata: { name: 'test-rule', builder_type: 'threshold' },
      });
      const updateData: UpdateRuleData = {
        metadata: { builder_type: null },
      };

      const result = buildUpdateRuleAttributes(existing, updateData, {
        updatedBy: 'user-2',
        updatedAt: '2025-01-02T00:00:00.000Z',
      });

      expect(result.metadata.builder_type).toBeUndefined();
    });

    it('does not auto-clear metadata.builder_type when same query is sent', () => {
      const existing = createRuleSoAttributes({
        metadata: { name: 'test-rule', builder_type: 'threshold' },
        query: { format: 'standalone', breach: { query: 'FROM logs-* | LIMIT 10' } },
      });
      const updateData: UpdateRuleData = {
        query: { format: 'standalone', breach: { query: 'FROM logs-* | LIMIT 10' } },
      };

      const result = buildUpdateRuleAttributes(existing, updateData, {
        updatedBy: 'user-2',
        updatedAt: '2025-01-02T00:00:00.000Z',
      });

      expect(result.metadata.builder_type).toBe('threshold');
    });
  });

  describe('transformRuleSoAttributesToRuleApiResponse', () => {
    it('includes description in the API response', () => {
      const attrs = createRuleSoAttributes({
        metadata: { name: 'rule-1', description: 'A test description' },
      });

      const result = transformRuleSoAttributesToRuleApiResponse('rule-id-1', attrs);

      expect(result.metadata.description).toBe('A test description');
    });

    it('sets description to undefined when not present in SO attributes', () => {
      const attrs = createRuleSoAttributes({ metadata: { name: 'rule-1' } });

      const result = transformRuleSoAttributesToRuleApiResponse('rule-id-1', attrs);

      expect(result.metadata.description).toBeUndefined();
    });

    it('round-trips description through create → transform', () => {
      const createData: CreateRuleData = {
        ...baseCreateData,
        metadata: { name: 'round-trip-rule', description: 'Round-trip desc' },
      };

      const soAttrs = transformCreateRuleBodyToRuleSoAttributes(createData, serverFields);
      const response = transformRuleSoAttributesToRuleApiResponse('rule-rt-1', soAttrs);

      expect(response.metadata.description).toBe('Round-trip desc');
    });

    it('includes metadata.builder_type in API response', () => {
      const attrs = createRuleSoAttributes({
        metadata: { name: 'test-rule', builder_type: 'threshold' },
      });

      const result = transformRuleSoAttributesToRuleApiResponse('rule-id-1', attrs);

      expect(result.metadata.builder_type).toBe('threshold');
    });

    it('sets metadata.builder_type to undefined when absent from SO attributes', () => {
      const attrs = createRuleSoAttributes({});

      const result = transformRuleSoAttributesToRuleApiResponse('rule-id-1', attrs);

      expect(result.metadata.builder_type).toBeUndefined();
    });

    it('includes the version when provided', () => {
      const attrs = createRuleSoAttributes({ metadata: { name: 'rule-1' } });

      const result = transformRuleSoAttributesToRuleApiResponse('rule-id-1', attrs, 'WzNEW=');
      expect(result.version).toBe('WzNEW=');
    });

    it('omits the version when not provided', () => {
      const attrs = createRuleSoAttributes({ metadata: { name: 'rule-1' } });

      const result = transformRuleSoAttributesToRuleApiResponse('rule-id-1', attrs);
      expect(result.version).toBeUndefined();
    });
  });

  describe('assertImmutableUnchanged', () => {
    it('does not throw when all immutable fields match the existing rule', () => {
      const existing = createRuleSoAttributes({ kind: 'alert' });

      expect(() =>
        assertImmutableUnchanged({ ...baseCreateData, kind: 'alert' }, existing)
      ).not.toThrow();
    });

    it('throws Boom.conflict (409) when an immutable field differs', () => {
      const existing = createRuleSoAttributes({ kind: 'alert' });

      expect(() =>
        assertImmutableUnchanged({ ...baseCreateData, kind: 'signal' }, existing)
      ).toThrow(
        expect.objectContaining({
          isBoom: true,
          output: expect.objectContaining({ statusCode: 409 }),
          message: 'Some fields cannot be changed after creation: kind.',
        })
      );
    });

    it('attaches IMMUTABLE_FIELDS_CHANGED code and the changed fields in details', () => {
      const existing = createRuleSoAttributes({ kind: 'alert' });

      expect(() =>
        assertImmutableUnchanged({ ...baseCreateData, kind: 'signal' }, existing)
      ).toThrow(
        expect.objectContaining({
          data: {
            code: 'IMMUTABLE_FIELDS_CHANGED',
            details: { fields: ['kind'] },
          },
        })
      );
    });
  });

  describe('pickImmutable', () => {
    it('returns only the fields declared in IMMUTABLE_RULE_FIELDS', () => {
      const existing = createRuleSoAttributes({ kind: 'signal' });

      expect(pickImmutable(existing)).toEqual({ kind: 'signal' });
    });

    it('preserves immutable fields when spread last over a mutated copy', () => {
      const existing = createRuleSoAttributes({ kind: 'alert' });
      // Simulate an earlier step in a builder that incorrectly mutates an
      // immutable field. `pickImmutable(existing)` spread last must restore it.
      const buggyIntermediate = { ...existing, kind: 'signal' as const };

      const next = { ...buggyIntermediate, ...pickImmutable(existing) };

      expect(next.kind).toBe('alert');
    });
  });
});

describe('bulkErrorCodeForStatus', () => {
  it('maps 404 to RULE_NOT_FOUND', () => {
    expect(bulkErrorCodeForStatus(404)).toBe('RULE_NOT_FOUND');
  });

  it('maps 409 to RULE_VERSION_CONFLICT', () => {
    expect(bulkErrorCodeForStatus(409)).toBe('RULE_VERSION_CONFLICT');
  });

  it('maps any other status to INTERNAL_SERVER_ERROR', () => {
    expect(bulkErrorCodeForStatus(500)).toBe('INTERNAL_SERVER_ERROR');
    expect(bulkErrorCodeForStatus(400)).toBe('INTERNAL_SERVER_ERROR');
  });
});

describe('toBulkError', () => {
  it('builds a per-rule error from a saved-object error', () => {
    expect(toBulkError('rule-1', { statusCode: 404, message: 'Not found' })).toEqual({
      id: 'rule-1',
      error: { code: 'RULE_NOT_FOUND', message: 'Not found' },
    });
  });
});

describe('groupCandidatesByInterval', () => {
  const candidate = (id: string, every: string): RotationCandidate => ({
    id,
    taskId: `task:${id}`,
    attrs: createRuleSoAttributes({ schedule: { every, lookback: '1m' } }),
    version: 'v1',
  });

  it('groups candidates by their schedule interval, preserving order', () => {
    const grouped = groupCandidatesByInterval([
      candidate('a', '1m'),
      candidate('b', '5m'),
      candidate('c', '1m'),
    ]);

    expect([...grouped.keys()].sort()).toEqual(['1m', '5m']);
    expect(grouped.get('1m')?.map((c) => c.id)).toEqual(['a', 'c']);
    expect(grouped.get('5m')?.map((c) => c.id)).toEqual(['b']);
  });

  it('returns an empty map when there are no candidates', () => {
    expect(groupCandidatesByInterval([]).size).toBe(0);
  });
});

describe('rotation error builders', () => {
  it('ruleDisabledError uses RULE_DISABLED and names the rule', () => {
    expect(ruleDisabledError('rule-1')).toEqual({
      id: 'rule-1',
      error: { code: 'RULE_DISABLED', message: expect.stringContaining('rule-1') },
    });
  });

  it('ruleRunningError uses RULE_ALREADY_RUNNING', () => {
    expect(ruleRunningError('rule-1')).toEqual({
      id: 'rule-1',
      error: { code: 'RULE_ALREADY_RUNNING', message: expect.stringContaining('running') },
    });
  });

  it('rotationFailedError maps the per-task status code', () => {
    expect(rotationFailedError('rule-1', 409).error.code).toBe('RULE_VERSION_CONFLICT');
  });

  it('rotationFailedError defaults to INTERNAL_SERVER_ERROR without a status', () => {
    expect(rotationFailedError('rule-1').error.code).toBe('INTERNAL_SERVER_ERROR');
  });

  it('carries the rule name in error.details when provided', () => {
    expect(ruleDisabledError('rule-1', 'My rule').error.details).toEqual({ name: 'My rule' });
    expect(ruleRunningError('rule-1', 'My rule').error.details).toEqual({ name: 'My rule' });
    expect(rotationFailedError('rule-1', 409, 'My rule').error.details).toEqual({ name: 'My rule' });
    expect(toBulkError('rule-1', { statusCode: 409, message: 'x' }, 'My rule').error.details).toEqual(
      { name: 'My rule' }
    );
  });

  it('omits error.details when no name is provided (e.g. a not-found rule)', () => {
    expect(ruleDisabledError('rule-1').error.details).toBeUndefined();
    expect(ruleRunningError('rule-1').error.details).toBeUndefined();
    expect(rotationFailedError('rule-1').error.details).toBeUndefined();
    expect(toBulkError('rule-1', { statusCode: 404, message: 'x' }).error.details).toBeUndefined();
  });
});

describe('isTaskMidRun', () => {
  it('is true only for running and claiming tasks', () => {
    expect(isTaskMidRun(TaskStatus.Running)).toBe(true);
    expect(isTaskMidRun(TaskStatus.Claiming)).toBe(true);
  });

  it('is false for non-mid-run states and an unknown/absent status', () => {
    expect(isTaskMidRun(TaskStatus.Failed)).toBe(false);
    expect(isTaskMidRun(TaskStatus.Unrecognized)).toBe(false);
    expect(isTaskMidRun(TaskStatus.DeadLetter)).toBe(false);
    expect(isTaskMidRun(TaskStatus.Idle)).toBe(false);
    expect(isTaskMidRun(undefined)).toBe(false);
  });
});
