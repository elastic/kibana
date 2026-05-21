/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Condition } from '@kbn/streamlang';
import type { WiredStream } from '../models/ingest/wired';
import { definitionToESQLQuery } from './definition_to_esql_query';

const createDraftDefinition = (
  overrides: Partial<{
    name: string;
    fields: WiredStream.Definition['ingest']['wired']['fields'];
    steps: WiredStream.Definition['ingest']['processing']['steps'];
  }> = {}
): WiredStream.Definition => ({
  type: 'wired',
  name: overrides.name ?? 'logs.otel.nginx',
  description: 'Draft stream',
  updated_at: '2025-01-01T00:00:00.000Z',
  ingest: {
    lifecycle: { dsl: {} },
    processing: { steps: overrides.steps ?? [], updated_at: '2025-01-01T00:00:00.000Z' },
    settings: {},
    wired: {
      fields: overrides.fields ?? {},
      routing: [],
      draft: true,
    },
    failure_store: { lifecycle: { enabled: { data_retention: '30d' } } },
  },
});

const eqCondition: Condition = { field: 'service.name', eq: 'nginx' };
const andCondition: Condition = {
  and: [
    { field: 'service.name', eq: 'nginx' },
    { field: 'log.level', eq: 'error' },
  ],
};
const alwaysCondition: Condition = { always: {} };

