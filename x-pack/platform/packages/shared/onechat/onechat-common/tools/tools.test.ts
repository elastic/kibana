/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  isPlainToolIdentifier,
  isStructuredToolIdentifier,
  isSerializedToolIdentifier,
  createBuiltinToolId,
  toStructuredToolIdentifier,
  toSerializedToolIdentifier,
  builtinToolProviderId,
  unknownToolProviderId,
  StructuredToolIdentifier,
} from './tools';

describe('Tool Identifier utilities', () => {
  describe('isPlainToolIdentifier', () => {
    it('should return true for a plain string identifier', () => {
      expect(isPlainToolIdentifier('my-tool')).toBe(true);
    });

    it('should return false for an unstructured identifier', () => {
      expect(isPlainToolIdentifier('built_in::my-tool')).toBe(false);
    });

    it('should return false for a structured identifier', () => {
      expect(
        isPlainToolIdentifier({
          toolId: 'my-tool',
          providerId: builtinToolProviderId,
        })
      ).toBe(false);
    });
  });

  describe('isStructuredToolIdentifier', () => {
    it('should return true for a valid structured identifier', () => {
      const structuredId: StructuredToolIdentifier = {
        toolId: 'my-tool',
        providerId: builtinToolProviderId,
      };
      expect(isStructuredToolIdentifier(structuredId)).toBe(true);
    });

    it('should return false for a plain string identifier', () => {
      expect(isStructuredToolIdentifier('my-tool')).toBe(false);
    });

    it('should return false for an unstructured identifier', () => {
      expect(isStructuredToolIdentifier('built_in::my-tool')).toBe(false);
    });
  });

  describe('isSerializedToolIdentifier', () => {
    it('should return true for a valid serialized identifier', () => {
      expect(isSerializedToolIdentifier('built_in::my-tool')).toBe(true);
    });

    it('should return false for a plain string identifier', () => {
      expect(isSerializedToolIdentifier('my-tool')).toBe(false);
    });

    it('should return false for a structured identifier', () => {
      expect(
        isSerializedToolIdentifier({
          toolId: 'my-tool',
          providerId: builtinToolProviderId,
        })
      ).toBe(false);
    });
  });

  describe('builtinToolId', () => {
    it('should create a structured identifier for a builtIn tool', () => {
      const result = createBuiltinToolId('my-tool');
      expect(result).toEqual({
        toolId: 'my-tool',
        providerId: builtinToolProviderId,
      });
    });
  });

  describe('toSerializedToolIdentifier', () => {
    it('should return the same string for a serialized identifier', () => {
      const serializedId = 'built_in::my-tool';
      expect(toSerializedToolIdentifier(serializedId)).toBe(serializedId);
    });

    it('should convert a structured identifier to serialized format', () => {
      const structuredId = {
        toolId: 'my-tool',
        providerId: builtinToolProviderId,
      };
      expect(toSerializedToolIdentifier(structuredId)).toBe(`${builtinToolProviderId}::my-tool`);
    });

    it('should convert a plain identifier to serialized format with unknown source', () => {
      expect(toSerializedToolIdentifier('my-tool')).toBe(`${unknownToolProviderId}::my-tool`);
    });

    it('should throw an error for malformed identifiers', () => {
      expect(() => toSerializedToolIdentifier('invalid::tool::format')).toThrow(
        'Malformed tool identifier'
      );
    });
  });

  describe('toStructuredToolIdentifier', () => {
    it('should return the same object for a structured identifier', () => {
      const structuredId = {
        toolId: 'my-tool',
        providerId: builtinToolProviderId,
      };
      expect(toStructuredToolIdentifier(structuredId)).toEqual(structuredId);
    });

    it('should convert an unstructured identifier to structured', () => {
      const result = toStructuredToolIdentifier(`${builtinToolProviderId}::my-tool`);
      expect(result).toEqual({
        toolId: 'my-tool',
        providerId: builtinToolProviderId,
      });
    });

    it('should convert a plain identifier to structured', () => {
      const result = toStructuredToolIdentifier('my-tool');
      expect(result).toEqual({
        toolId: 'my-tool',
        providerId: unknownToolProviderId,
      });
    });

    it('should throw an error for malformed identifiers', () => {
      expect(() => toStructuredToolIdentifier('invalid::tool::format')).toThrow(
        'Malformed tool identifier'
      );
    });
  });
});
