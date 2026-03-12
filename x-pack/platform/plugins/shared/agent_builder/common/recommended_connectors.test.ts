/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  RECOMMENDED_CONNECTOR_IDS,
  isRecommendedConnector,
  getFirstRecommendedConnectorId,
} from './recommended_connectors';

describe('recommended_connectors', () => {
  describe('RECOMMENDED_CONNECTOR_IDS', () => {
    it('includes expected SOTA per provider and open-weight connector IDs', () => {
      expect(RECOMMENDED_CONNECTOR_IDS).toContain('Anthropic-Claude-Sonnet-4-5');
      expect(RECOMMENDED_CONNECTOR_IDS).toContain('OpenAI-GPT-5-2');
      expect(RECOMMENDED_CONNECTOR_IDS).toContain('Google-Gemini-2-5-Pro');
      expect(RECOMMENDED_CONNECTOR_IDS).toContain('OpenAI-GPT-OSS-120B');
    });
  });

  describe('isRecommendedConnector', () => {
    it('returns true for IDs in the recommended list', () => {
      expect(isRecommendedConnector('Anthropic-Claude-Sonnet-4-5')).toBe(true);
      expect(isRecommendedConnector('OpenAI-GPT-OSS-120B')).toBe(true);
    });

    it('returns false for IDs not in the recommended list', () => {
      expect(isRecommendedConnector('custom-connector-id')).toBe(false);
      expect(isRecommendedConnector('Elastic-Managed-LLM')).toBe(false);
    });
  });

  describe('getFirstRecommendedConnectorId', () => {
    it('returns the first recommended ID present in the list (order by RECOMMENDED_CONNECTOR_IDS)', () => {
      const connectorIds = ['Google-Gemini-2-5-Pro', 'OpenAI-GPT-5-2', 'custom'];
      expect(getFirstRecommendedConnectorId(connectorIds)).toBe('OpenAI-GPT-5-2');
    });

    it('returns the only recommended ID when one is present', () => {
      expect(getFirstRecommendedConnectorId(['other', 'OpenAI-GPT-OSS-120B', 'foo'])).toBe(
        'OpenAI-GPT-OSS-120B'
      );
    });

    it('returns undefined when no recommended connector is in the list', () => {
      expect(getFirstRecommendedConnectorId(['custom-1', 'custom-2'])).toBeUndefined();
    });

    it('returns undefined for empty list', () => {
      expect(getFirstRecommendedConnectorId([])).toBeUndefined();
    });
  });
});
