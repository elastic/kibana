/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataViewBase, EsQueryConfig } from '@kbn/es-query';
import { resolveScope } from './resolve_scope';

const esQueryConfig: EsQueryConfig = {
  allowLeadingWildcards: true,
  queryStringOptions: {},
  ignoreFilterIfFieldNotInIndex: false,
  dateFormatTZ: 'UTC',
};

const indexPattern: DataViewBase = {
  fields: [],
  title: '.alerts-*',
};

const errorPrefix = 'Error validating test data';

describe('resolveScope', () => {
  describe('alerting v1', () => {
    it('resolves enabled=false to an empty object', () => {
      const result = resolveScope({
        scope: { alerting: { enabled: false } },
        esQueryConfig,
        indexPattern,
        errorPrefix,
      });
      expect(result).toEqual({});
    });

    it('resolves enabled=true with no kql and no filters to { alerting: { enabled: true } }', () => {
      const result = resolveScope({
        scope: { alerting: { enabled: true } },
        esQueryConfig,
        indexPattern,
        errorPrefix,
      });
      expect(result).toEqual({ alerting: { enabled: true } });
    });

    it('resolves enabled=true with a valid kql to an object with kql and dsl', () => {
      const result = resolveScope({
        scope: { alerting: { enabled: true, kql: 'kibana.alert.rule.name: "x"', filters: [] } },
        esQueryConfig,
        indexPattern,
        errorPrefix,
      });
      expect(result.alerting).toMatchObject({ enabled: true, kql: 'kibana.alert.rule.name: "x"' });
      expect(typeof result.alerting?.dsl).toBe('string');
    });

    it('throws a 400 Boom with attributes.scopeErrors[0].scope === "alerting" for invalid KQL', () => {
      expect(() =>
        resolveScope({
          scope: { alerting: { enabled: true, kql: 'invalid_kql:', filters: [] } },
          esQueryConfig,
          indexPattern,
          errorPrefix,
        })
      ).toThrow(
        expect.objectContaining({
          isBoom: true,
          output: expect.objectContaining({
            statusCode: 400,
            payload: expect.objectContaining({
              attributes: expect.objectContaining({
                scopeErrors: expect.arrayContaining([
                  expect.objectContaining({ scope: 'alerting' }),
                ]),
              }),
            }),
          }),
        })
      );
    });
  });

  describe('alertingV2', () => {
    it('resolves enabled=false to an empty object', () => {
      const result = resolveScope({
        scope: { alertingV2: { enabled: false } },
        esQueryConfig,
        indexPattern,
        errorPrefix,
      });
      expect(result).toEqual({});
    });

    it('resolves enabled=true with no kql to { alertingV2: { enabled: true } }', () => {
      const result = resolveScope({
        scope: { alertingV2: { enabled: true } },
        esQueryConfig,
        indexPattern,
        errorPrefix,
      });
      expect(result).toEqual({ alertingV2: { enabled: true } });
    });

    it('resolves enabled=true with a valid kql', () => {
      const result = resolveScope({
        scope: { alertingV2: { enabled: true, kql: 'kibana.alert.rule.name: "x"' } },
        esQueryConfig,
        indexPattern,
        errorPrefix,
      });
      expect(result).toEqual({
        alertingV2: { enabled: true, kql: 'kibana.alert.rule.name: "x"' },
      });
    });

    it('throws a 400 Boom with attributes.scopeErrors[0].scope === "alertingV2" for invalid KQL', () => {
      expect(() =>
        resolveScope({
          scope: { alertingV2: { enabled: true, kql: 'invalid_kql:' } },
          esQueryConfig,
          indexPattern,
          errorPrefix,
        })
      ).toThrow(
        expect.objectContaining({
          isBoom: true,
          output: expect.objectContaining({
            statusCode: 400,
            payload: expect.objectContaining({
              attributes: expect.objectContaining({
                scopeErrors: expect.arrayContaining([
                  expect.objectContaining({ scope: 'alertingV2' }),
                ]),
              }),
            }),
          }),
        })
      );
    });
  });

  describe('both scopes', () => {
    it('short-circuits on alerting (v1) when both scopes have invalid KQL', () => {
      // First failure wins — scope returned in attributes is 'alerting', not 'alertingV2'.
      let thrown: unknown;
      try {
        resolveScope({
          scope: {
            alerting: { enabled: true, kql: 'invalid_kql:', filters: [] },
            alertingV2: { enabled: true, kql: 'also_invalid:' },
          },
          esQueryConfig,
          indexPattern,
          errorPrefix,
        });
      } catch (e) {
        thrown = e;
      }
      expect(thrown).toMatchObject({
        isBoom: true,
        output: {
          statusCode: 400,
          payload: {
            attributes: {
              scopeErrors: [expect.objectContaining({ scope: 'alerting' })],
            },
          },
        },
      });
    });
  });
});
