/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CreateRuleData, UpdateRuleData } from '@kbn/alerting-v2-schemas';
import { createRuleSoAttributes } from '../test_utils';
import {
  transformCreateRuleBodyToRuleSoAttributes,
  transformRuleSoAttributesToRuleApiResponse,
  buildUpdateRuleAttributes,
  assertImmutableUnchanged,
  pickImmutable,
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
  evaluation: { query: { base: 'FROM logs-* | LIMIT 1' } },
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

    it('passes builder_type through to SO attributes', () => {
      const data: CreateRuleData = {
        ...baseCreateData,
        builder_type: 'threshold',
      };

      const result = transformCreateRuleBodyToRuleSoAttributes(data, serverFields);

      expect(result.builder_type).toBe('threshold');
    });

    it('sets builder_type to undefined when not provided', () => {
      const result = transformCreateRuleBodyToRuleSoAttributes(baseCreateData, serverFields);

      expect(result.builder_type).toBeUndefined();
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

    it('preserves builder_type when query is not changed', () => {
      const existing = createRuleSoAttributes({ builder_type: 'threshold' });
      const updateData: UpdateRuleData = {
        metadata: { name: 'renamed' },
      };

      const result = buildUpdateRuleAttributes(existing, updateData, {
        updatedBy: 'user-2',
        updatedAt: '2025-01-02T00:00:00.000Z',
      });

      expect(result.builder_type).toBe('threshold');
    });

    it('auto-clears builder_type when query is changed without explicit builder_type', () => {
      const existing = createRuleSoAttributes({ builder_type: 'threshold' });
      const updateData: UpdateRuleData = {
        evaluation: { query: { base: 'FROM new-index | LIMIT 1' } },
      };

      const result = buildUpdateRuleAttributes(existing, updateData, {
        updatedBy: 'user-2',
        updatedAt: '2025-01-02T00:00:00.000Z',
      });

      expect(result.builder_type).toBeUndefined();
    });

    it('keeps builder_type when query is changed with explicit builder_type', () => {
      const existing = createRuleSoAttributes({ builder_type: 'threshold' });
      const updateData: UpdateRuleData = {
        evaluation: { query: { base: 'FROM new-index | LIMIT 1' } },
        builder_type: 'threshold',
      };

      const result = buildUpdateRuleAttributes(existing, updateData, {
        updatedBy: 'user-2',
        updatedAt: '2025-01-02T00:00:00.000Z',
      });

      expect(result.builder_type).toBe('threshold');
    });

    it('clears builder_type when explicitly set to null', () => {
      const existing = createRuleSoAttributes({ builder_type: 'threshold' });
      const updateData: UpdateRuleData = {
        builder_type: null,
      };

      const result = buildUpdateRuleAttributes(existing, updateData, {
        updatedBy: 'user-2',
        updatedAt: '2025-01-02T00:00:00.000Z',
      });

      expect(result.builder_type).toBeUndefined();
    });

    it('does not auto-clear builder_type when same query is sent', () => {
      const existing = createRuleSoAttributes({
        builder_type: 'threshold',
        evaluation: { query: { base: 'FROM logs-* | LIMIT 10' } },
      });
      const updateData: UpdateRuleData = {
        evaluation: { query: { base: 'FROM logs-* | LIMIT 10' } },
      };

      const result = buildUpdateRuleAttributes(existing, updateData, {
        updatedBy: 'user-2',
        updatedAt: '2025-01-02T00:00:00.000Z',
      });

      expect(result.builder_type).toBe('threshold');
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

    it('includes builder_type in API response', () => {
      const attrs = createRuleSoAttributes({ builder_type: 'threshold' });

      const result = transformRuleSoAttributesToRuleApiResponse('rule-id-1', attrs);

      expect(result.builder_type).toBe('threshold');
    });

    it('sets builder_type to undefined when absent from SO attributes', () => {
      const attrs = createRuleSoAttributes({});

      const result = transformRuleSoAttributesToRuleApiResponse('rule-id-1', attrs);

      expect(result.builder_type).toBeUndefined();
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
