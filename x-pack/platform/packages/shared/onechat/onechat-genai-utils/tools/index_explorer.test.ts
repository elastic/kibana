/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MappingTypeMapping } from '@elastic/elasticsearch/lib/api/types';
import type { ListIndexInfo } from './steps/list_indices';
import type { MappingField } from './utils/mappings';
import { createIndexSelectorPrompt } from './index_explorer';

const TEST_INDEX_NAMES = {
  LOGS: 'logs-apache-001',
  METRICS: 'metrics-system-001',
  TRACES: 'traces-apm-001',
} as const;

const mockIndices = [
  { index: TEST_INDEX_NAMES.LOGS },
  { index: TEST_INDEX_NAMES.METRICS },
  { index: TEST_INDEX_NAMES.TRACES },
] as ListIndexInfo[];

const mockFields: Record<string, MappingField[]> = {
  [TEST_INDEX_NAMES.LOGS]: [
    { path: '@timestamp', type: 'date' },
    { path: 'message', type: 'text' },
    { path: 'host.name', type: 'keyword' },
    { path: 'http.response.status_code', type: 'long' },
  ],
  [TEST_INDEX_NAMES.METRICS]: [
    { path: '@timestamp', type: 'date' },
    { path: 'system.cpu.total.pct', type: 'float' },
    { path: 'system.memory.used.pct', type: 'float' },
    { path: 'host.name', type: 'keyword' },
  ],
  [TEST_INDEX_NAMES.TRACES]: [
    { path: '@timestamp', type: 'date' },
    { path: 'trace.id', type: 'keyword' },
    { path: 'span.duration.us', type: 'long' },
    { path: 'service.name', type: 'keyword' },
  ],
};

const TEST_QUERY = 'Test query';

const TEST_DESCRIPTIONS = {
  APACHE_LOGS: 'Apache web server access and error logs with HTTP request details',
  SYSTEM_METRICS: 'System performance metrics including CPU, memory, and disk usage',
  APM_TRACES: 'APM trace data for distributed request tracking',
} as const;

const EXPECTED_PROMPT_CONTENT = {
  ASSISTANT_INTRO: 'You are an AI assistant for the Elasticsearch company',
  FIELD_PREFIX: 'Fields:',
} as const;

const EXPECTED_FIELD_LISTS = {
  LOGS: '@timestamp ,message ,host.name ,http.response.status_code',
  METRICS: '@timestamp ,system.cpu.total.pct ,system.memory.used.pct ,host.name',
  TRACES: '@timestamp ,trace.id ,span.duration.us ,service.name',
} as const;

