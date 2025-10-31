/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout';
import type { SetProcessor, StreamlangDSL } from '@kbn/streamlang';
import { transpileIngestPipeline as transpile } from '@kbn/streamlang';
import { streamlangApiTest as apiTest } from '../..';

apiTest.describe(
  'Streamlang to Ingest Pipeline - Filter Conditions',
  { tag: ['@ess', '@svlOblt'] },
  () => {
    apiTest('should handle eq (equals) filter condition', async ({ testBed }) => {
      const indexName = 'stream-e2e-test-ingest-eq';

      const streamlangDSL: StreamlangDSL = {
        steps: [
          {
            action: 'set',
            to: 'attributes.is_active',
            value: 'yes',
            where: {
              field: 'attributes.status',
              eq: 'active',
            },
          } as SetProcessor,
        ],
      };

      const { processors } = transpile(streamlangDSL);

      const docs = [
        { attributes: { status: 'active' } },
        { attributes: { status: 'inactive' } },
        { attributes: { status: 'pending' } },
      ];
      await testBed.ingest(indexName, docs, processors);

      const ingestedDocs = await testBed.getDocs(indexName);

      expect(ingestedDocs[0]).toStrictEqual(
        expect.objectContaining({ attributes: { status: 'active', is_active: 'yes' } })
      );
      expect(ingestedDocs[1]).toStrictEqual(
        expect.objectContaining({ attributes: { status: 'inactive' } })
      );
      expect(ingestedDocs[1].attributes).not.toHaveProperty('is_active');
      expect(ingestedDocs[2]).toStrictEqual(
        expect.objectContaining({ attributes: { status: 'pending' } })
      );
      expect(ingestedDocs[2].attributes).not.toHaveProperty('is_active');
    });

    apiTest('should handle neq (not equals) filter condition', async ({ testBed }) => {
      const indexName = 'stream-e2e-test-ingest-neq';

      const streamlangDSL: StreamlangDSL = {
        steps: [
          {
            action: 'set',
            to: 'attributes.not_deleted',
            value: 'kept',
            where: {
              field: 'attributes.status',
              neq: 'deleted',
            },
          } as SetProcessor,
        ],
      };

      const { processors } = transpile(streamlangDSL);

      const docs = [
        { attributes: { status: 'active' } },
        { attributes: { status: 'deleted' } },
        { attributes: { status: 'inactive' } },
      ];
      await testBed.ingest(indexName, docs, processors);

      const ingestedDocs = await testBed.getDocs(indexName);

      expect(ingestedDocs[0]).toStrictEqual(
        expect.objectContaining({ attributes: { status: 'active', not_deleted: 'kept' } })
      );
      expect(ingestedDocs[1]).toStrictEqual(
        expect.objectContaining({ attributes: { status: 'deleted' } })
      );
      expect(ingestedDocs[1].attributes).not.toHaveProperty('not_deleted');
      expect(ingestedDocs[2]).toStrictEqual(
        expect.objectContaining({ attributes: { status: 'inactive', not_deleted: 'kept' } })
      );
    });

    apiTest('should handle comparison operators (gt, gte, lt, lte)', async ({ testBed }) => {
      const indexName = 'stream-e2e-test-ingest-comparison';

      const streamlangDSL: StreamlangDSL = {
        steps: [
          {
            action: 'set',
            to: 'attributes.category',
            value: 'high',
            where: {
              field: 'attributes.score',
              gt: 80,
            },
          } as SetProcessor,
          {
            action: 'set',
            to: 'attributes.category',
            value: 'medium',
            where: {
              and: [
                { field: 'attributes.score', gte: 50 },
                { field: 'attributes.score', lte: 80 },
              ],
            },
            override: false,
          } as SetProcessor,
          {
            action: 'set',
            to: 'attributes.category',
            value: 'low',
            where: {
              field: 'attributes.score',
              lt: 50,
            },
            override: false,
          } as SetProcessor,
        ],
      };

      const { processors } = transpile(streamlangDSL);

      const docs = [
        { attributes: { score: 90 } },
        { attributes: { score: 65 } },
        { attributes: { score: 30 } },
      ];
      await testBed.ingest(indexName, docs, processors);

      const ingestedDocs = await testBed.getDocs(indexName);

      expect(ingestedDocs[0]).toStrictEqual(
        expect.objectContaining({ attributes: { score: 90, category: 'high' } })
      );
      expect(ingestedDocs[1]).toStrictEqual(
        expect.objectContaining({ attributes: { score: 65, category: 'medium' } })
      );
      expect(ingestedDocs[2]).toStrictEqual(
        expect.objectContaining({ attributes: { score: 30, category: 'low' } })
      );
    });

    apiTest('should handle exists filter condition', async ({ testBed }) => {
      const indexName = 'stream-e2e-test-ingest-exists';

      const streamlangDSL: StreamlangDSL = {
        steps: [
          {
            action: 'set',
            to: 'attributes.has_email',
            value: 'yes',
            where: {
              field: 'attributes.user.email',
              exists: true,
            },
          } as SetProcessor,
        ],
      };

      const { processors } = transpile(streamlangDSL);

      const docs = [
        { attributes: { user: { email: 'test@example.com' } } },
        { attributes: { user: { name: 'John' } } },
        { attributes: { user: { email: 'another@example.com' } } },
      ];
      await testBed.ingest(indexName, docs, processors);

      const ingestedDocs = await testBed.getDocs(indexName);

      expect(ingestedDocs[0].attributes).toStrictEqual(
        expect.objectContaining({ user: { email: 'test@example.com' }, has_email: 'yes' })
      );
      expect(ingestedDocs[1].attributes).toStrictEqual(
        expect.objectContaining({ user: { name: 'John' } })
      );
      expect(ingestedDocs[1].attributes).not.toHaveProperty('has_email');
      expect(ingestedDocs[2].attributes).toStrictEqual(
        expect.objectContaining({ user: { email: 'another@example.com' }, has_email: 'yes' })
      );
    });

    apiTest('should handle range filter condition', async ({ testBed }) => {
      const indexName = 'stream-e2e-test-ingest-range';

      const streamlangDSL: StreamlangDSL = {
        steps: [
          {
            action: 'set',
            to: 'attributes.in_range',
            value: 'optimal',
            where: {
              field: 'attributes.temperature',
              range: {
                gte: 20,
                lt: 30,
              },
            },
          } as SetProcessor,
        ],
      };

      const { processors } = transpile(streamlangDSL);

      const docs = [
        { attributes: { temperature: 15 } },
        { attributes: { temperature: 20 } },
        { attributes: { temperature: 25 } },
        { attributes: { temperature: 30 } },
      ];
      await testBed.ingest(indexName, docs, processors);

      const ingestedDocs = await testBed.getDocs(indexName);

      expect(ingestedDocs[0]).toStrictEqual(
        expect.objectContaining({ attributes: { temperature: 15 } })
      );
      expect(ingestedDocs[0].attributes).not.toHaveProperty('in_range');
      expect(ingestedDocs[1]).toStrictEqual(
        expect.objectContaining({ attributes: { temperature: 20, in_range: 'optimal' } })
      );
      expect(ingestedDocs[2]).toStrictEqual(
        expect.objectContaining({ attributes: { temperature: 25, in_range: 'optimal' } })
      );
      expect(ingestedDocs[3]).toStrictEqual(
        expect.objectContaining({ attributes: { temperature: 30 } })
      );
      expect(ingestedDocs[3].attributes).not.toHaveProperty('in_range');
    });

    apiTest('should handle contains filter condition', async ({ testBed }) => {
      const indexName = 'stream-e2e-test-ingest-contains';

      const streamlangDSL: StreamlangDSL = {
        steps: [
          {
            action: 'set',
            to: 'attributes.matched',
            value: 'matched',
            where: {
              field: 'attributes.service_name',
              contains: 'synth-service-2',
            },
          } as SetProcessor,
        ],
      };

      const { processors } = transpile(streamlangDSL);

      const docs = [
        { attributes: { service_name: 'synth-service-2' } },
        { attributes: { service_name: 'prefix-synth-service-2-suffix' } },
        { attributes: { service_name: 'synth-service-1' } },
        { attributes: { service_name: 'other-service' } },
      ];
      await testBed.ingest(indexName, docs, processors);

      const ingestedDocs = await testBed.getDocs(indexName);

      // First two documents should match (exact and partial match)
      expect(ingestedDocs[0].attributes).toStrictEqual(
        expect.objectContaining({
          service_name: 'synth-service-2',
          matched: 'matched',
        })
      );

      expect(ingestedDocs[1].attributes).toStrictEqual(
        expect.objectContaining({
          service_name: 'prefix-synth-service-2-suffix',
          matched: 'matched',
        })
      );

      // Last two documents should not have the matched field
      expect(ingestedDocs[2].attributes).toStrictEqual(
        expect.objectContaining({ service_name: 'synth-service-1' })
      );
      expect(ingestedDocs[2].attributes).not.toHaveProperty('matched');
      expect(ingestedDocs[3].attributes).toStrictEqual(
        expect.objectContaining({ service_name: 'other-service' })
      );
      expect(ingestedDocs[3].attributes).not.toHaveProperty('matched');
    });

    apiTest('should handle startsWith filter condition', async ({ testBed }) => {
      const indexName = 'stream-e2e-test-ingest-startswith';

      const streamlangDSL: StreamlangDSL = {
        steps: [
          {
            action: 'set',
            to: 'attributes.is_error',
            value: 'error',
            where: {
              field: 'attributes.message',
              startsWith: 'Error:',
            },
          } as SetProcessor,
        ],
      };

      const { processors } = transpile(streamlangDSL);

      const docs = [
        { attributes: { message: 'Error: Connection failed' } },
        { attributes: { message: 'Error: Timeout occurred' } },
        { attributes: { message: 'Warning: Low memory' } },
        { attributes: { message: 'Info: Server started' } },
      ];
      await testBed.ingest(indexName, docs, processors);

      const ingestedDocs = await testBed.getDocs(indexName);

      // First two documents should match (start with "Error:")
      expect(ingestedDocs[0].attributes).toStrictEqual(
        expect.objectContaining({
          message: 'Error: Connection failed',
          is_error: 'error',
        })
      );

      expect(ingestedDocs[1].attributes).toStrictEqual(
        expect.objectContaining({
          message: 'Error: Timeout occurred',
          is_error: 'error',
        })
      );

      // Last two documents should not have the field
      expect(ingestedDocs[2].attributes).toStrictEqual(
        expect.objectContaining({ message: 'Warning: Low memory' })
      );
      expect(ingestedDocs[2].attributes).not.toHaveProperty('is_error');
      expect(ingestedDocs[3].attributes).toStrictEqual(
        expect.objectContaining({ message: 'Info: Server started' })
      );
      expect(ingestedDocs[3].attributes).not.toHaveProperty('is_error');
    });

    apiTest('should handle endsWith filter condition', async ({ testBed }) => {
      const indexName = 'stream-e2e-test-ingest-endswith';

      const streamlangDSL: StreamlangDSL = {
        steps: [
          {
            action: 'set',
            to: 'attributes.is_log_file',
            value: 'log',
            where: {
              field: 'attributes.filename',
              endsWith: '.log',
            },
          } as SetProcessor,
        ],
      };

      const { processors } = transpile(streamlangDSL);

      const docs = [
        { attributes: { filename: 'application.log' } },
        { attributes: { filename: 'error.log' } },
        { attributes: { filename: 'config.json' } },
        { attributes: { filename: 'data.csv' } },
      ];
      await testBed.ingest(indexName, docs, processors);

      const ingestedDocs = await testBed.getDocs(indexName);

      // First two documents should match (end with ".log")
      expect(ingestedDocs[0].attributes).toStrictEqual(
        expect.objectContaining({
          filename: 'application.log',
          is_log_file: 'log',
        })
      );

      expect(ingestedDocs[1].attributes).toStrictEqual(
        expect.objectContaining({
          filename: 'error.log',
          is_log_file: 'log',
        })
      );

      // Last two documents should not have the field
      expect(ingestedDocs[2].attributes).toStrictEqual(
        expect.objectContaining({ filename: 'config.json' })
      );
      expect(ingestedDocs[2].attributes).not.toHaveProperty('is_log_file');
      expect(ingestedDocs[3].attributes).toStrictEqual(
        expect.objectContaining({ filename: 'data.csv' })
      );
      expect(ingestedDocs[3].attributes).not.toHaveProperty('is_log_file');
    });

    apiTest('should handle multiple filter conditions with AND', async ({ testBed }) => {
      const indexName = 'stream-e2e-test-ingest-multiple';

      const streamlangDSL: StreamlangDSL = {
        steps: [
          {
            action: 'set',
            to: 'attributes.priority',
            value: 'high',
            where: {
              and: [
                {
                  field: 'attributes.service_name',
                  startsWith: 'prod-',
                },
                {
                  field: 'attributes.message',
                  contains: 'error',
                },
                {
                  field: 'attributes.log_path',
                  endsWith: '.log',
                },
              ],
            },
          } as SetProcessor,
        ],
      };

      const { processors } = transpile(streamlangDSL);

      const docs = [
        {
          attributes: {
            service_name: 'prod-api',
            message: 'Connection error occurred',
            log_path: '/var/log/app.log',
          },
        },
        {
          attributes: {
            service_name: 'prod-worker',
            message: 'Task completed successfully',
            log_path: '/var/log/worker.log',
          },
        },
        {
          attributes: {
            service_name: 'dev-api',
            message: 'Database error',
            log_path: '/var/log/dev.log',
          },
        },
      ];
      await testBed.ingest(indexName, docs, processors);

      const ingestedDocs = await testBed.getDocs(indexName);

      // Only first document should match all three conditions
      expect(ingestedDocs[0].attributes).toStrictEqual(
        expect.objectContaining({
          service_name: 'prod-api',
          priority: 'high',
        })
      );

      // Other documents should not match all conditions
      expect(ingestedDocs[1].attributes).toStrictEqual(
        expect.objectContaining({ service_name: 'prod-worker' })
      );
      expect(ingestedDocs[1].attributes).not.toHaveProperty('priority');
      expect(ingestedDocs[2].attributes).toStrictEqual(
        expect.objectContaining({ service_name: 'dev-api' })
      );
      expect(ingestedDocs[2].attributes).not.toHaveProperty('priority');
    });

    apiTest('should handle NOT condition with contains filter', async ({ testBed }) => {
      const indexName = 'stream-e2e-test-ingest-not-contains';

      const streamlangDSL: StreamlangDSL = {
        steps: [
          {
            action: 'set',
            to: 'attributes.not_debug',
            value: 'production',
            where: {
              not: {
                field: 'attributes.log_level',
                contains: 'DEBUG',
              },
            },
          } as SetProcessor,
        ],
      };

      const { processors } = transpile(streamlangDSL);

      const docs = [
        { attributes: { log_level: 'INFO' } },
        { attributes: { log_level: 'DEBUG' } },
        { attributes: { log_level: 'ERROR' } },
        { attributes: { log_level: 'WARNING_DEBUG' } },
      ];
      await testBed.ingest(indexName, docs, processors);

      const ingestedDocs = await testBed.getDocs(indexName);

      // First and third documents should match (not DEBUG)
      expect(ingestedDocs[0].attributes).toStrictEqual(
        expect.objectContaining({
          log_level: 'INFO',
          not_debug: 'production',
        })
      );

      expect(ingestedDocs[1].attributes).toStrictEqual(
        expect.objectContaining({ log_level: 'DEBUG' })
      );
      expect(ingestedDocs[1].attributes).not.toHaveProperty('not_debug');

      expect(ingestedDocs[2].attributes).toStrictEqual(
        expect.objectContaining({
          log_level: 'ERROR',
          not_debug: 'production',
        })
      );

      expect(ingestedDocs[3].attributes).toStrictEqual(
        expect.objectContaining({ log_level: 'WARNING_DEBUG' })
      );
      expect(ingestedDocs[3].attributes).not.toHaveProperty('not_debug');
    });

    apiTest('should handle OR condition with multiple patterns', async ({ testBed }) => {
      const indexName = 'stream-e2e-test-ingest-or-patterns';

      const streamlangDSL: StreamlangDSL = {
        steps: [
          {
            action: 'set',
            to: 'attributes.important',
            value: 'critical',
            where: {
              or: [
                {
                  field: 'attributes.message',
                  startsWith: 'CRITICAL:',
                },
                {
                  field: 'attributes.message',
                  contains: 'fatal',
                },
                {
                  field: 'attributes.message',
                  endsWith: 'panic',
                },
              ],
            },
          } as SetProcessor,
        ],
      };

      const { processors } = transpile(streamlangDSL);

      const docs = [
        { attributes: { message: 'CRITICAL: System failure' } },
        { attributes: { message: 'A fatal error occurred' } },
        { attributes: { message: 'Kernel panic' } },
        { attributes: { message: 'Warning: Low disk space' } },
      ];
      await testBed.ingest(indexName, docs, processors);

      const ingestedDocs = await testBed.getDocs(indexName);

      // First three documents should match (at least one condition true)
      expect(ingestedDocs[0].attributes).toStrictEqual(
        expect.objectContaining({
          message: 'CRITICAL: System failure',
          important: 'critical',
        })
      );

      expect(ingestedDocs[1].attributes).toStrictEqual(
        expect.objectContaining({
          message: 'A fatal error occurred',
          important: 'critical',
        })
      );

      expect(ingestedDocs[2].attributes).toStrictEqual(
        expect.objectContaining({
          message: 'Kernel panic',
          important: 'critical',
        })
      );

      // Last document should not match
      expect(ingestedDocs[3].attributes).toStrictEqual(
        expect.objectContaining({ message: 'Warning: Low disk space' })
      );
      expect(ingestedDocs[3].attributes).not.toHaveProperty('important');
    });

    apiTest('should handle special characters in patterns', async ({ testBed }) => {
      const indexName = 'stream-e2e-test-ingest-special-chars';

      const streamlangDSL: StreamlangDSL = {
        steps: [
          {
            action: 'set',
            to: 'attributes.is_api_path',
            value: 'api_v1',
            where: {
              field: 'attributes.url_path',
              contains: '/api/v1/',
            },
          } as SetProcessor,
        ],
      };

      const { processors } = transpile(streamlangDSL);

      const docs = [
        { attributes: { url_path: '/api/v1/users' } },
        { attributes: { url_path: '/api/v1/products/123' } },
        { attributes: { url_path: '/api/v2/users' } },
        { attributes: { url_path: '/admin/users' } },
      ];
      await testBed.ingest(indexName, docs, processors);

      const ingestedDocs = await testBed.getDocs(indexName);

      // First two documents should match
      expect(ingestedDocs[0].attributes).toStrictEqual(
        expect.objectContaining({
          url_path: '/api/v1/users',
          is_api_path: 'api_v1',
        })
      );

      expect(ingestedDocs[1].attributes).toStrictEqual(
        expect.objectContaining({
          url_path: '/api/v1/products/123',
          is_api_path: 'api_v1',
        })
      );

      // Last two documents should not match
      expect(ingestedDocs[2].attributes).toStrictEqual(
        expect.objectContaining({ url_path: '/api/v2/users' })
      );
      expect(ingestedDocs[2].attributes).not.toHaveProperty('is_api_path');
      expect(ingestedDocs[3].attributes).toStrictEqual(
        expect.objectContaining({ url_path: '/admin/users' })
      );
      expect(ingestedDocs[3].attributes).not.toHaveProperty('is_api_path');
    });
  }
);
