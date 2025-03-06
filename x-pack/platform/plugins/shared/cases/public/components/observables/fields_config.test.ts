/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { normalizeValueType, fieldsConfig } from './fields_config';
import { OBSERVABLE_TYPE_DOMAIN } from '../../../common/constants';

describe('fields_config.ts', () => {
  describe('normalizeValueType', () => {
    it('should return the correct value type if it exists', () => {
      expect(normalizeValueType(OBSERVABLE_TYPE_DOMAIN.key)).toEqual(OBSERVABLE_TYPE_DOMAIN.key);
    });

    it('should return "generic" if value type does not exist', () => {
      expect(normalizeValueType('nonExistentKey')).toEqual('generic');
    });
  });

  describe('fieldsConfig', () => {
    it('should have correct default values for type key validation', () => {
      const typeKeyValidations = fieldsConfig.typeKey.validations;

      expect(typeKeyValidations.length).toBe(1);
      expect(typeKeyValidations[0].validator).toBeDefined();
    });

    it('should have observable value field types defined', () => {
      const valueConfigs = fieldsConfig.value;

      expect(Object.keys(valueConfigs).length).toBeGreaterThan(0);
    });
  });
});