describe('createIndexSelectorPrompt', () => {
  describe('when indices have meta descriptions', () => {
    it('should use meta descriptions in the prompt', () => {
      const mappingsWithMeta: Record<string, MappingTypeMapping> = {
        [TEST_INDEX_NAMES.LOGS]: {
          _meta: { description: TEST_DESCRIPTIONS.APACHE_LOGS },
          properties: {},
        },
        [TEST_INDEX_NAMES.METRICS]: {
          _meta: { description: TEST_DESCRIPTIONS.SYSTEM_METRICS },
          properties: {},
        },
        [TEST_INDEX_NAMES.TRACES]: {
          _meta: { description: TEST_DESCRIPTIONS.APM_TRACES },
          properties: {},
        },
      };

      const promptContent = createIndexSelectorPrompt({
        indices: mockIndices,
        mappings: mappingsWithMeta,
        fields: mockFields,
        nlQuery: TEST_QUERY,
        limit: 2,
      });

      expect(promptContent).toContain('up to 2 most relevant indices');
      expect(promptContent).toContain(TEST_QUERY);
      expect(promptContent).toContain(
        `- ${TEST_INDEX_NAMES.LOGS}: ${TEST_DESCRIPTIONS.APACHE_LOGS}`
      );
      expect(promptContent).toContain(
        `- ${TEST_INDEX_NAMES.METRICS}: ${TEST_DESCRIPTIONS.SYSTEM_METRICS}`
      );
      expect(promptContent).toContain(
        `- ${TEST_INDEX_NAMES.TRACES}: ${TEST_DESCRIPTIONS.APM_TRACES}`
      );
      expect(promptContent).toContain('select at maximum 2 indices');
    });
  });

  describe('when indices do not have meta descriptions', () => {
    it('should use field lists as descriptions in the prompt', () => {
      const mappingsWithoutMeta: Record<string, MappingTypeMapping> = {
        [TEST_INDEX_NAMES.LOGS]: { properties: {} },
        [TEST_INDEX_NAMES.METRICS]: { properties: {} },
        [TEST_INDEX_NAMES.TRACES]: { properties: {} },
      };

      const promptContent = createIndexSelectorPrompt({
        indices: mockIndices,
        mappings: mappingsWithoutMeta,
        fields: mockFields,
        nlQuery: TEST_QUERY,
        limit: 1,
      });

      expect(promptContent).toContain('up to 1 most relevant indices');
      expect(promptContent).toContain(TEST_QUERY);
      expect(promptContent).toContain(
        `- ${TEST_INDEX_NAMES.LOGS}: ${EXPECTED_PROMPT_CONTENT.FIELD_PREFIX} ${EXPECTED_FIELD_LISTS.LOGS}`
      );
      expect(promptContent).toContain(
        `- ${TEST_INDEX_NAMES.METRICS}: ${EXPECTED_PROMPT_CONTENT.FIELD_PREFIX} ${EXPECTED_FIELD_LISTS.METRICS}`
      );
      expect(promptContent).toContain(
        `- ${TEST_INDEX_NAMES.TRACES}: ${EXPECTED_PROMPT_CONTENT.FIELD_PREFIX} ${EXPECTED_FIELD_LISTS.TRACES}`
      );
      expect(promptContent).toContain('select at maximum 1 indices');
    });
  });

  describe('when indices have mixed meta descriptions', () => {
    it('should use meta descriptions where available and field lists where not', () => {
      const mixedMappings: Record<string, MappingTypeMapping> = {
        [TEST_INDEX_NAMES.LOGS]: {
          _meta: { description: TEST_DESCRIPTIONS.APACHE_LOGS },
          properties: {},
        },
        [TEST_INDEX_NAMES.METRICS]: { properties: {} },
        [TEST_INDEX_NAMES.TRACES]: {
          _meta: { description: TEST_DESCRIPTIONS.APM_TRACES },
          properties: {},
        },
      };

      const promptContent = createIndexSelectorPrompt({
        indices: mockIndices,
        mappings: mixedMappings,
        fields: mockFields,
        nlQuery: TEST_QUERY,
        limit: 3,
      });

      expect(promptContent).toContain(
        `- ${TEST_INDEX_NAMES.LOGS}: ${TEST_DESCRIPTIONS.APACHE_LOGS}`
      );
      expect(promptContent).toContain(
        `- ${TEST_INDEX_NAMES.METRICS}: ${EXPECTED_PROMPT_CONTENT.FIELD_PREFIX} ${EXPECTED_FIELD_LISTS.METRICS}`
      );
      expect(promptContent).toContain(
        `- ${TEST_INDEX_NAMES.TRACES}: ${TEST_DESCRIPTIONS.APM_TRACES}`
      );
    });
  });

  describe('default limit behavior', () => {
    it('should default to limit of 1 when not specified', () => {
      const mappings: Record<string, MappingTypeMapping> = {
        [TEST_INDEX_NAMES.LOGS]: { properties: {} },
      };

      const promptContent = createIndexSelectorPrompt({
        indices: [mockIndices[0]],
        mappings,
        fields: { [TEST_INDEX_NAMES.LOGS]: mockFields[TEST_INDEX_NAMES.LOGS] },
        nlQuery: TEST_QUERY,
      });

      expect(promptContent).toContain('up to 1 most relevant indices');
      expect(promptContent).toContain('select at maximum 1 indices');
    });
  });

  describe('prompt structure', () => {
    it('should return string', () => {
      const mappings: Record<string, MappingTypeMapping> = {
        [TEST_INDEX_NAMES.LOGS]: { properties: {} },
      };

      const promptContent = createIndexSelectorPrompt({
        indices: [mockIndices[0]],
        mappings,
        fields: { [TEST_INDEX_NAMES.LOGS]: mockFields[TEST_INDEX_NAMES.LOGS] },
        nlQuery: TEST_QUERY,
      });

      expect(typeof promptContent).toBe('string');
      expect(promptContent).toContain(EXPECTED_PROMPT_CONTENT.ASSISTANT_INTRO);
    });
  });
});
