/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { validateEcsField, validateOsqueryResultField } from './ecs_mapping_validations';

describe('ECS mapping validations', () => {
  describe('validateEcsField', () => {
    it('returns undefined when both ECS key and result value are set', () => {
      expect(validateEcsField('host.os.platform', 'platform')).toBeUndefined();
    });

    it('returns undefined when neither ECS key nor result value is set', () => {
      expect(validateEcsField('', '')).toBeUndefined();
      expect(validateEcsField(undefined, undefined)).toBeUndefined();
    });

    it('returns undefined when ECS key is set but result value is empty', () => {
      expect(validateEcsField('host.os.platform', '')).toBeUndefined();
      expect(validateEcsField('host.os.platform', undefined)).toBeUndefined();
    });

    it('returns error when result value is set but ECS key is empty', () => {
      const result = validateEcsField('', 'platform');
      expect(result).toBe('ECS field is required.');
    });

    it('returns error when result value is an array and ECS key is empty', () => {
      const result = validateEcsField('', ['platform', 'name']);
      expect(result).toBe('ECS field is required.');
    });

    it('returns error when result value exists and ECS key is undefined', () => {
      const result = validateEcsField(undefined, 'platform');
      expect(result).toBe('ECS field is required.');
    });
  });

  describe('validateOsqueryResultField', () => {
    it('returns undefined when both result value and ECS key are set', () => {
      expect(validateOsqueryResultField('platform', 'host.os.platform')).toBeUndefined();
    });

    it('returns undefined when neither result value nor ECS key is set', () => {
      expect(validateOsqueryResultField('', '')).toBeUndefined();
      expect(validateOsqueryResultField(undefined, undefined)).toBeUndefined();
    });

    it('returns undefined when result value is set but ECS key is empty', () => {
      expect(validateOsqueryResultField('platform', '')).toBeUndefined();
      expect(validateOsqueryResultField('platform', undefined)).toBeUndefined();
    });

    it('returns error when ECS key is set but result value is empty', () => {
      const result = validateOsqueryResultField('', 'host.os.platform');
      expect(result).toBe('Value field is required.');
    });

    it('returns error when ECS key is set but result value is undefined', () => {
      const result = validateOsqueryResultField(undefined, 'host.os.platform');
      expect(result).toBe('Value field is required.');
    });

    it('returns error when ECS key exists and result value is empty array', () => {
      const result = validateOsqueryResultField([], 'host.os.platform');
      expect(result).toBe('Value field is required.');
    });
  });
});
