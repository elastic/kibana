/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Streams, Feature, RawDashboard } from '@kbn/streams-schema';
import {
  prepareDashboardSuggestionInput,
  getInputTypeFromDefinition,
  isQueryStreamDefinition,
  isIngestStreamDefinition,
} from './prepare_input';

const createMockFeature = (partial: Partial<Feature> = {}): Feature => ({
  id: 'feature-1',
  uuid: 'uuid-1',
  stream_name: 'test-stream',
  type: 'log_level',
  description: 'Log level indicator',
  properties: {},
  confidence: 80,
  status: 'active',
  last_seen: new Date().toISOString(),
  ...partial,
});

describe('prepare_input', () => {
  const mockFeatures: Feature[] = [
    createMockFeature({ id: 'feature-1', type: 'log_level', description: 'Log level indicator' }),
    createMockFeature({ id: 'feature-2', type: 'timestamp', description: 'Event timestamp' }),
  ];

  // Mock ingest stream definition - using partial type and asserting
  // since the full type is complex with many nested fields
  const mockIngestStreamDefinition = {
    name: 'logs.test',
    description: 'Test ingest stream',
    updated_at: new Date().toISOString(),
    ingest: {
      routing: [],
      wired: { fields: {} },
      processing: [],
      lifecycle: { dsl: {} },
    },
  } as unknown as Streams.ingest.all.Definition;

  const mockQueryStreamDefinition: Streams.QueryStream.Definition = {
    name: 'query.test',
    description: 'Test query stream',
    updated_at: new Date().toISOString(),
    query: {
      view: 'streams_esql_query.test',
      esql: 'FROM logs | LIMIT 100',
    },
  };

  describe('getInputTypeFromDefinition', () => {
    it('returns "ingest" for ingest stream definitions', () => {
      const result = getInputTypeFromDefinition(mockIngestStreamDefinition);
      expect(result).toBe('ingest');
    });

    it('returns "query" for query stream definitions', () => {
      const result = getInputTypeFromDefinition(mockQueryStreamDefinition);
      expect(result).toBe('query');
    });

    it('returns "ingest" for definitions without query property', () => {
      // Use the mockIngestStreamDefinition which is already typed
      const result = getInputTypeFromDefinition(mockIngestStreamDefinition);
      expect(result).toBe('ingest');
    });
  });

  describe('isQueryStreamDefinition', () => {
    it('returns true for query stream definitions', () => {
      expect(isQueryStreamDefinition(mockQueryStreamDefinition)).toBe(true);
    });

    it('returns false for ingest stream definitions', () => {
      expect(isQueryStreamDefinition(mockIngestStreamDefinition)).toBe(false);
    });
  });

  describe('isIngestStreamDefinition', () => {
    it('returns true for ingest stream definitions', () => {
      expect(isIngestStreamDefinition(mockIngestStreamDefinition)).toBe(true);
    });

    it('returns false for query stream definitions', () => {
      expect(isIngestStreamDefinition(mockQueryStreamDefinition)).toBe(false);
    });
  });

  describe('prepareDashboardSuggestionInput', () => {
    describe('for ingest streams', () => {
      it('creates input with ingest type and definition', () => {
        const result = prepareDashboardSuggestionInput({
          definition: mockIngestStreamDefinition,
          features: mockFeatures,
        });

        expect(result.streamName).toBe('logs.test');
        expect(result.inputType).toBe('ingest');
        expect(result.definition).toBe(mockIngestStreamDefinition);
        expect(result.features).toBe(mockFeatures);
        expect(result.esqlQuery).toBeUndefined();
        expect(result.esqlViewName).toBeUndefined();
      });

      it('includes optional guidance', () => {
        const result = prepareDashboardSuggestionInput({
          definition: mockIngestStreamDefinition,
          features: mockFeatures,
          guidance: 'Focus on error monitoring',
        });

        expect(result.guidance).toBe('Focus on error monitoring');
      });

      it('includes optional previous dashboard', () => {
        const previousDashboard: RawDashboard = {
          title: 'Previous Dashboard',
          panels: [],
          timeRange: { from: 'now-24h', to: 'now' },
        };

        const result = prepareDashboardSuggestionInput({
          definition: mockIngestStreamDefinition,
          features: mockFeatures,
          previousDashboard,
        });

        expect(result.previousDashboard).toBe(previousDashboard);
      });
    });

    describe('for query streams', () => {
      it('creates input with query type and ES|QL query', () => {
        const esqlQuery = 'FROM logs | WHERE level = "error" | LIMIT 100';

        const result = prepareDashboardSuggestionInput({
          definition: mockQueryStreamDefinition,
          features: mockFeatures,
          esqlQuery,
        });

        expect(result.streamName).toBe('query.test');
        expect(result.inputType).toBe('query');
        expect(result.esqlQuery).toBe(esqlQuery);
        expect(result.esqlViewName).toBe('$.query.test');
        expect(result.definition).toBeUndefined();
        expect(result.features).toBe(mockFeatures);
      });

      it('throws error when esqlQuery is not provided for query streams', () => {
        expect(() =>
          prepareDashboardSuggestionInput({
            definition: mockQueryStreamDefinition,
            features: mockFeatures,
          })
        ).toThrow(
          'Query stream "query.test" requires esqlQuery to be provided. Fetch the query from the ES|QL view before calling this function.'
        );
      });

      it('includes optional guidance for query streams', () => {
        const result = prepareDashboardSuggestionInput({
          definition: mockQueryStreamDefinition,
          features: mockFeatures,
          esqlQuery: 'FROM logs | LIMIT 10',
          guidance: 'Show metrics over time',
        });

        expect(result.guidance).toBe('Show metrics over time');
      });

      it('generates correct ES|QL view name using getEsqlViewName', () => {
        const queryDef: Streams.QueryStream.Definition = {
          name: 'my-custom-stream',
          description: 'Custom stream',
          updated_at: new Date().toISOString(),
          query: {
            view: 'streams_esql_my-custom-stream',
            esql: 'FROM source | LIMIT 10',
          },
        };

        const result = prepareDashboardSuggestionInput({
          definition: queryDef,
          features: [],
          esqlQuery: 'FROM source | LIMIT 10',
        });

        // getEsqlViewName should generate '$.my-custom-stream'
        expect(result.esqlViewName).toBe('$.my-custom-stream');
      });
    });

    describe('edge cases', () => {
      it('handles empty features array', () => {
        const result = prepareDashboardSuggestionInput({
          definition: mockIngestStreamDefinition,
          features: [],
        });

        expect(result.features).toEqual([]);
      });

      it('preserves all optional fields when provided', () => {
        const previousDashboard: RawDashboard = {
          title: 'Old Dashboard',
          panels: [
            {
              id: 'panel-1',
              title: 'Panel',
              type: 'line_chart',
              query: 'FROM logs | STATS count = COUNT(*) BY @timestamp',
              dimensions: { x: '@timestamp', y: 'count' },
              position: { x: 0, y: 0, width: 24, height: 15 },
            },
          ],
          timeRange: { from: 'now-7d', to: 'now' },
        };

        const result = prepareDashboardSuggestionInput({
          definition: mockIngestStreamDefinition,
          features: mockFeatures,
          guidance: 'Detailed guidance text',
          previousDashboard,
        });

        expect(result.guidance).toBe('Detailed guidance text');
        expect(result.previousDashboard).toBe(previousDashboard);
        expect(result.streamName).toBe('logs.test');
        expect(result.inputType).toBe('ingest');
      });
    });
  });
});
