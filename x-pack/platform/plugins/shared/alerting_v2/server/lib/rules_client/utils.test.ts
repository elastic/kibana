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
  validateMergedRuleAttributes,
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

    it('clears tags when update sends null', () => {
      const existing = createRuleSoAttributes({
        metadata: { name: 'original', tags: ['prod', 'infra'] },
      });
      const updateData: UpdateRuleData = {
        metadata: { tags: null },
      };

      const result = buildUpdateRuleAttributes(existing, updateData, {
        updatedBy: 'user-2',
        updatedAt: '2025-01-02T00:00:00.000Z',
        version: 2,
      });

      expect(result.metadata.tags).toBeUndefined();
    });

    it('preserves existing tags when update omits them', () => {
      const existing = createRuleSoAttributes({
        metadata: { name: 'original', tags: ['prod', 'infra'] },
      });
      const updateData: UpdateRuleData = {
        metadata: { name: 'renamed' },
      };

      const result = buildUpdateRuleAttributes(existing, updateData, {
        updatedBy: 'user-2',
        updatedAt: '2025-01-02T00:00:00.000Z',
        version: 2,
      });

      expect(result.metadata.tags).toEqual(['prod', 'infra']);
    });

    it('sets tags when update provides a value', () => {
      const existing = createRuleSoAttributes({
        metadata: { name: 'original', tags: ['old'] },
      });
      const updateData: UpdateRuleData = {
        metadata: { tags: ['prod', 'infra'] },
      };

      const result = buildUpdateRuleAttributes(existing, updateData, {
        updatedBy: 'user-2',
        updatedAt: '2025-01-02T00:00:00.000Z',
        version: 2,
      });

      expect(result.metadata.tags).toEqual(['prod', 'infra']);
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

  describe('validateMergedRuleAttributes', () => {
    it('does not throw for a valid alert rule', () => {
      const attrs = createRuleSoAttributes({ kind: 'alert' });

      expect(() => validateMergedRuleAttributes('rule-1', attrs)).not.toThrow();
    });

    it('does not throw for a valid signal rule (standalone, breach-only)', () => {
      const attrs = createRuleSoAttributes({
        kind: 'signal',
        recovery_strategy: undefined,
        query: { format: 'standalone', breach: { query: 'FROM logs-* | LIMIT 1' } },
      });

      expect(() => validateMergedRuleAttributes('rule-1', attrs)).not.toThrow();
    });

    it('throws INVALID_SIGNAL_RULE (400) when a signal rule uses a composed query', () => {
      const attrs = createRuleSoAttributes({
        kind: 'signal',
        recovery_strategy: undefined,
        query: {
          format: 'composed',
          base: 'FROM logs-*',
          breach: { segment: 'WHERE error' },
        },
      });

      expect(() => validateMergedRuleAttributes('rule-1', attrs)).toThrow(
        expect.objectContaining({
          isBoom: true,
          output: expect.objectContaining({ statusCode: 400 }),
          message: 'kind "signal" requires query.format "standalone".',
          data: {
            code: 'INVALID_SIGNAL_RULE',
            details: { rule_id: 'rule-1', rule_kind: 'signal' },
          },
        })
      );
    });

    it('throws INVALID_SIGNAL_RULE when a signal rule sets a recovery_strategy', () => {
      const attrs = createRuleSoAttributes({
        kind: 'signal',
        recovery_strategy: 'no_breach',
        query: { format: 'standalone', breach: { query: 'FROM logs-* | LIMIT 1' } },
      });

      expect(() => validateMergedRuleAttributes('rule-1', attrs)).toThrow(
        expect.objectContaining({
          message: 'Signal rules cannot set recovery_strategy or no_data_strategy.',
          data: {
            code: 'INVALID_SIGNAL_RULE',
            details: { rule_id: 'rule-1', rule_kind: 'signal' },
          },
        })
      );
    });

    it('throws INVALID_SIGNAL_RULE when a signal rule sets a no_data_strategy', () => {
      const attrs = createRuleSoAttributes({
        kind: 'signal',
        recovery_strategy: undefined,
        no_data_strategy: 'last_known_status',
        query: {
          format: 'standalone',
          breach: { query: 'FROM logs-* | LIMIT 1' },
          no_data: { query: 'FROM logs-* | STATS c = COUNT(*) | WHERE c == 0' },
        },
      });

      expect(() => validateMergedRuleAttributes('rule-1', attrs)).toThrow(
        expect.objectContaining({
          data: {
            code: 'INVALID_SIGNAL_RULE',
            details: { rule_id: 'rule-1', rule_kind: 'signal' },
          },
        })
      );
    });

    it('throws INVALID_RULE_QUERY_CONFIG (400) when a query.recovery block has no "query" strategy', () => {
      const attrs = createRuleSoAttributes({
        kind: 'alert',
        recovery_strategy: 'no_breach',
        query: {
          format: 'standalone',
          breach: { query: 'FROM logs-* | LIMIT 1' },
          recovery: { query: 'FROM logs-* | LIMIT 2' },
        },
      });

      expect(() => validateMergedRuleAttributes('rule-1', attrs)).toThrow(
        expect.objectContaining({
          isBoom: true,
          output: expect.objectContaining({ statusCode: 400 }),
          message: 'query.recovery is only allowed when recovery_strategy is "query".',
          data: { code: 'INVALID_RULE_QUERY_CONFIG', details: { rule_id: 'rule-1' } },
        })
      );
    });

    it('throws INVALID_RULE_QUERY_CONFIG when a composed query.recovery segment has no "query" strategy', () => {
      const attrs = createRuleSoAttributes({
        kind: 'alert',
        recovery_strategy: 'no_breach',
        query: {
          format: 'composed',
          base: 'FROM logs-*',
          breach: { segment: 'WHERE error' },
          recovery: { segment: 'WHERE NOT error' },
        },
      });

      expect(() => validateMergedRuleAttributes('rule-1', attrs)).toThrow(
        expect.objectContaining({
          isBoom: true,
          output: expect.objectContaining({ statusCode: 400 }),
          message: 'query.recovery is only allowed when recovery_strategy is "query".',
          data: { code: 'INVALID_RULE_QUERY_CONFIG', details: { rule_id: 'rule-1' } },
        })
      );
    });

    it('throws INVALID_RULE_QUERY_CONFIG when recovery_strategy "query" has no recovery block', () => {
      const attrs = createRuleSoAttributes({
        kind: 'alert',
        recovery_strategy: 'query',
        query: { format: 'standalone', breach: { query: 'FROM logs-* | LIMIT 1' } },
      });

      expect(() => validateMergedRuleAttributes('rule-1', attrs)).toThrow(
        expect.objectContaining({
          message: 'query.recovery is required when recovery_strategy is "query".',
          data: { code: 'INVALID_RULE_QUERY_CONFIG', details: { rule_id: 'rule-1' } },
        })
      );
    });

    it('throws INVALID_RULE_QUERY_CONFIG when a composed rule sets recovery_strategy "query" with no recovery segment', () => {
      const attrs = createRuleSoAttributes({
        kind: 'alert',
        recovery_strategy: 'query',
        query: {
          format: 'composed',
          base: 'FROM logs-*',
          breach: { segment: 'WHERE error' },
        },
      });

      expect(() => validateMergedRuleAttributes('rule-1', attrs)).toThrow(
        expect.objectContaining({
          message: 'query.recovery is required when recovery_strategy is "query".',
          data: { code: 'INVALID_RULE_QUERY_CONFIG', details: { rule_id: 'rule-1' } },
        })
      );
    });

    it('throws INVALID_RULE_QUERY_CONFIG when a query.no_data block has no strategy', () => {
      const attrs = createRuleSoAttributes({
        kind: 'alert',
        no_data_strategy: undefined,
        query: {
          format: 'standalone',
          breach: { query: 'FROM logs-* | LIMIT 1' },
          no_data: { query: 'FROM logs-* | STATS c = COUNT(*) | WHERE c == 0' },
        },
      });

      expect(() => validateMergedRuleAttributes('rule-1', attrs)).toThrow(
        expect.objectContaining({
          message:
            'query.no_data is only allowed when no_data_strategy is set to a non-"none" value.',
          data: { code: 'INVALID_RULE_QUERY_CONFIG', details: { rule_id: 'rule-1' } },
        })
      );
    });

    it('throws INVALID_RULE_QUERY_CONFIG when a no_data_strategy has no no_data block (standalone)', () => {
      const attrs = createRuleSoAttributes({
        kind: 'alert',
        no_data_strategy: 'last_known_status',
        query: { format: 'standalone', breach: { query: 'FROM logs-* | LIMIT 1' } },
      });

      expect(() => validateMergedRuleAttributes('rule-1', attrs)).toThrow(
        expect.objectContaining({
          message:
            'query.no_data is required when no_data_strategy is not "none" for standalone-format rules.',
          data: { code: 'INVALID_RULE_QUERY_CONFIG', details: { rule_id: 'rule-1' } },
        })
      );
    });

    it('does not require a no_data block for a composed-format rule (base query is the data-presence query)', () => {
      const attrs = createRuleSoAttributes({
        kind: 'alert',
        no_data_strategy: 'last_known_status',
        query: {
          format: 'composed',
          base: 'FROM logs-*',
          breach: { segment: 'WHERE error' },
        },
      });

      expect(() => validateMergedRuleAttributes('rule-1', attrs)).not.toThrow();
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
