/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  toSerializedAgentIdentifier,
  toStructuredAgentIdentifier,
  isPlainAgentIdentifier,
  isSerializedAgentIdentifier,
  isStructuredAgentIdentifier,
  StructuredAgentIdentifier,
} from './identifiers';

describe('Agent Identifier utilities', () => {
  describe('isPlainAgentIdentifier', () => {
    it('should return true for a plain string identifier', () => {
      expect(isPlainAgentIdentifier('my-agent')).toBe(true);
    });

    it('should return false for a serialized identifier', () => {
      expect(isPlainAgentIdentifier('provider1::my-agent')).toBe(false);
    });

    it('should return false for a structured identifier', () => {
      expect(
        isPlainAgentIdentifier({
          agentId: 'my-agent',
          providerId: 'provider1',
        })
      ).toBe(false);
    });
  });

  describe('isStructuredAgentIdentifier', () => {
    it('should return true for a valid structured identifier', () => {
      const structuredId: StructuredAgentIdentifier = {
        agentId: 'my-agent',
        providerId: 'provider1',
      };
      expect(isStructuredAgentIdentifier(structuredId)).toBe(true);
    });

    it('should return false for a plain string identifier', () => {
      expect(isStructuredAgentIdentifier('my-agent')).toBe(false);
    });

    it('should return false for a serialized identifier', () => {
      expect(isStructuredAgentIdentifier('provider1::my-agent')).toBe(false);
    });
  });

  describe('isSerializedAgentIdentifier', () => {
    it('should return true for a valid serialized identifier', () => {
      expect(isSerializedAgentIdentifier('provider1::my-agent')).toBe(true);
    });

    it('should return false for a plain string identifier', () => {
      expect(isSerializedAgentIdentifier('my-agent')).toBe(false);
    });

    it('should return false for a structured identifier', () => {
      expect(
        isSerializedAgentIdentifier({
          agentId: 'my-agent',
          providerId: 'provider1',
        })
      ).toBe(false);
    });
  });

  describe('toSerializedAgentIdentifier', () => {
    it('should return the same string for a serialized identifier', () => {
      const serializedId = 'provider1::my-agent';
      expect(toSerializedAgentIdentifier(serializedId)).toBe(serializedId);
    });

    it('should convert a structured identifier to serialized format', () => {
      const structuredId = {
        agentId: 'my-agent',
        providerId: 'provider1',
      };
      expect(toSerializedAgentIdentifier(structuredId)).toBe('provider1::my-agent');
    });

    it('should convert a plain identifier to serialized format with unknown provider', () => {
      expect(toSerializedAgentIdentifier('my-agent')).toBe('unknown::my-agent');
    });

    it('should throw an error for malformed identifiers', () => {
      expect(() => toSerializedAgentIdentifier('invalid::format::extra')).toThrow(
        'Malformed agent identifier'
      );
    });
  });

  describe('toStructuredAgentIdentifier', () => {
    it('should return the same object for a structured identifier', () => {
      const structuredId = {
        agentId: 'my-agent',
        providerId: 'provider1',
      };
      expect(toStructuredAgentIdentifier(structuredId)).toEqual(structuredId);
    });

    it('should convert a serialized identifier to structured', () => {
      const result = toStructuredAgentIdentifier('provider1::my-agent');
      expect(result).toEqual({
        agentId: 'my-agent',
        providerId: 'provider1',
      });
    });

    it('should convert a plain identifier to structured', () => {
      const result = toStructuredAgentIdentifier('my-agent');
      expect(result).toEqual({
        agentId: 'my-agent',
        providerId: 'unknown',
      });
    });

    it('should throw an error for malformed identifiers', () => {
      expect(() => toStructuredAgentIdentifier('invalid::format::extra')).toThrow(
        'Malformed agent identifier'
      );
    });
  });
});
