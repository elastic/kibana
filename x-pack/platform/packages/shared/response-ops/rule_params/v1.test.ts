/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type ObjectType, schema } from '@kbn/config-schema';
import {
  ruleParamsSchemasForCreate,
  ruleParamsSchema,
  ruleParamsSchemaWithDefaultValue,
  ruleParamsSchemaForUpdate,
  RULE_TYPE_ID,
} from './v1';

const buildDiscriminatedUnion = (baseFields: Record<string, unknown> = {}) =>
  schema.discriminatedUnion(
    RULE_TYPE_ID,
    ruleParamsSchemasForCreate(baseFields as Record<string, never>) as [ObjectType<any>]
  );

describe('rule params schemas', () => {
  describe('ruleParamsSchemasForCreate', () => {
    it('validates correctly when rule_type_id and matching params are provided', () => {
      expect(() =>
        buildDiscriminatedUnion().validate({
          [RULE_TYPE_ID]: '.es-query',
          params: {
            searchType: 'searchSource',
            searchConfiguration: {},
            threshold: [0],
            thresholdComparator: '>',
            size: 100,
            timeWindowUnit: 'm',
            timeWindowSize: 5,
          },
        })
      ).not.toThrow();
    });

    it('throws when rule_type_id is missing', () => {
      expect(() =>
        buildDiscriminatedUnion().validate({
          params: { searchType: 'searchSource' },
        })
      ).toThrowError(`"rule_type_id" property is required`);
    });

    it('throws when rule_type_id is unknown', () => {
      expect(() =>
        buildDiscriminatedUnion().validate({ [RULE_TYPE_ID]: 'unknown', params: {} })
      ).toThrowError(/expected "rule_type_id" to be one of/);
    });

    it('throws when params are missing required fields for the matched rule type', () => {
      expect(() =>
        buildDiscriminatedUnion().validate({
          [RULE_TYPE_ID]: '.es-query',
          params: {
            searchType: 'searchSource',
            searchConfiguration: {},
            threshold: [0],
            thresholdComparator: '>',
            size: 100,
            timeWindowUnit: 'm',
          },
        })
      ).toThrowError(
        `[params.timeWindowSize]: expected value of type [number] but got [undefined]`
      );
    });

    it('throws when params contain unexpected fields for the matched rule type', () => {
      expect(() =>
        buildDiscriminatedUnion().validate({
          [RULE_TYPE_ID]: '.index-threshold',
          params: {
            index: 'my-index',
            timeField: '@timestamp',
            threshold: [0],
            thresholdComparator: '>',
            timeWindowUnit: 'm',
            timeWindowSize: 5,
            foo: 'bar',
          },
        })
      ).toThrowError(`Additional properties are not allowed`);
    });

    it('rejects params that are valid for a different rule type', () => {
      expect(() =>
        buildDiscriminatedUnion().validate({
          [RULE_TYPE_ID]: '.index-threshold',
          params: {
            searchType: 'searchSource',
            threshold: [0],
            thresholdComparator: '>',
            size: 100,
            timeWindowUnit: 'm',
            timeWindowSize: 5,
          },
        })
      ).toThrowError(`[params.index]: expected at least one defined value but got [undefined]`);
    });

    it('includes common base fields in every variant', () => {
      const baseFields = { name: schema.string() };
      const variants = ruleParamsSchemasForCreate(baseFields);

      for (const variant of variants) {
        expect(variant.getPropSchemas()).toHaveProperty('name');
        expect(variant.getPropSchemas()).toHaveProperty(RULE_TYPE_ID);
        expect(variant.getPropSchemas()).toHaveProperty('params');
      }
    });
  });

  describe('ruleParamsSchemaForUpdate', () => {
    it('validates schema correctly', () => {
      expect(() =>
        ruleParamsSchemaForUpdate.validate({
          searchType: 'searchSource',
          threshold: [0],
          thresholdComparator: '>',
          size: 100,
          timeWindowUnit: 'm',
          timeWindowSize: 5,
        })
      ).not.toThrow();
    });

    it('accepts an empty object as default params via the permissive fallback', () => {
      expect(() => ruleParamsSchemaForUpdate.validate({})).not.toThrow();
    });
  });

  describe('ruleParamsSchema', () => {
    it('validates schema correctly', () => {
      expect(() =>
        ruleParamsSchema.validate({
          searchType: 'searchSource',
          threshold: [0],
          thresholdComparator: '>',
          size: 100,
          timeWindowUnit: 'm',
          timeWindowSize: 5,
        })
      ).not.toThrow();
    });
  });

  describe('ruleParamsSchemaWithDefaultValue', () => {
    it('accepts an empty object as the default value', () => {
      expect(() => ruleParamsSchemaWithDefaultValue.validate({})).not.toThrow();
    });

    it('validates correctly with valid params', () => {
      expect(() =>
        ruleParamsSchemaWithDefaultValue.validate({
          searchType: 'searchSource',
          threshold: [0],
          thresholdComparator: '>',
          size: 100,
          timeWindowUnit: 'm',
          timeWindowSize: 5,
        })
      ).not.toThrow();
    });
  });
});
