/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { exportRequestBodySchema } from './export_request_body_schema';

describe('exportRequestBodySchema', () => {
  describe('accepts', () => {
    it('null body', () => {
      expect(() => exportRequestBodySchema.validate(null)).not.toThrow();
    });

    it('empty object', () => {
      expect(() => exportRequestBodySchema.validate({})).not.toThrow();
    });

    it('kuery only', () => {
      expect(() => exportRequestBodySchema.validate({ kuery: 'osquery.pid > 1000' })).not.toThrow();
    });

    it('agentIds only', () => {
      expect(() =>
        exportRequestBodySchema.validate({ agentIds: ['agent-1', 'agent-2'] })
      ).not.toThrow();
    });

    it('esFilters with meta only', () => {
      expect(() =>
        exportRequestBodySchema.validate({
          esFilters: [{ meta: { alias: 'host filter', negate: false, disabled: false } }],
        })
      ).not.toThrow();
    });

    it('esFilters with meta and query (well-formed Filter shape)', () => {
      expect(() =>
        exportRequestBodySchema.validate({
          esFilters: [
            {
              meta: { alias: 'h1', negate: false, disabled: false, type: 'phrase' },
              query: { match_phrase: { 'host.name': 'h1' } },
            },
          ],
        })
      ).not.toThrow();
    });

    it('esFilters with unknown properties alongside meta/query (passthrough)', () => {
      expect(() =>
        exportRequestBodySchema.validate({
          esFilters: [
            {
              meta: {},
              query: {},
              $state: { store: 'appState' },
            },
          ],
        })
      ).not.toThrow();
    });

    it('all three fields together', () => {
      expect(() =>
        exportRequestBodySchema.validate({
          kuery: 'osquery.name: kibana',
          agentIds: ['agent-1'],
          esFilters: [{ meta: {}, query: { match_all: {} } }],
        })
      ).not.toThrow();
    });
  });

  describe('rejects', () => {
    it('esFilters entry that is a string, not an object', () => {
      expect(() => exportRequestBodySchema.validate({ esFilters: ['not-an-object'] })).toThrow(
        /esFilters/
      );
    });

    it('esFilters entry that is a number', () => {
      expect(() => exportRequestBodySchema.validate({ esFilters: [42] })).toThrow(/esFilters/);
    });

    it('esFilters entry where meta is a string', () => {
      expect(() =>
        exportRequestBodySchema.validate({ esFilters: [{ meta: 'not-an-object' }] })
      ).toThrow(/meta/);
    });

    it('esFilters entry where query is a string', () => {
      expect(() =>
        exportRequestBodySchema.validate({
          esFilters: [{ meta: {}, query: 'not-an-object' }],
        })
      ).toThrow(/query/);
    });

    it('agentIds containing a non-string value', () => {
      expect(() => exportRequestBodySchema.validate({ agentIds: [123] })).toThrow(/agentIds/);
    });

    it('kuery that is not a string', () => {
      expect(() => exportRequestBodySchema.validate({ kuery: 42 })).toThrow(/kuery/);
    });
  });
});
