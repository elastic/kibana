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
  ToolSourceType,
  StructuredToolIdentifier,
} from './tools';

describe('Tool Identifier utilities', () => {
  describe('isPlainToolIdentifier', () => {
    it('should return true for a plain string identifier', () => {
      expect(isPlainToolIdentifier('my-tool')).toBe(true);
    });

    it('should return false for an unstructured identifier', () => {
      expect(isPlainToolIdentifier('my-tool||builtIn||none')).toBe(false);
    });

    it('should return false for a structured identifier', () => {
      expect(
        isPlainToolIdentifier({
          toolId: 'my-tool',
          sourceType: 'builtIn' as ToolSourceType,
          sourceId: 'none',
        })
      ).toBe(false);
    });
  });

  describe('isStructuredToolIdentifier', () => {
    it('should return true for a valid structured identifier', () => {
      const structuredId: StructuredToolIdentifier = {
        toolId: 'my-tool',
        sourceType: ToolSourceType.builtIn,
        sourceId: 'none',
      };
      expect(isStructuredToolIdentifier(structuredId)).toBe(true);
    });

    it('should return false for a plain string identifier', () => {
      expect(isStructuredToolIdentifier('my-tool')).toBe(false);
    });

    it('should return false for an unstructured identifier', () => {
      expect(isStructuredToolIdentifier('my-tool||builtIn||none')).toBe(false);
    });
  });

  describe('isUnstructuredToolIdentifier', () => {
    it('should return true for a valid unstructured identifier', () => {
      expect(isSerializedToolIdentifier('my-tool||builtIn||none')).toBe(true);
    });

    it('should return false for a plain string identifier', () => {
      expect(isSerializedToolIdentifier('my-tool')).toBe(false);
    });

    it('should return false for a structured identifier', () => {
      expect(
        isSerializedToolIdentifier({
          toolId: 'my-tool',
          sourceType: ToolSourceType.builtIn,
          sourceId: 'none',
        })
      ).toBe(false);
    });
  });

  describe('builtinToolId', () => {
    it('should create a structured identifier for a builtIn tool', () => {
      const result = createBuiltinToolId('my-tool');
      expect(result).toEqual({
        toolId: 'my-tool',
        sourceType: ToolSourceType.builtIn,
        sourceId: 'builtIn',
      });
    });
  });

  describe('toSerializedToolIdentifier', () => {
    it('should return the same string for a serialized identifier', () => {
      const serializedId = 'my-tool||builtIn||none';
      expect(toSerializedToolIdentifier(serializedId)).toBe(serializedId);
    });

    it('should convert a structured identifier to serialized format', () => {
      const structuredId = {
        toolId: 'my-tool',
        sourceType: ToolSourceType.builtIn,
        sourceId: 'none',
      };
      expect(toSerializedToolIdentifier(structuredId)).toBe('my-tool||builtIn||none');
    });

    it('should convert a plain identifier to serialized format with unknown source', () => {
      expect(toSerializedToolIdentifier('my-tool')).toBe('my-tool||unknown||unknown');
    });

    it('should throw an error for malformed identifiers', () => {
      expect(() => toSerializedToolIdentifier('invalid||format')).toThrow(
        'Malformed tool identifier'
      );
    });
  });

  describe('toStructuredToolIdentifier', () => {
    it('should return the same object for a structured identifier', () => {
      const structuredId = {
        toolId: 'my-tool',
        sourceType: ToolSourceType.builtIn,
        sourceId: 'none',
      };
      expect(toStructuredToolIdentifier(structuredId)).toEqual(structuredId);
    });

    it('should convert an unstructured identifier to structured', () => {
      const result = toStructuredToolIdentifier('my-tool||builtIn||none');
      expect(result).toEqual({
        toolId: 'my-tool',
        sourceType: ToolSourceType.builtIn,
        sourceId: 'none',
      });
    });

    it('should convert a plain identifier to structured', () => {
      const result = toStructuredToolIdentifier('my-tool');
      expect(result).toEqual({
        toolId: 'my-tool',
        sourceType: ToolSourceType.unknown,
        sourceId: 'unknown',
      });
    });

    it('should throw an error for malformed identifiers', () => {
      expect(() => toStructuredToolIdentifier('invalid||format')).toThrow(
        'Malformed tool identifier'
      );
    });
  });
});
