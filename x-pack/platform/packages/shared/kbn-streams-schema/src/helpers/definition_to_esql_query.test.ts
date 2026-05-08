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
    it('generates FROM parent view and WHERE clause', async () => {
      const result = await definitionToESQLQuery({
        definition: createDraftDefinition(),
        routingCondition: eqCondition,
      });
      expect(result).toBe(
        ['FROM $.logs.otel', '| WHERE COALESCE(`service.name` == "nginx", FALSE)'].join('\n')
      );
    });

    it('omits WHERE clause for always conditions', async () => {
      const result = await definitionToESQLQuery({
        definition: createDraftDefinition(),
        routingCondition: alwaysCondition,
      });
      expect(result).toBe('FROM $.logs.otel');
    });

    it('supports compound AND routing conditions', async () => {
      const result = await definitionToESQLQuery({
        definition: createDraftDefinition(),
        routingCondition: andCondition,
      });
      expect(result).toBe(
        [
          'FROM $.logs.otel',
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
        ['FROM $.logs.otel.nginx', '| WHERE COALESCE(`service.name` == "nginx", FALSE)'].join('\n')
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
          'FROM $.logs.otel',
          '| WHERE COALESCE(`service.name` == "nginx", FALSE)',
          '| WHERE NOT(old_field IS NULL)',
          '  | WHERE new_field IS NULL',
          '  | EVAL new_field = old_field',
          '  | DROP old_field',
        ].join('\n')
      );
    });

    it('produces only FROM + WHERE when steps are empty', async () => {
      const result = await definitionToESQLQuery({
        definition: createDraftDefinition({ steps: [] }),
        routingCondition: eqCondition,
      });
      expect(result).toBe(
        ['FROM $.logs.otel', '| WHERE COALESCE(`service.name` == "nginx", FALSE)'].join('\n')
      );
    });
  });
});
