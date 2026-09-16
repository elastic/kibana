/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UpdateRuleData } from '@kbn/alerting-v2-schemas';
import { TaskStatus } from '@kbn/task-manager-plugin/server';
import {
  ruleResponseSchema,
  createRuleDataSchema,
  updateRuleDataSchema,
} from '@kbn/alerting-v2-schemas';
import { createRuleSoAttributes } from '../test_utils';
import { BuilderTypeRegistry } from '../builder_types';
import type { ResolvedCreateRuleData, RotationCandidate } from './types';
import {
  transformCreateRuleBodyToRuleSoAttributes,
  transformRuleSoAttributesToRuleApiResponse,
  buildUpdateRuleAttributes,
  computeNextRevision,
  assertImmutableUnchanged,
  assertSignatureIdUnchanged,
  assertRuleSourceUnchanged,
  deriveOwnership,
  getManagedWriteOwner,
  managedRuleWriteError,
  validateMergedRuleAttributes,
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
  version: 1,
  signatureId: 'test-sig-id',
  source: { type: 'internal' as const, version: 1 },
  ownership: { managed: false } as const,
};

const baseCreateData: ResolvedCreateRuleData = {
  kind: 'alert',
  metadata: { name: 'test-rule' },
  time_field: '@timestamp',
  schedule: { every: '5m' },
  query: { format: 'standalone', breach: { query: 'FROM logs-* | LIMIT 1' } },
};

const createRuleSoAttributesWithArtifacts = () =>
  createRuleSoAttributes({
    artifacts: [
      { id: 'runbook-1', type: 'runbook', data: { content: 'steps' } },
      { id: 'dashboard-1', type: 'dashboard', data: { dashboard_id: 'dash-1' } },
    ],
  });

