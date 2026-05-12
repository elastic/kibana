/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isRight } from 'fp-ts/Either';
import {
  esqlCustomIndicatorSchema,
  esqlCustomIndicatorTypeSchema,
  indicatorSchema,
  indicatorTypesSchema,
} from './indicators';

describe('ESQL Custom Indicator', () => {
  describe('esqlCustomIndicatorTypeSchema', () => {
    it('validates the correct type literal', () => {
      expect(isRight(esqlCustomIndicatorTypeSchema.decode('sli.esql.custom'))).toBe(true);
    });

    it('rejects invalid type literals', () => {
      expect(isRight(esqlCustomIndicatorTypeSchema.decode('sli.kql.custom'))).toBe(false);
      expect(isRight(esqlCustomIndicatorTypeSchema.decode('sli.esql'))).toBe(false);
    });
  });

  describe('esqlCustomIndicatorSchema', () => {
    it('validates a valid ESQL indicator with required fields', () => {
      const indicator = {
        type: 'sli.esql.custom',
        params: {
          esqlQuery:
            'FROM logs-* | STATS numerator = COUNT(*) WHERE status = 200, denominator = COUNT(*) BY @timestamp = BUCKET(@timestamp, 1m)',
        },
      };
      expect(isRight(esqlCustomIndicatorSchema.decode(indicator))).toBe(true);
    });

    it('validates a valid ESQL indicator with groupBy', () => {
      const indicator = {
        type: 'sli.esql.custom',
        params: {
          esqlQuery:
            'FROM logs-* | STATS numerator = COUNT(*) WHERE status = 200, denominator = COUNT(*) BY @timestamp = BUCKET(@timestamp, 1m), host.name',
          groupBy: ['host.name'],
        },
      };
      expect(isRight(esqlCustomIndicatorSchema.decode(indicator))).toBe(true);
    });

    it('rejects an indicator missing esqlQuery', () => {
      const indicator = {
        type: 'sli.esql.custom',
        params: {},
      };
      expect(isRight(esqlCustomIndicatorSchema.decode(indicator))).toBe(false);
    });

    it('rejects an indicator with wrong type', () => {
      const indicator = {
        type: 'sli.kql.custom',
        params: {
          esqlQuery: 'FROM logs-*',
        },
      };
      expect(isRight(esqlCustomIndicatorSchema.decode(indicator))).toBe(false);
    });
  });

  describe('indicatorTypesSchema', () => {
    it('includes sli.esql.custom as a valid indicator type', () => {
      expect(isRight(indicatorTypesSchema.decode('sli.esql.custom'))).toBe(true);
    });
  });

  describe('indicatorSchema', () => {
    it('validates an ESQL custom indicator within the union', () => {
      const indicator = {
        type: 'sli.esql.custom',
        params: {
          esqlQuery: 'FROM logs-* | STATS n = COUNT(*) BY @timestamp = BUCKET(@timestamp, 1m)',
        },
      };
      expect(isRight(indicatorSchema.decode(indicator))).toBe(true);
    });
  });
});
