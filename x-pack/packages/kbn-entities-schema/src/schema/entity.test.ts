/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { entityLatestSchema, entityMetadataSchema } from './entity';

const entity = {
  entity: {
    lastSeenTimestamp: '2024-08-06T17:03:50.722Z',
    schemaVersion: 'v1',
    definitionVersion: '999.999.999',
    displayName: 'message_processor',
    identityFields: ['log.logger', 'event.category'],
    id: '6UHVPiduEC2qk6rMjs1Jzg==',
    metrics: {
      logRate: 100,
      errorRate: 0,
    },
    type: 'service',
    firstSeenTimestamp: '2024-08-06T16:50:00.000Z',
    definitionId: 'admin-console-services',
  },
};

const metadata = {
  host: {
    os: {
      name: [],
    },
    name: [
      'message_processor.prod.002',
      'message_processor.prod.001',
      'message_processor.prod.010',
      'message_processor.prod.006',
      'message_processor.prod.005',
      'message_processor.prod.004',
      'message_processor.prod.003',
      'message_processor.prod.009',
      'message_processor.prod.008',
      'message_processor.prod.007',
    ],
  },
  event: {
    ingested: '2024-08-06T17:06:24.444700Z',
    category: '',
  },
  sourceIndex: ['kbn-data-forge-fake_stack.message_processor-2024-08-01'],
  log: {
    logger: 'message_processor',
  },
  tags: ['infra:message_processor'],
};

describe('Entity Schemas', () => {
  describe('entityMetadataSchema', () => {
    it('should parse metadata object', () => {
      const results = entityMetadataSchema.safeParse(metadata);
      expect(results).toHaveProperty('success', true);
    });
  });

  describe('entitySummarySchema', () => {
    it('should parse an entity with metadata', () => {
      const doc = {
        ...entity,
        ...metadata,
      };

      const result = entityLatestSchema.safeParse(doc);
      expect(result).toHaveProperty('success', true);
    });
  });
});
