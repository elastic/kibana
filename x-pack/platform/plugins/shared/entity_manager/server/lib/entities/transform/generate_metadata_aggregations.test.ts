/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { entityDefinitionSchema } from '@kbn/entities-schema';
import { rawEntityDefinition } from '../helpers/fixtures/entity_definition';
import { generateLatestMetadataAggregations } from './generate_metadata_aggregations';

describe('Generate Metadata Aggregations for history and latest', () => {
  describe('generateLatestMetadataAggregations()', () => {
    it('should generate metadata aggregations for string format', () => {
      const definition = entityDefinitionSchema.parse({
        ...rawEntityDefinition,
        metadata: ['host.name'],
      });

      expect(generateLatestMetadataAggregations(definition)).toEqual({
        'entity.metadata.host.name': {
          filter: {
            range: {
              '@timestamp': {
                gte: 'now-10m',
              },
            },
          },
          aggs: {
            data: {
              terms: {
                field: 'host.name',
                size: 10,
              },
            },
          },
        },
      });
    });

    it('should generate metadata aggregations for object format with only source', () => {
      const definition = entityDefinitionSchema.parse({
        ...rawEntityDefinition,
        metadata: [{ source: 'host.name' }],
      });
      expect(generateLatestMetadataAggregations(definition)).toEqual({
        'entity.metadata.host.name': {
          filter: {
            range: {
              '@timestamp': {
                gte: 'now-10m',
              },
            },
          },
          aggs: {
            data: {
              terms: {
                field: 'host.name',
                size: 10,
              },
            },
          },
        },
      });
    });

    it('should generate metadata aggregations for object format with source and aggregation', () => {
      const definition = entityDefinitionSchema.parse({
        ...rawEntityDefinition,
        metadata: [
          { source: 'host.name', aggregation: { type: 'terms', limit: 10, lookbackPeriod: '1h' } },
        ],
      });
      expect(generateLatestMetadataAggregations(definition)).toEqual({
        'entity.metadata.host.name': {
          filter: {
            range: {
              '@timestamp': {
                gte: 'now-1h',
              },
            },
          },
          aggs: {
            data: {
              terms: {
                field: 'host.name',
                size: 10,
              },
            },
          },
        },
      });
    });

    it('should generate metadata aggregations for object format with source, aggregation, and destination', () => {
      const definition = entityDefinitionSchema.parse({
        ...rawEntityDefinition,
        metadata: [
          {
            source: 'host.name',
            aggregation: { type: 'terms', limit: 10 },
            destination: 'hostName',
          },
        ],
      });
      expect(generateLatestMetadataAggregations(definition)).toEqual({
        'entity.metadata.hostName': {
          filter: {
            range: {
              '@timestamp': {
                gte: 'now-10m',
              },
            },
          },
          aggs: {
            data: {
              terms: {
                field: 'host.name',
                size: 10,
              },
            },
          },
        },
      });
    });

    it('should generate metadata aggregations for terms and top_value', () => {
      const definition = entityDefinitionSchema.parse({
        ...rawEntityDefinition,
        metadata: [
          {
            source: 'host.name',
            aggregation: { type: 'terms', limit: 10 },
            destination: 'hostName',
          },
          {
            source: 'agent.name',
            aggregation: { type: 'top_value', sort: { '@timestamp': 'desc' } },
            destination: 'agentName',
          },
        ],
      });
      expect(generateLatestMetadataAggregations(definition)).toEqual({
        'entity.metadata.hostName': {
          filter: {
            range: {
              '@timestamp': {
                gte: 'now-10m',
              },
            },
          },
          aggs: {
            data: {
              terms: {
                field: 'host.name',
                size: 10,
              },
            },
          },
        },
        'entity.metadata.agentName': {
          filter: {
            bool: {
              must: [
                {
                  range: {
                    '@timestamp': {
                      gte: 'now-10m',
                    },
                  },
                },
                {
                  exists: {
                    field: 'agent.name',
                  },
                },
              ],
            },
          },
          aggs: {
            top_value: {
              top_metrics: {
                metrics: {
                  field: 'agent.name',
                },
                sort: {
                  '@timestamp': 'desc',
                },
              },
            },
          },
        },
      });
    });
  });
});