describe('definitionToESQLQuery', () => {
  describe('basic query structure', () => {
    it('generates FROM parent view with METADATA _source and WHERE clause', async () => {
      const result = await definitionToESQLQuery({
        definition: createDraftDefinition(),
        routingCondition: eqCondition,
      });
      expect(result).toBe(
        [
          'FROM $.logs.otel METADATA _source',
          '| WHERE COALESCE(`service.name` == "nginx", FALSE)',
        ].join('\n')
      );
    });

    it('omits WHERE clause for always conditions', async () => {
      const result = await definitionToESQLQuery({
        definition: createDraftDefinition(),
        routingCondition: alwaysCondition,
      });
      expect(result).toBe('FROM $.logs.otel METADATA _source');
    });

    it('supports compound AND routing conditions', async () => {
      const result = await definitionToESQLQuery({
        definition: createDraftDefinition(),
        routingCondition: andCondition,
      });
      expect(result).toBe(
        [
          'FROM $.logs.otel METADATA _source',
          '| WHERE COALESCE(`service.name` == "nginx", FALSE) AND COALESCE(`log.level` == "error", FALSE)',
        ].join('\n')
      );
    });

    it('does not include SET directives (not supported in view definitions)', async () => {
      const result = await definitionToESQLQuery({
        definition: createDraftDefinition(),
        routingCondition: eqCondition,
      });
      expect(result).not.toContain('SET');
    });
  });

  describe('parent resolution', () => {
    it('derives parent view from stream name hierarchy', async () => {
      const result = await definitionToESQLQuery({
        definition: createDraftDefinition({ name: 'logs.otel.nginx.access' }),
        routingCondition: eqCondition,
      });
      expect(result).toBe(
        [
          'FROM $.logs.otel.nginx METADATA _source',
          '| WHERE COALESCE(`service.name` == "nginx", FALSE)',
        ].join('\n')
      );
    });

    it('throws for root streams which have no parent', async () => {
      await expect(
        definitionToESQLQuery({
          definition: createDraftDefinition({ name: 'logs.otel' }),
          routingCondition: eqCondition,
        })
      ).rejects.toThrow('must have a parent stream');
    });
  });

  describe('processing steps', () => {
    it('includes transpiled processing commands when steps are present', async () => {
      const result = await definitionToESQLQuery({
        definition: createDraftDefinition({
          steps: [{ action: 'rename', from: 'old_field', to: 'new_field' }],
        }),
        routingCondition: eqCondition,
      });
      expect(result).toBe(
        [
          'FROM $.logs.otel METADATA _source',
          '| WHERE COALESCE(`service.name` == "nginx", FALSE)',
          '| WHERE NOT(old_field IS NULL)',
          '  | WHERE new_field IS NULL',
          '  | EVAL new_field = old_field',
          '  | DROP old_field',
        ].join('\n')
      );
    });

    it('pre-casts own fields before processing to prevent type mismatches', async () => {
      const result = await definitionToESQLQuery({
        definition: createDraftDefinition({
          steps: [{ action: 'set', to: 'attributes.flag', value: 'true' }],
          fields: { 'attributes.flag': { type: 'boolean' } },
        }),
        routingCondition: eqCondition,
      });
      const lines = result.split('\n');
      const preCastIdx = lines.findIndex((l) => l.includes('TO_BOOLEAN(`attributes.flag`)'));
      expect(preCastIdx).not.toBe(-1);
      expect(preCastIdx).toBeLessThan(
        lines.findIndex((l, i) => i > preCastIdx && l.includes('attributes.flag'))
      );
    });

    it('produces only FROM + WHERE when steps are empty', async () => {
      const result = await definitionToESQLQuery({
        definition: createDraftDefinition({ steps: [] }),
        routingCondition: eqCondition,
      });
      expect(result).toBe(
        [
          'FROM $.logs.otel METADATA _source',
          '| WHERE COALESCE(`service.name` == "nginx", FALSE)',
        ].join('\n')
      );
    });

    it('does not duplicate own-field casts when steps are empty', async () => {
      const result = await definitionToESQLQuery({
        definition: createDraftDefinition({
          steps: [],
          fields: { 'attributes.flag': { type: 'boolean' } },
        }),
        routingCondition: eqCondition,
      });
      const castCount = (result.match(/TO_BOOLEAN/g) || []).length;
      expect(castCount).toBe(1);
    });
  });

  describe('includeProcessing: false', () => {
    it('omits processing steps and own-field casts to avoid polluting simulation samples', async () => {
      const result = await definitionToESQLQuery({
        definition: createDraftDefinition({
          steps: [{ action: 'rename', from: 'old_field', to: 'new_field' }],
          fields: { status_code: { type: 'long' } },
        }),
        routingCondition: eqCondition,
        includeProcessing: false,
      });
      expect(result).toBe(
        [
          'FROM $.logs.otel METADATA _source',
          '| WHERE COALESCE(`service.name` == "nginx", FALSE)',
        ].join('\n')
      );
      expect(result).not.toContain('RENAME');
      expect(result).not.toContain('old_field');
      expect(result).not.toContain('TO_LONG');
    });

    it('casts all inherited non-keyword fields before routing and processing', async () => {
      const result = await definitionToESQLQuery({
        definition: createDraftDefinition({
          steps: [{ action: 'rename', from: 'old_field', to: 'new_field' }],
        }),
        routingCondition: { field: 'attributes.secure', eq: 'true' },
        inheritedFields: {
          'attributes.secure': { type: 'boolean' },
          http_status: { type: 'long' },
          message: { type: 'keyword' },
        },
        includeProcessing: false,
      });
      expect(result).toContain('EVAL `attributes.secure` = TO_BOOLEAN(`attributes.secure`)');
      expect(result).toContain('TO_LONG(http_status)');
      expect(result).not.toContain('TO_STRING');
      expect(result).toContain('WHERE');
      expect(result).not.toContain('RENAME');
    });

    it('omits own-field casts even when routing is always', async () => {
      const result = await definitionToESQLQuery({
        definition: createDraftDefinition({
          steps: [{ action: 'rename', from: 'old_field', to: 'new_field' }],
          fields: { status_code: { type: 'long' } },
        }),
        routingCondition: alwaysCondition,
        includeProcessing: false,
      });
      expect(result).toBe('FROM $.logs.otel METADATA _source');
      expect(result).not.toContain('RENAME');
      expect(result).not.toContain('TO_LONG');
    });
  });
});
