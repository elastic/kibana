/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import {
  ruleParamsSchemaWithRuleTypeId,
  ruleParamsSchemaWithRuleTypeIdForUpdate,
  RULE_TYPE_ID,
  ALERT_TYPE_ID,
} from './v1';

describe('rule params schemas', () => {
  describe('ruleParamsSchemaWithRuleTypeId', () => {
    it('validates correctly for rule_type_id', () => {
      const s = ruleParamsSchemaWithRuleTypeId(RULE_TYPE_ID);
      expect(() =>
        s.validate({
          [RULE_TYPE_ID]: '.es-query',
          params: {
            searchType: 'searchSource',
            threshold: [0],
            thresholdComparator: '>',
            size: 100,
            timeWindowUnit: 'm',
            timeWindowSize: 5,
          },
        })
      ).not.toThrow();
    });

    it('validates correctly for alertTypeId', () => {
      const s = ruleParamsSchemaWithRuleTypeId(ALERT_TYPE_ID);
      expect(() =>
        s.validate({
          [ALERT_TYPE_ID]: '.es-query',
          params: {
            searchType: 'searchSource',
            threshold: [0],
            thresholdComparator: '>',
            size: 100,
            timeWindowUnit: 'm',
            timeWindowSize: 5,
          },
        })
      ).not.toThrow();
    });

    it('throws when key does not match', () => {
      expect(() =>
        ruleParamsSchemaWithRuleTypeId(RULE_TYPE_ID).validate({
          [ALERT_TYPE_ID]: '.es-query',
          params: {},
        })
      ).toThrow(`[${RULE_TYPE_ID}]: expected at least one defined value`);
    });

    it('throws when no key', () => {
      expect(() =>
        ruleParamsSchemaWithRuleTypeId().validate({
          params: {},
        })
      ).toThrow(`[${RULE_TYPE_ID}]: expected at least one defined value`);
    });

    it('throws when rule_type_id is unknown', () => {
      const s = ruleParamsSchemaWithRuleTypeId();
      expect(() => s.validate({ [RULE_TYPE_ID]: 'unknown', params: {} })).toThrowError('');
    });

    it('throws error when params missing required fields', () => {
      const payload = {
        [RULE_TYPE_ID]: '.es-query',
        params: {
          searchType: 'searchSource',
          threshold: [0],
          thresholdComparator: '>',
          size: 100,
          timeWindowUnit: 'm',
        },
      };

      expect(() => ruleParamsSchemaWithRuleTypeId().validate(payload)).toThrowError(
        `[params.timeWindowSize]: expected value of type [number] but got [undefined]`
      );
    });

    it('throws error when invalid params', () => {
      const payload = {
        [RULE_TYPE_ID]: '.es-query',
        params: {
          searchType: 'searchSource',
          threshold: [0],
          thresholdComparator: '>',
          size: 100,
          timeWindowUnit: 'm',
          timeWindowSize: 5,
          foo: 'bar',
        },
      };

      expect(() => ruleParamsSchemaWithRuleTypeId().validate(payload)).toThrowError(
        `[params.foo]: definition for this key is missing`
      );
    });
  });

  describe('ruleParamsSchemaWithRuleTypeIdForUpdate', () => {
    it('validates schema correctly', () => {
      expect(() =>
        ruleParamsSchemaWithRuleTypeIdForUpdate.validate({
          searchType: 'searchSource',
          threshold: [0],
          thresholdComparator: '>',
          size: 100,
          timeWindowUnit: 'm',
          timeWindowSize: 5,
        })
      ).not.toThrow();
    });

    it('rejects an object that does not match any of the allowed update schemas', () => {
      expect(() =>
        ruleParamsSchemaWithRuleTypeIdForUpdate.validate({
          searchType: 'searchSource',
          threshold: [0],
          thresholdComparator: '>',
          size: 100,
          timeWindowUnit: 'm',
          timeWindowSize: 5,
          foo: 'bar',
        })
      ).toThrow();
    });
  });
});
