/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  convertLegacyEsqlToolFieldType,
  convertLegacyEsqlToolParamDefaultValue,
  isLegacyEsqlToolConfig,
} from './esql_legacy';
import {
  EsqlToolFieldType,
  ESQL_CONFIG_SCHEMA_VERSION,
} from '@kbn/agent-builder-common/tools/types/esql';

describe('esql_legacy', () => {
  describe('convertLegacyEsqlToolFieldType', () => {
    it.each([
      ['text', EsqlToolFieldType.STRING],
      ['keyword', EsqlToolFieldType.STRING],
      ['object', EsqlToolFieldType.STRING],
      ['nested', EsqlToolFieldType.STRING],
      ['long', EsqlToolFieldType.INTEGER],
      ['integer', EsqlToolFieldType.INTEGER],
      ['double', EsqlToolFieldType.FLOAT],
      ['float', EsqlToolFieldType.FLOAT],
      ['boolean', EsqlToolFieldType.BOOLEAN],
      ['date', EsqlToolFieldType.DATE],
    ])('maps %s to %s', (legacyType, expectedType) => {
      expect(convertLegacyEsqlToolFieldType(legacyType as any)).toBe(expectedType);
    });
  });

  describe('convertLegacyEsqlToolParamDefaultValue', () => {
    it.each([
      ['text', 'hello'],
      ['keyword', 'world'],
      ['long', 42],
      ['integer', 7],
      ['double', 1.25],
      ['float', 2.5],
      ['boolean', true],
      ['date', '2024-01-01T00:00:00.000Z'],
    ])('keeps default value for %s', (legacyType, legacyDefaultValue) => {
      expect(convertLegacyEsqlToolParamDefaultValue(legacyType as any, legacyDefaultValue)).toBe(
        legacyDefaultValue
      );
    });

    it('stringifies object default values', () => {
      expect(convertLegacyEsqlToolParamDefaultValue('object', { foo: 'bar' })).toBe(
        JSON.stringify({ foo: 'bar' })
      );
    });

    it('stringifies nested default values', () => {
      expect(convertLegacyEsqlToolParamDefaultValue('nested', [{ foo: 'bar' }])).toBe(
        JSON.stringify([{ foo: 'bar' }])
      );
    });

    it('returns undefined when default value is missing', () => {
      expect(convertLegacyEsqlToolParamDefaultValue('text', undefined)).toBeUndefined();
    });
  });

  describe('isLegacyEsqlToolConfig', () => {
    it('treats undefined schema_version as legacy', () => {
      expect(isLegacyEsqlToolConfig({ schema_version: undefined } as any)).toBe(true);
    });

    it('treats missing schema_version as legacy', () => {
      expect(isLegacyEsqlToolConfig({} as any)).toBe(true);
    });

    it('treats numeric schema_version as non-legacy', () => {
      expect(isLegacyEsqlToolConfig({ schema_version: 0 } as any)).toBe(false);
      expect(isLegacyEsqlToolConfig({ schema_version: ESQL_CONFIG_SCHEMA_VERSION } as any)).toBe(
        false
      );
    });
  });
});