describe('utils', () => {
  describe('transformCreateRuleBodyToRuleSoAttributes', () => {
    it('maps description into saved object attributes', () => {
      const data: ResolvedCreateRuleData = {
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
      const data: ResolvedCreateRuleData = {
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

    it('persists an omitted composed breach block as an empty segment', () => {
      const data: ResolvedCreateRuleData = {
        ...baseCreateData,
        query: { format: 'composed', base: 'FROM metrics-*' },
      };

      const result = transformCreateRuleBodyToRuleSoAttributes(data, serverFields);

      expect(result.query).toEqual({
        format: 'composed',
        base: 'FROM metrics-*',
        breach: { segment: '' },
      });
    });

    it('leaves a populated composed breach segment untouched', () => {
      const data: ResolvedCreateRuleData = {
        ...baseCreateData,
        query: {
          format: 'composed',
          base: 'FROM metrics-*',
          breach: { segment: 'WHERE cpu > 0.9' },
        },
      };

      const result = transformCreateRuleBodyToRuleSoAttributes(data, serverFields);

      expect(result.query).toEqual({
        format: 'composed',
        base: 'FROM metrics-*',
        breach: { segment: 'WHERE cpu > 0.9' },
      });
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
        version: 2,
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
        version: 2,
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
        version: 2,
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
        version: 2,
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
        version: 2,
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
        version: 2,
      });

      expect(result.metadata.builder_type).toBe('threshold');
    });

    it('clears builder_type when query changes and explicit builder_type: null is sent', () => {
      const existing = createRuleSoAttributes({
        metadata: { name: 'test-rule', builder_type: 'threshold' },
      });
      const updateData: UpdateRuleData = {
        query: { format: 'standalone', breach: { query: 'FROM new-index | LIMIT 1' } },
        metadata: { builder_type: null },
      };

      const result = buildUpdateRuleAttributes(existing, updateData, {
        updatedBy: 'user-2',
        updatedAt: '2025-01-02T00:00:00.000Z',
        version: 2,
      });

      expect(result.metadata.builder_type).toBeUndefined();
    });

    it('allows query change on a non-builder rule without explicit builder_type', () => {
      const existing = createRuleSoAttributes({
        metadata: { name: 'test-rule' },
      });
      const updateData: UpdateRuleData = {
        query: { format: 'standalone', breach: { query: 'FROM new-index | LIMIT 1' } },
      };

      const result = buildUpdateRuleAttributes(existing, updateData, {
        updatedBy: 'user-2',
        updatedAt: '2025-01-02T00:00:00.000Z',
        version: 2,
      });

      expect(result.metadata.builder_type).toBeUndefined();
    });

    it('allows strategy change on a builder rule without clearing builder_type', () => {
      const existing = createRuleSoAttributes({
        metadata: { name: 'test-rule', builder_type: 'threshold' },
        recovery_strategy: 'no_breach',
      });
      const updateData: UpdateRuleData = {
        recovery_strategy: 'none',
      };

      const result = buildUpdateRuleAttributes(existing, updateData, {
        updatedBy: 'user-2',
        updatedAt: '2025-01-02T00:00:00.000Z',
        version: 2,
      });

      expect(result.metadata.builder_type).toBe('threshold');
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
        version: 2,
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
        version: 2,
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
        version: 2,
      });

      expect(result.metadata.builder_type).toBe('threshold');
    });

    it('does not auto-clear metadata.builder_type when the same conditionless composed query is resent', () => {
      const existing = createRuleSoAttributes({
        metadata: { name: 'test-rule', builder_type: 'threshold' },
        query: { format: 'composed', base: 'FROM metrics-*', breach: { segment: '' } },
      });
      const updateData: UpdateRuleData = {
        query: { format: 'composed', base: 'FROM metrics-*' },
      };

      const result = buildUpdateRuleAttributes(existing, updateData, {
        updatedBy: 'user-2',
        updatedAt: '2025-01-02T00:00:00.000Z',
        version: 2,
      });

      expect(result.metadata.builder_type).toBe('threshold');
      expect(result.query).toEqual({
        format: 'composed',
        base: 'FROM metrics-*',
        breach: { segment: '' },
      });
    });

    it('normalizes an omitted composed breach block on update', () => {
      const existing = createRuleSoAttributes({
        query: { format: 'composed', base: 'FROM logs-*', breach: { segment: 'WHERE error' } },
      });
      const updateData: UpdateRuleData = {
        query: { format: 'composed', base: 'FROM logs-*' },
      };

      const result = buildUpdateRuleAttributes(existing, updateData, {
        updatedBy: 'user-2',
        updatedAt: '2025-01-02T00:00:00.000Z',
        version: 2,
      });

      expect(result.query).toEqual({
        format: 'composed',
        base: 'FROM logs-*',
        breach: { segment: '' },
      });
    });

    it('preserves stored artifacts when the update does not touch them', () => {
      const existing = createRuleSoAttributesWithArtifacts();

      const result = buildUpdateRuleAttributes(
        existing,
        {},
        {
          updatedBy: 'user-2',
          updatedAt: '2025-01-02T00:00:00.000Z',
          version: 2,
        }
      );

      expect(result.artifacts).toEqual([
        { id: 'runbook-1', type: 'runbook', data: { content: 'steps' } },
        { id: 'dashboard-1', type: 'dashboard', data: { dashboard_id: 'dash-1' } },
      ]);
    });
  });

  describe('transformRuleSoAttributesToRuleApiResponse', () => {
    it('returns artifacts that satisfy the strict response schema', () => {
      const attrs = createRuleSoAttributesWithArtifacts();

      const result = transformRuleSoAttributesToRuleApiResponse('rule-id-1', attrs);

      expect(result.artifacts).toEqual([
        { id: 'runbook-1', type: 'runbook', data: { content: 'steps' } },
        { id: 'dashboard-1', type: 'dashboard', data: { dashboard_id: 'dash-1' } },
      ]);
      expect(() => ruleResponseSchema.parse(result)).not.toThrow();
    });

    it('strips legacy artifact value left on disk after model-version migration', () => {
      const attrs = createRuleSoAttributes({
        artifacts: [
          {
            id: 'runbook-1',
            type: 'runbook',
            data: { content: 'steps' },
            // @ts-expect-error legacy key retained on disk for rollback
            value: 'steps',
          },
          {
            id: 'dashboard-1',
            type: 'dashboard',
            data: { dashboard_id: 'dash-1' },
            // @ts-expect-error legacy key retained on disk for rollback
            value: 'dash-1',
          },
        ],
      });

      const result = transformRuleSoAttributesToRuleApiResponse('rule-id-1', attrs);

      expect(result.artifacts).toEqual([
        { id: 'runbook-1', type: 'runbook', data: { content: 'steps' } },
        { id: 'dashboard-1', type: 'dashboard', data: { dashboard_id: 'dash-1' } },
      ]);
      expect(() => ruleResponseSchema.parse(result)).not.toThrow();
    });

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
      const createData: ResolvedCreateRuleData = {
        ...baseCreateData,
        metadata: { name: 'round-trip-rule', description: 'Round-trip desc' },
      };

      const soAttrs = transformCreateRuleBodyToRuleSoAttributes(createData, serverFields);
      const response = transformRuleSoAttributesToRuleApiResponse('rule-rt-1', soAttrs);

      expect(response.metadata.description).toBe('Round-trip desc');
    });

    it('omits the breach block when the stored composed segment is empty', () => {
      const attrs = createRuleSoAttributes({
        query: { format: 'composed', base: 'FROM metrics-*', breach: { segment: '' } },
      });

      const result = transformRuleSoAttributesToRuleApiResponse('rule-id-1', attrs);

      expect(result.query).toEqual({ format: 'composed', base: 'FROM metrics-*' });
    });

    it('preserves an unrelated recovery segment when omitting an empty breach block', () => {
      const attrs = createRuleSoAttributes({
        query: {
          format: 'composed',
          base: 'FROM metrics-*',
          breach: { segment: '' },
          recovery: { segment: 'WHERE cpu < 0.5' },
        },
      });

      const result = transformRuleSoAttributesToRuleApiResponse('rule-id-1', attrs);

      expect(result.query).toEqual({
        format: 'composed',
        base: 'FROM metrics-*',
        recovery: { segment: 'WHERE cpu < 0.5' },
      });
    });

    it('round-trips a conditionless composed query through create → transform', () => {
      const createData: ResolvedCreateRuleData = {
        ...baseCreateData,
        query: { format: 'composed', base: 'FROM metrics-*' },
      };

      const soAttrs = transformCreateRuleBodyToRuleSoAttributes(createData, serverFields);
      const response = transformRuleSoAttributesToRuleApiResponse('rule-rt-2', soAttrs);

      expect(soAttrs.query).toEqual({
        format: 'composed',
        base: 'FROM metrics-*',
        breach: { segment: '' },
      });
      expect(response.query).toEqual(createData.query);
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

    it('exposes the persisted version as metadata.version on the API response', () => {
      const attrs = createRuleSoAttributes({ metadata: { name: 'test-rule', version: 7 } });

      const result = transformRuleSoAttributesToRuleApiResponse('rule-id-1', attrs);
      expect(result.metadata.version).toBe(7);
    });

    it('falls back to the baseline version when the rule has no version yet', () => {
      const attrs = createRuleSoAttributes({ metadata: { name: 'test-rule', version: undefined } });

      const result = transformRuleSoAttributesToRuleApiResponse('rule-id-1', attrs);
      expect(result.metadata.version).toBe(1);
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

  describe('assertSignatureIdUnchanged (step 4.1)', () => {
    const storedAttrs = createRuleSoAttributes({
      metadata: { name: 'test', signature_id: 'stored-sig' },
    });

    it('does not throw when incomingSignatureId is undefined (omitted-means-keep)', () => {
      expect(() => assertSignatureIdUnchanged(undefined, storedAttrs)).not.toThrow();
    });

    it('does not throw when incomingSignatureId is null (treated as omitted)', () => {
      expect(() => assertSignatureIdUnchanged(null, storedAttrs)).not.toThrow();
    });

    it('does not throw when incomingSignatureId matches stored value (equal-passes)', () => {
      expect(() => assertSignatureIdUnchanged('stored-sig', storedAttrs)).not.toThrow();
    });

    it('throws Boom.conflict (409) when incomingSignatureId differs from stored', () => {
      expect(() => assertSignatureIdUnchanged('different-sig', storedAttrs)).toThrow(
        expect.objectContaining({
          isBoom: true,
          output: expect.objectContaining({ statusCode: 409 }),
          message: expect.stringContaining('metadata.signature_id'),
        })
      );
    });

    it('attaches IMMUTABLE_FIELDS_CHANGED code when differing', () => {
      expect(() => assertSignatureIdUnchanged('different-sig', storedAttrs)).toThrow(
        expect.objectContaining({
          data: {
            code: 'IMMUTABLE_FIELDS_CHANGED',
            details: { fields: ['metadata.signature_id'] },
          },
        })
      );
    });
  });

  describe('transformCreateRuleBodyToRuleSoAttributes — signature_id (step 4.1)', () => {
    it('stores the caller-supplied signatureId in metadata.signature_id', () => {
      const result = transformCreateRuleBodyToRuleSoAttributes(baseCreateData, {
        ...serverFields,
        signatureId: 'my-sig-id',
      });

      expect(result.metadata.signature_id).toBe('my-sig-id');
    });
  });

  describe('transformRuleSoAttributesToRuleApiResponse — signature_id (step 4.1)', () => {
    it('includes signature_id from stored attributes in the response', () => {
      const attrs = createRuleSoAttributes({
        metadata: { name: 'rule-1', signature_id: 'response-sig' },
      });

      const result = transformRuleSoAttributesToRuleApiResponse('rule-id-1', attrs);

      expect(result.metadata.signature_id).toBe('response-sig');
    });

    it('round-trips signature_id through create → transform', () => {
      const soAttrs = transformCreateRuleBodyToRuleSoAttributes(baseCreateData, {
        ...serverFields,
        signatureId: 'round-trip-sig',
      });

      const response = transformRuleSoAttributesToRuleApiResponse('rule-rt', soAttrs);

      expect(response.metadata.signature_id).toBe('round-trip-sig');
    });

    it('passes ruleResponseSchema parse with signature_id set', () => {
      const soAttrs = transformCreateRuleBodyToRuleSoAttributes(baseCreateData, {
        ...serverFields,
        signatureId: 'schema-check-sig',
      });

      const response = transformRuleSoAttributesToRuleApiResponse('rule-schema', soAttrs);

      expect(() => ruleResponseSchema.parse(response)).not.toThrow();
    });
  });

  describe('buildUpdateRuleAttributes — signature_id immutability (step 4.1)', () => {
    it('preserves stored signature_id when the update data omits the field', () => {
      const existing = createRuleSoAttributes({
        metadata: { name: 'original', signature_id: 'stored-sig' },
      });

      const next = buildUpdateRuleAttributes(
        existing,
        {},
        { updatedBy: 'u', updatedAt: 't', version: 2 }
      );

      expect(next.metadata.signature_id).toBe('stored-sig');
    });

    it('still preserves stored signature_id when the update data supplies the same value', () => {
      const existing = createRuleSoAttributes({
        metadata: { name: 'original', signature_id: 'stored-sig' },
      });

      const next = buildUpdateRuleAttributes(
        existing,
        { metadata: { signature_id: 'stored-sig' } },
        { updatedBy: 'u', updatedAt: 't', version: 2 }
      );

      expect(next.metadata.signature_id).toBe('stored-sig');
    });

    it('still preserves stored signature_id even when the update data supplies a different value (caller checked upstream)', () => {
      // buildUpdateRuleAttributes always restores the stored value — the mismatch
      // check is done by assertSignatureIdUnchanged in the rules client before
      // this function is called. This test documents that contract.
      const existing = createRuleSoAttributes({
        metadata: { name: 'original', signature_id: 'stored-sig' },
      });

      const next = buildUpdateRuleAttributes(
        existing,
        { metadata: { signature_id: 'changed-sig' } },
        { updatedBy: 'u', updatedAt: 't', version: 2 }
      );

      expect(next.metadata.signature_id).toBe('stored-sig');
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

    it('throws INVALID_STATE_TRANSITION_CONFIG (400) when a recovering delay is set while recovery is disabled', () => {
      const attrs = createRuleSoAttributes({
        kind: 'alert',
        recovery_strategy: 'none',
        state_transition: { recovering_count: 3 },
      });

      expect(() => validateMergedRuleAttributes('rule-1', attrs)).toThrow(
        expect.objectContaining({
          isBoom: true,
          output: expect.objectContaining({ statusCode: 400 }),
          message:
            'state_transition.recovering_count and recovering_timeframe have no effect when recovery is disabled (recovery_strategy is "none" or unset).',
          data: { code: 'INVALID_STATE_TRANSITION_CONFIG', details: { rule_id: 'rule-1' } },
        })
      );
    });

    it('throws INVALID_STATE_TRANSITION_CONFIG when a recovering_timeframe is set while recovery is unset', () => {
      const attrs = createRuleSoAttributes({
        kind: 'alert',
        recovery_strategy: undefined,
        state_transition: { recovering_timeframe: '5m' },
      });

      expect(() => validateMergedRuleAttributes('rule-1', attrs)).toThrow(
        expect.objectContaining({
          data: { code: 'INVALID_STATE_TRANSITION_CONFIG', details: { rule_id: 'rule-1' } },
        })
      );
    });

    it('does not throw for a recovering delay when recovery is enabled', () => {
      const attrs = createRuleSoAttributes({
        kind: 'alert',
        recovery_strategy: 'no_breach',
        state_transition: { recovering_count: 3, recovering_timeframe: '5m' },
      });

      expect(() => validateMergedRuleAttributes('rule-1', attrs)).not.toThrow();
    });

    it('throws INVALID_STATE_TRANSITION_CONFIG for recovering_count 0 when recovery is disabled', () => {
      const attrs = createRuleSoAttributes({
        kind: 'alert',
        recovery_strategy: 'none',
        state_transition: { pending_count: 0, recovering_count: 0 },
      });

      expect(() => validateMergedRuleAttributes('rule-1', attrs)).toThrow(
        expect.objectContaining({
          data: { code: 'INVALID_STATE_TRANSITION_CONFIG', details: { rule_id: 'rule-1' } },
        })
      );
    });
  });

  // ---------------------------------------------------------------------------
  // Step 4.2: metadata.revision — the meaningful-edit counter
  // ---------------------------------------------------------------------------

  describe('computeNextRevision (step 4.2)', () => {
    const stored = createRuleSoAttributes({ metadata: { name: 'rule-1', revision: 2 } });

    it('returns the current revision when next attrs are identical to stored (no-op update)', () => {
      // Exact same content: no meaningful change, counter must stay.
      expect(computeNextRevision(stored, stored)).toBe(2);
    });

    it('bumps revision by one when any meaningful field differs', () => {
      const next = {
        ...stored,
        metadata: { ...stored.metadata, name: 'renamed' },
      };
      expect(computeNextRevision(next, stored)).toBe(3);
    });

    it('does NOT bump when only excluded fields differ (updated_at, updated_by, version, revision)', () => {
      // Simulate the stamps that every write applies — these must never trigger a bump.
      const next = {
        ...stored,
        updatedAt: '2099-01-01T00:00:00.000Z',
        updatedBy: 'some-other-user',
        metadata: {
          ...stored.metadata,
          version: 99,
          revision: 99,
        },
      };
      expect(computeNextRevision(next, stored)).toBe(2);
    });

    it('does NOT bump when tags:null clears absent tags (null → undefined normalizes to no change)', () => {
      // v2's PATCH normalizes `tags: null` → stored as `undefined` (absent).
      // Both next and stored have tags absent, so the diff sees no difference.
      const storedNoTags = createRuleSoAttributes({
        metadata: { name: 'rule-1', revision: 5 },
        // no tags field
      });
      const nextNoTags = {
        ...storedNoTags,
        metadata: { ...storedNoTags.metadata, tags: undefined },
      };
      expect(computeNextRevision(nextNoTags, storedNoTags)).toBe(5);
    });

    it('bumps when tags actually change (non-empty → empty)', () => {
      const storedWithTags = createRuleSoAttributes({
        metadata: { name: 'rule-1', tags: ['a', 'b'], revision: 3 },
      });
      const nextNoTags = {
        ...storedWithTags,
        metadata: { ...storedWithTags.metadata, tags: undefined },
      };
      expect(computeNextRevision(nextNoTags, storedWithTags)).toBe(4);
    });

    it('bumps when builder_fields container changes (diffed as one value)', () => {
      const storedWithBuilder = createRuleSoAttributes({
        metadata: {
          name: 'rule-1',
          builder_type: 'threshold',
          builder_fields: { threshold: 10 },
          revision: 1,
        },
      });
      const nextDifferentBuilder = {
        ...storedWithBuilder,
        metadata: {
          ...storedWithBuilder.metadata,
          builder_fields: { threshold: 20 },
        },
      };
      expect(computeNextRevision(nextDifferentBuilder, storedWithBuilder)).toBe(2);
    });

    it('bumps when builder_fields gains an empty-array field (e.g. references: [])', () => {
      // The design says builder_fields diffs as one whole value — any difference
      // in the container is meaningful content, not a PATCH normalisation.
      // An empty array inside builder_fields (e.g. references: []) must register
      // as a change, not be silently erased by deepOmitUndefined.
      const storedNoRefs = createRuleSoAttributes({
        metadata: {
          name: 'rule-1',
          builder_type: 'security.detection.query',
          builder_fields: { severity: 'high', risk_score: 50 },
          revision: 3,
        },
      });
      const nextWithEmptyRefs = {
        ...storedNoRefs,
        metadata: {
          ...storedNoRefs.metadata,
          builder_fields: { severity: 'high', risk_score: 50, references: [] },
        },
      };
      // Adding references: [] is a real content change — revision must bump.
      expect(computeNextRevision(nextWithEmptyRefs, storedNoRefs)).toBe(4);
    });

    it('bumps when builder_fields drops an empty-array field (e.g. references: [] removed)', () => {
      // The reverse direction: stored has references: [], next drops it.
      // Both sides must be compared verbatim — no silent erasure of the empty array.
      const storedWithEmptyRefs = createRuleSoAttributes({
        metadata: {
          name: 'rule-1',
          builder_type: 'security.detection.query',
          builder_fields: { severity: 'high', risk_score: 50, references: [] },
          revision: 4,
        },
      });
      const nextNoRefs = {
        ...storedWithEmptyRefs,
        metadata: {
          ...storedWithEmptyRefs.metadata,
          builder_fields: { severity: 'high', risk_score: 50 },
        },
      };
      // Dropping references: [] is a real content change — revision must bump.
      expect(computeNextRevision(nextNoRefs, storedWithEmptyRefs)).toBe(5);
    });

    it('does NOT bump when builder_fields is identical including empty arrays', () => {
      // If both sides carry the same empty-array field, there is no change.
      const storedWithEmptyRefs = createRuleSoAttributes({
        metadata: {
          name: 'rule-1',
          builder_type: 'security.detection.query',
          builder_fields: { severity: 'high', risk_score: 50, references: [] },
          revision: 4,
        },
      });
      expect(computeNextRevision(storedWithEmptyRefs, storedWithEmptyRefs)).toBe(4);
    });

    it('falls back to 0 and bumps to 1 when stored has no revision (unmigrated rule)', () => {
      // Rule created before step 4.2's migration — no revision on disk.
      const storedNoRevision = createRuleSoAttributes({
        metadata: { name: 'rule-1' },
      });
      const nextChanged = {
        ...storedNoRevision,
        metadata: { ...storedNoRevision.metadata, name: 'renamed' },
      };
      expect(computeNextRevision(nextChanged, storedNoRevision)).toBe(1);
    });

    it('falls back to 0 and stays at 0 for an unmigrated rule on a no-op write', () => {
      const storedNoRevision = createRuleSoAttributes({
        metadata: { name: 'rule-1' },
      });
      expect(computeNextRevision(storedNoRevision, storedNoRevision)).toBe(0);
    });
  });

  describe('transformCreateRuleBodyToRuleSoAttributes — revision (step 4.2)', () => {
    it('seeds revision at 0 on create', () => {
      const result = transformCreateRuleBodyToRuleSoAttributes(baseCreateData, serverFields);
      expect(result.metadata.revision).toBe(0);
    });
  });

  describe('buildUpdateRuleAttributes — revision (step 4.2)', () => {
    const baseExisting = createRuleSoAttributes({
      metadata: { name: 'rule-1', version: 1, revision: 3, signature_id: 'sig-1' },
    });
    const baseUpdateServerFields = {
      updatedBy: 'user-2',
      updatedAt: '2099-01-01T00:00:00.000Z',
      version: 2,
    };

    it('does NOT bump revision when the update changes nothing meaningful', () => {
      // Sending an empty update — all optional fields omitted, nothing changes.
      const result = buildUpdateRuleAttributes(baseExisting, {}, baseUpdateServerFields);
      // Revision stays at 3; only version, updatedAt, updatedBy moved.
      expect(result.metadata.revision).toBe(3);
    });

    it('bumps revision by exactly one when a meaningful field changes', () => {
      const result = buildUpdateRuleAttributes(
        baseExisting,
        { metadata: { name: 'renamed-rule' } },
        baseUpdateServerFields
      );
      expect(result.metadata.revision).toBe(4);
    });

    it('bumps at most once even when multiple fields change in a single update', () => {
      const result = buildUpdateRuleAttributes(
        baseExisting,
        {
          metadata: { name: 'renamed-rule', tags: ['new-tag'] },
          time_field: 'event.created',
        },
        baseUpdateServerFields
      );
      expect(result.metadata.revision).toBe(4);
    });

    it('version (metadata.version) still increments independently of revision', () => {
      // No-op update: revision stays, version still moves.
      const noOpResult = buildUpdateRuleAttributes(baseExisting, {}, baseUpdateServerFields);
      expect(noOpResult.metadata.version).toBe(2);
      expect(noOpResult.metadata.revision).toBe(3);
    });

    it('does NOT bump revision when tags:null clears absent tags (end-to-end through update path)', () => {
      // Drive the clear through buildUpdateRuleAttributes so the null → undefined
      // normalization (nullToUndefined) runs as part of what is tested, not just
      // the final computeNextRevision call.
      const storedNoTags = createRuleSoAttributes({
        metadata: { name: 'rule-1', revision: 7, signature_id: 'sig-1' },
        // no tags stored
      });
      const result = buildUpdateRuleAttributes(
        storedNoTags,
        { metadata: { tags: null } },
        { updatedBy: 'user-2', updatedAt: '2099-01-01T00:00:00.000Z', version: 2 }
      );
      expect(result.metadata.revision).toBe(7); // no bump
    });

    it('does NOT bump revision when artifacts:null clears absent artifacts (null → [] normalizes to absent)', () => {
      // Rule created without artifacts; the edit flyout sends artifacts: null on
      // every save unconditionally. The revision counter must not move.
      const storedNoArtifacts = createRuleSoAttributes({
        metadata: { name: 'rule-1', revision: 4, signature_id: 'sig-1' },
        // no artifacts stored
      });
      const result = buildUpdateRuleAttributes(
        storedNoArtifacts,
        { artifacts: null },
        { updatedBy: 'user-2', updatedAt: '2099-01-01T00:00:00.000Z', version: 2 }
      );
      expect(result.metadata.revision).toBe(4); // no bump
    });

    it('does NOT bump revision when state_transition:null clears absent state_transition', () => {
      // Rule created without state_transition; the edit flyout sends
      // state_transition: null unconditionally. The counter must not move.
      const storedNoStateTransition = createRuleSoAttributes({
        metadata: { name: 'rule-1', revision: 2, signature_id: 'sig-1' },
        // no state_transition stored
      });
      const result = buildUpdateRuleAttributes(
        storedNoStateTransition,
        { state_transition: null },
        { updatedBy: 'user-2', updatedAt: '2099-01-01T00:00:00.000Z', version: 2 }
      );
      expect(result.metadata.revision).toBe(2); // no bump
    });

    it('DOES bump revision when artifacts change from absent to non-empty', () => {
      const storedNoArtifacts = createRuleSoAttributes({
        metadata: { name: 'rule-1', revision: 1, signature_id: 'sig-1' },
      });
      const result = buildUpdateRuleAttributes(
        storedNoArtifacts,
        { artifacts: [{ type: 'dashboard', id: 'dash-1', data: { dashboard_id: 'dash-1' } }] },
        { updatedBy: 'user-2', updatedAt: '2099-01-01T00:00:00.000Z', version: 2 }
      );
      expect(result.metadata.revision).toBe(2); // bumps
    });

    it('DOES bump revision when state_transition changes from absent to a value', () => {
      const storedNoStateTransition = createRuleSoAttributes({
        metadata: { name: 'rule-1', revision: 1, signature_id: 'sig-1' },
      });
      const result = buildUpdateRuleAttributes(
        storedNoStateTransition,
        { state_transition: { pending_count: 3 } },
        { updatedBy: 'user-2', updatedAt: '2099-01-01T00:00:00.000Z', version: 2 }
      );
      expect(result.metadata.revision).toBe(2); // bumps
    });
  });

  describe('transformRuleSoAttributesToRuleApiResponse — revision (step 4.2)', () => {
    it('includes revision from stored attributes in the response', () => {
      const attrs = createRuleSoAttributes({
        metadata: { name: 'rule-1', revision: 7, signature_id: 'sig-1' },
      });
      const result = transformRuleSoAttributesToRuleApiResponse('rule-id', attrs);
      expect(result.metadata.revision).toBe(7);
    });

    it('falls back to 0 for revision when the stored attribute is absent (unmigrated rule)', () => {
      const attrs = createRuleSoAttributes({
        metadata: { name: 'rule-1', signature_id: 'sig-1' },
        // no revision
      });
      const result = transformRuleSoAttributesToRuleApiResponse('rule-id', attrs);
      expect(result.metadata.revision).toBe(0);
    });

    it('passes ruleResponseSchema parse with revision present', () => {
      const attrs = createRuleSoAttributes({
        metadata: { name: 'rule-1', revision: 2, signature_id: 'sig-1' },
      });
      const result = transformRuleSoAttributesToRuleApiResponse('rule-id', attrs);
      expect(() => ruleResponseSchema.parse(result)).not.toThrow();
    });
  });

  // ─── Step 4.3: source object ───────────────────────────────────────────────

  describe('assertRuleSourceUnchanged (step 4.3)', () => {
    describe('no-op cases — should never throw', () => {
      it('does not throw when source is omitted (undefined)', () => {
        const stored = createRuleSoAttributes({
          metadata: { name: 'rule', signature_id: 'sig', source: { type: 'internal', version: 1 } },
        });
        expect(() => assertRuleSourceUnchanged(undefined, stored)).not.toThrow();
      });

      it('does not throw when stored source is absent (pre-migration rule)', () => {
        const stored = createRuleSoAttributes({ metadata: { name: 'rule', signature_id: 'sig' } });
        expect(() =>
          assertRuleSourceUnchanged({ type: 'internal', version: 1 }, stored)
        ).not.toThrow();
      });

      it('does not throw when type matches for internal', () => {
        const stored = createRuleSoAttributes({
          metadata: { name: 'rule', signature_id: 'sig', source: { type: 'internal', version: 1 } },
        });
        expect(() =>
          assertRuleSourceUnchanged({ type: 'internal', version: 2 }, stored)
        ).not.toThrow();
      });

      it('does not throw when type and id match for template', () => {
        const stored = createRuleSoAttributes({
          metadata: {
            name: 'rule',
            signature_id: 'sig',
            source: { type: 'template', version: 1, id: 'tmpl-abc' },
          },
        });
        expect(() =>
          assertRuleSourceUnchanged({ type: 'template', version: 5, id: 'tmpl-abc' }, stored)
        ).not.toThrow();
      });

      it('does not throw when type and id match for external', () => {
        const stored = createRuleSoAttributes({
          metadata: {
            name: 'rule',
            signature_id: 'sig',
            source: { type: 'external', version: 209, id: 'asset-xyz' },
          },
        });
        expect(() =>
          assertRuleSourceUnchanged({ type: 'external', version: 210, id: 'asset-xyz' }, stored)
        ).not.toThrow();
      });
    });

    describe('conflict cases — should throw 409 IMMUTABLE_FIELDS_CHANGED', () => {
      it('throws when type changes from internal to template', () => {
        const stored = createRuleSoAttributes({
          metadata: { name: 'rule', signature_id: 'sig', source: { type: 'internal', version: 1 } },
        });
        expect(() =>
          assertRuleSourceUnchanged({ type: 'template', version: 1, id: 'tmpl-id' }, stored)
        ).toThrow(
          expect.objectContaining({
            isBoom: true,
            output: expect.objectContaining({ statusCode: 409 }),
          })
        );
      });

      it('throws when type changes from template to external', () => {
        const stored = createRuleSoAttributes({
          metadata: {
            name: 'rule',
            signature_id: 'sig',
            source: { type: 'template', version: 1, id: 'tmpl-id' },
          },
        });
        expect(() =>
          assertRuleSourceUnchanged({ type: 'external', version: 1, id: 'tmpl-id' }, stored)
        ).toThrow(
          expect.objectContaining({
            isBoom: true,
            output: expect.objectContaining({ statusCode: 409 }),
          })
        );
      });

      it('throws with IMMUTABLE_FIELDS_CHANGED and the changed field name', () => {
        const stored = createRuleSoAttributes({
          metadata: { name: 'rule', signature_id: 'sig', source: { type: 'internal', version: 1 } },
        });
        let err: unknown;
        try {
          assertRuleSourceUnchanged({ type: 'external', version: 1, id: 'asset-id' }, stored);
        } catch (e) {
          err = e;
        }
        expect(err).toMatchObject({
          data: { code: 'IMMUTABLE_FIELDS_CHANGED', details: { fields: ['metadata.source.type'] } },
        });
      });

      it('throws when id changes for template source', () => {
        const stored = createRuleSoAttributes({
          metadata: {
            name: 'rule',
            signature_id: 'sig',
            source: { type: 'template', version: 1, id: 'tmpl-abc' },
          },
        });
        expect(() =>
          assertRuleSourceUnchanged({ type: 'template', version: 1, id: 'tmpl-different' }, stored)
        ).toThrow(
          expect.objectContaining({
            isBoom: true,
            output: expect.objectContaining({ statusCode: 409 }),
          })
        );
      });

      it('includes metadata.source.id in the changed-fields list when id differs', () => {
        const stored = createRuleSoAttributes({
          metadata: {
            name: 'rule',
            signature_id: 'sig',
            source: { type: 'external', version: 100, id: 'asset-abc' },
          },
        });
        let err: unknown;
        try {
          assertRuleSourceUnchanged({ type: 'external', version: 100, id: 'asset-xyz' }, stored);
        } catch (e) {
          err = e;
        }
        expect(err).toMatchObject({
          data: { details: { fields: ['metadata.source.id'] } },
        });
      });
    });
  });

  describe('transformCreateRuleBodyToRuleSoAttributes — source (step 4.3)', () => {
    it('stores the declared internal source', () => {
      const result = transformCreateRuleBodyToRuleSoAttributes(baseCreateData, {
        ...serverFields,
        source: { type: 'internal', version: 1 },
      });
      expect(result.metadata.source).toEqual({ type: 'internal', version: 1 });
    });

    it('stores a template source with its id', () => {
      const result = transformCreateRuleBodyToRuleSoAttributes(baseCreateData, {
        ...serverFields,
        source: { type: 'template', version: 1, id: 'tmpl-abc' },
      });
      expect(result.metadata.source).toEqual({ type: 'template', version: 1, id: 'tmpl-abc' });
    });

    it('stores an external source with its id and version', () => {
      const result = transformCreateRuleBodyToRuleSoAttributes(baseCreateData, {
        ...serverFields,
        source: { type: 'external', version: 209, id: 'asset-xyz' },
      });
      expect(result.metadata.source).toEqual({ type: 'external', version: 209, id: 'asset-xyz' });
    });
  });

  describe('buildUpdateRuleAttributes — source (step 4.3)', () => {
    it('preserves stored source when update data omits the field', () => {
      const stored = { type: 'external', version: 100, id: 'asset-id' } as const;
      const existing = createRuleSoAttributes({
        metadata: { name: 'rule', signature_id: 'sig', source: stored },
      });

      const next = buildUpdateRuleAttributes(
        existing,
        {},
        { updatedBy: 'u', updatedAt: 't', version: 2 }
      );

      expect(next.metadata.source).toEqual(stored);
    });

    it('allows version to move while preserving type and id', () => {
      const existing = createRuleSoAttributes({
        metadata: {
          name: 'rule',
          signature_id: 'sig',
          source: { type: 'template', version: 1, id: 'tmpl-abc' },
        },
      });

      const next = buildUpdateRuleAttributes(
        existing,
        { metadata: { source: { type: 'template', version: 5, id: 'tmpl-abc' } } },
        { updatedBy: 'u', updatedAt: 't', version: 2 }
      );

      expect(next.metadata.source).toEqual({ type: 'template', version: 5, id: 'tmpl-abc' });
    });

    it('forces stored type and id even when the caller sends different values (assertRuleSourceUnchanged handles the rejection upstream)', () => {
      // buildUpdateRuleAttributes always restores type and id from storage.
      // The mismatch rejection happens in assertRuleSourceUnchanged before this
      // function is called; this test documents that the function is safe.
      const existing = createRuleSoAttributes({
        metadata: {
          name: 'rule',
          signature_id: 'sig',
          source: { type: 'external', version: 100, id: 'original-id' },
        },
      });

      const next = buildUpdateRuleAttributes(
        existing,
        { metadata: { source: { type: 'external', version: 101, id: 'changed-id' } } },
        { updatedBy: 'u', updatedAt: 't', version: 2 }
      );

      // type and id forced from storage; only version moved
      expect(next.metadata.source).toEqual({ type: 'external', version: 101, id: 'original-id' });
    });

    it('uses incoming source as-is when stored source is absent (pre-migration)', () => {
      const existing = createRuleSoAttributes({ metadata: { name: 'rule', signature_id: 'sig' } });

      const next = buildUpdateRuleAttributes(
        existing,
        { metadata: { source: { type: 'internal', version: 2 } } },
        { updatedBy: 'u', updatedAt: 't', version: 2 }
      );

      expect(next.metadata.source).toEqual({ type: 'internal', version: 2 });
    });
  });

  describe('transformRuleSoAttributesToRuleApiResponse — source (step 4.3)', () => {
    it('includes internal source from stored attributes', () => {
      const attrs = createRuleSoAttributes({
        metadata: { name: 'rule', signature_id: 'sig', source: { type: 'internal', version: 3 } },
      });
      const result = transformRuleSoAttributesToRuleApiResponse('rule-id', attrs);
      expect(result.metadata.source).toEqual({ type: 'internal', version: 3 });
    });

    it('includes template source with id', () => {
      const attrs = createRuleSoAttributes({
        metadata: {
          name: 'rule',
          signature_id: 'sig',
          source: { type: 'template', version: 1, id: 'tmpl-id' },
        },
      });
      const result = transformRuleSoAttributesToRuleApiResponse('rule-id', attrs);
      expect(result.metadata.source).toEqual({ type: 'template', version: 1, id: 'tmpl-id' });
    });

    it('includes external source with id and version', () => {
      const attrs = createRuleSoAttributes({
        metadata: {
          name: 'rule',
          signature_id: 'sig',
          source: { type: 'external', version: 209, id: 'asset-id' },
        },
      });
      const result = transformRuleSoAttributesToRuleApiResponse('rule-id', attrs);
      expect(result.metadata.source).toEqual({ type: 'external', version: 209, id: 'asset-id' });
    });

    it('falls back to internal/version-1 when stored source is absent (pre-migration)', () => {
      const attrs = createRuleSoAttributes({ metadata: { name: 'rule', signature_id: 'sig' } });
      const result = transformRuleSoAttributesToRuleApiResponse('rule-id', attrs);
      expect(result.metadata.source).toEqual({ type: 'internal', version: 1 });
    });

    it('passes ruleResponseSchema parse for each source variant', () => {
      const variants = [
        { type: 'internal', version: 1 } as const,
        { type: 'template', version: 1, id: 'tmpl-id' } as const,
        { type: 'external', version: 100, id: 'asset-id' } as const,
      ];
      for (const source of variants) {
        const attrs = createRuleSoAttributes({
          metadata: { name: 'rule', signature_id: 'sig', source },
        });
        const result = transformRuleSoAttributesToRuleApiResponse('rule-id', attrs);
        expect(() => ruleResponseSchema.parse(result)).not.toThrow();
      }
    });
  });

  // ---------------------------------------------------------------------------
  // Step 4.4: metadata.ownership — server-derived, immutable, response-only
  // ---------------------------------------------------------------------------

  describe('deriveOwnership (step 4.4)', () => {
    it('returns { managed: false } when builder type is undefined', () => {
      const registry = new BuilderTypeRegistry();
      expect(deriveOwnership(registry, undefined)).toEqual({ managed: false });
    });

    it('returns { managed: false } when builder type is null', () => {
      const registry = new BuilderTypeRegistry();
      expect(deriveOwnership(registry, null)).toEqual({ managed: false });
    });

    it('returns { managed: false } when the builder type is not in the registry', () => {
      const registry = new BuilderTypeRegistry();
      // registry.get('unknown.type') returns undefined — not registered
      expect(deriveOwnership(registry, 'unknown.type')).toEqual({ managed: false });
    });

    it('returns { managed: false } when the registered type has no ownership declaration', () => {
      // Spy on `get` to return an unmanaged type (no `ownership` field).
      const registry = new BuilderTypeRegistry();
      jest.spyOn(registry, 'get').mockReturnValue({
        type: 'platform.test.query',
        name: 'Test type',
        builderFieldsSchema: {} as never,
        generateQuery: jest.fn(),
        // no `ownership` field → unmanaged
      });
      expect(deriveOwnership(registry, 'platform.test.query')).toEqual({ managed: false });
    });

    it('returns { managed: true, solution, domain } for a managed builder type', () => {
      const registry = new BuilderTypeRegistry();
      jest.spyOn(registry, 'get').mockReturnValue({
        type: 'security.detection.query',
        name: 'Detection query',
        ownership: { solution: 'security', domain: 'detection' },
        builderFieldsSchema: {} as never,
        generateQuery: jest.fn(),
      });
      expect(deriveOwnership(registry, 'security.detection.query')).toEqual({
        managed: true,
        solution: 'security',
        domain: 'detection',
      });
    });
  });

  // ---------------------------------------------------------------------------
  // Step 5.1: caller identity — app fills from onBehalfOf on unmanaged creates
  // ---------------------------------------------------------------------------

  describe('deriveOwnership — app from caller identity (step 5.1)', () => {
    it('includes app in { managed: false } when an app is provided', () => {
      const registry = new BuilderTypeRegistry();
      expect(deriveOwnership(registry, undefined, 'significantEvents')).toEqual({
        managed: false,
        app: 'significantEvents',
      });
    });

    it('omits app from { managed: false } when app is undefined', () => {
      const registry = new BuilderTypeRegistry();
      const result = deriveOwnership(registry, undefined, undefined);
      expect(result).toEqual({ managed: false });
      expect((result as { app?: string }).app).toBeUndefined();
    });

    it('ignores app for a managed builder type — managed ownership wins', () => {
      const registry = new BuilderTypeRegistry();
      jest.spyOn(registry, 'get').mockReturnValue({
        type: 'security.detection.query',
        name: 'Detection query',
        ownership: { solution: 'security', domain: 'detection' },
        builderFieldsSchema: {} as never,
        generateQuery: jest.fn(),
      });
      // Even if app is supplied, the managed path wins and app does not appear.
      const result = deriveOwnership(registry, 'security.detection.query', 'someApp');
      expect(result).toEqual({ managed: true, solution: 'security', domain: 'detection' });
      expect((result as { app?: string }).app).toBeUndefined();
    });

    it('includes app when the builder type is unregistered', () => {
      const registry = new BuilderTypeRegistry();
      expect(deriveOwnership(registry, 'unknown.type', 'myApp')).toEqual({
        managed: false,
        app: 'myApp',
      });
    });
  });

  describe('transformCreateRuleBodyToRuleSoAttributes — ownership (step 4.4)', () => {
    it('stores the server-supplied ownership in metadata.ownership', () => {
      const result = transformCreateRuleBodyToRuleSoAttributes(baseCreateData, {
        ...serverFields,
        ownership: { managed: false },
      });
      expect(result.metadata.ownership).toEqual({ managed: false });
    });

    it('stores managed ownership when supplied', () => {
      const result = transformCreateRuleBodyToRuleSoAttributes(baseCreateData, {
        ...serverFields,
        ownership: { managed: true, solution: 'security', domain: 'detection' },
      });
      expect(result.metadata.ownership).toEqual({
        managed: true,
        solution: 'security',
        domain: 'detection',
      });
    });
  });

  describe('buildUpdateRuleAttributes — ownership immutability (step 4.4)', () => {
    it('preserves stored ownership when update data omits the field', () => {
      const existing = createRuleSoAttributes({
        metadata: {
          name: 'rule',
          signature_id: 'sig',
          ownership: { managed: true, solution: 'security', domain: 'detection' },
        },
      });

      const next = buildUpdateRuleAttributes(
        existing,
        {},
        { updatedBy: 'u', updatedAt: 't', version: 2 }
      );

      expect(next.metadata.ownership).toEqual({
        managed: true,
        solution: 'security',
        domain: 'detection',
      });
    });

    it('preserves stored unmanaged ownership even when absent (pre-migration fallback)', () => {
      const existing = createRuleSoAttributes({
        metadata: { name: 'rule', signature_id: 'sig' },
      });
      // ownership is not set — simulates a rule created before step 4.4
      delete (existing.metadata as Record<string, unknown>).ownership;

      const next = buildUpdateRuleAttributes(
        existing,
        {},
        { updatedBy: 'u', updatedAt: 't', version: 2 }
      );

      // The stored value (undefined) is preserved as-is; the fallback happens
      // only in transformRuleSoAttributesToRuleApiResponse at response time.
      expect(next.metadata.ownership).toBeUndefined();
    });
  });

  describe('transformRuleSoAttributesToRuleApiResponse — ownership (step 4.4)', () => {
    it('includes managed ownership from stored attributes', () => {
      const attrs = createRuleSoAttributes({
        metadata: {
          name: 'rule',
          signature_id: 'sig',
          ownership: { managed: true, solution: 'security', domain: 'detection' },
        },
      });
      const result = transformRuleSoAttributesToRuleApiResponse('rule-id', attrs);
      expect(result.metadata.ownership).toEqual({
        managed: true,
        solution: 'security',
        domain: 'detection',
      });
    });

    it('includes unmanaged ownership from stored attributes', () => {
      const attrs = createRuleSoAttributes({
        metadata: { name: 'rule', signature_id: 'sig', ownership: { managed: false } },
      });
      const result = transformRuleSoAttributesToRuleApiResponse('rule-id', attrs);
      expect(result.metadata.ownership).toEqual({ managed: false });
    });

    it('falls back to { managed: false } when stored ownership is absent (pre-migration)', () => {
      const attrs = createRuleSoAttributes({ metadata: { name: 'rule', signature_id: 'sig' } });
      delete (attrs.metadata as Record<string, unknown>).ownership;

      const result = transformRuleSoAttributesToRuleApiResponse('rule-id', attrs);

      expect(result.metadata.ownership).toEqual({ managed: false });
    });

    it('passes ruleResponseSchema parse for managed and unmanaged ownership', () => {
      const variants = [
        { managed: true as const, solution: 'security', domain: 'detection' },
        { managed: false as const },
        { managed: false as const, app: 'significantEvents' },
      ];
      for (const ownership of variants) {
        const attrs = createRuleSoAttributes({
          metadata: { name: 'rule', signature_id: 'sig', ownership },
        });
        const result = transformRuleSoAttributesToRuleApiResponse('rule-id', attrs);
        expect(() => ruleResponseSchema.parse(result)).not.toThrow();
      }
    });
  });

  describe('ruleResponseSchema rejects ownership in request body (step 4.4)', () => {
    it('createRuleDataSchema rejects ownership in metadata (response-only field)', () => {
      const result = createRuleDataSchema.safeParse({
        kind: 'alert',
        metadata: {
          name: 'test',
          // ownership is response-only; the strict metadataSchema must reject it
          ownership: { managed: false },
        },
        schedule: { every: '5m' },
        query: { format: 'standalone', breach: { query: 'FROM logs-* | LIMIT 1' } },
      });
      expect(result.success).toBe(false);
    });

    it('updateRuleDataSchema rejects ownership in metadata (response-only field)', () => {
      const result = updateRuleDataSchema.safeParse({
        metadata: { ownership: { managed: false } },
      });
      expect(result.success).toBe(false);
    });
  });

  // Step 4.2: metadata.revision is server-managed and response-only — the same
  // guarantee ownership gets above, pinned by a test beside the ownership ones.
  describe('ruleResponseSchema rejects revision in request body (step 4.2)', () => {
    it('createRuleDataSchema rejects revision in metadata (response-only field)', () => {
      const result = createRuleDataSchema.safeParse({
        kind: 'alert',
        metadata: {
          name: 'test',
          revision: 0,
        },
        schedule: { every: '5m' },
        query: { format: 'standalone', breach: { query: 'FROM logs-* | LIMIT 1' } },
      });
      expect(result.success).toBe(false);
    });

    it('updateRuleDataSchema rejects revision in metadata (response-only field)', () => {
      const result = updateRuleDataSchema.safeParse({
        metadata: { revision: 0 },
      });
      expect(result.success).toBe(false);
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
    references: [],
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
    expect(rotationFailedError('rule-1', 409, 'My rule').error.details).toEqual({
      name: 'My rule',
    });
    expect(
      toBulkError('rule-1', { statusCode: 409, message: 'x' }, 'My rule').error.details
    ).toEqual({ name: 'My rule' });
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

// ---------------------------------------------------------------------------
// Step 5.3: getManagedWriteOwner and managedRuleWriteError
// ---------------------------------------------------------------------------

describe('getManagedWriteOwner (step 5.3)', () => {
  const registry = new BuilderTypeRegistry();
  const managedType = {
    type: 'security.detection.query',
    name: 'Detection query',
    ownership: { solution: 'security', domain: 'detection' },
    builderFieldsSchema: {} as never,
    generateQuery: jest.fn(),
  };

  beforeEach(() => {
    jest.spyOn(registry, 'get').mockReturnValue(undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns undefined for an unmanaged stored rule', () => {
    expect(
      getManagedWriteOwner({
        registry,
        callerIdentity: undefined,
        storedOwnership: { managed: false },
        builderType: undefined,
      })
    ).toBeUndefined();
  });

  it('returns the owner when stored ownership says managed and caller has no identity', () => {
    expect(
      getManagedWriteOwner({
        registry,
        callerIdentity: undefined,
        storedOwnership: { managed: true, solution: 'security', domain: 'detection' },
        builderType: undefined,
      })
    ).toEqual({ solution: 'security', domain: 'detection' });
  });

  it('returns undefined when stored ownership says managed and caller solution matches', () => {
    expect(
      getManagedWriteOwner({
        registry,
        callerIdentity: { solution: 'security' },
        storedOwnership: { managed: true, solution: 'security', domain: 'detection' },
        builderType: undefined,
      })
    ).toBeUndefined();
  });

  it('returns the owner when stored ownership says managed and caller solution mismatches', () => {
    expect(
      getManagedWriteOwner({
        registry,
        callerIdentity: { solution: 'other' },
        storedOwnership: { managed: true, solution: 'security', domain: 'detection' },
        builderType: undefined,
      })
    ).toEqual({ solution: 'security', domain: 'detection' });
  });

  it('uses the registration when stored ownership is not managed', () => {
    jest.spyOn(registry, 'get').mockReturnValue(managedType as never);
    expect(
      getManagedWriteOwner({
        registry,
        callerIdentity: undefined,
        storedOwnership: { managed: false },
        builderType: 'security.detection.query',
      })
    ).toEqual({ solution: 'security', domain: 'detection' });
  });

  it('returns undefined when neither stored ownership nor registration says managed', () => {
    jest.spyOn(registry, 'get').mockReturnValue(undefined);
    expect(
      getManagedWriteOwner({
        registry,
        callerIdentity: undefined,
        storedOwnership: { managed: false },
        builderType: 'security.detection.query',
      })
    ).toBeUndefined();
  });
});

describe('managedRuleWriteError (step 5.3)', () => {
  it('builds a RULE_IS_MANAGED bulk error with solution/domain in the message', () => {
    const err = managedRuleWriteError('rule-1', 'security', 'detection');
    expect(err).toMatchObject({
      id: 'rule-1',
      error: {
        code: 'RULE_IS_MANAGED',
        message: expect.stringContaining('security'),
      },
    });
    expect(err.error.message).toContain('detection');
  });

  it('includes the rule name in error.details when provided', () => {
    const err = managedRuleWriteError('rule-1', 'security', 'detection', 'My detection rule');
    expect(err.error.details).toEqual({ name: 'My detection rule' });
  });

  it('omits error.details when no name is provided', () => {
    const err = managedRuleWriteError('rule-1', 'security', 'detection');
    expect(err.error.details).toBeUndefined();
  });
});
