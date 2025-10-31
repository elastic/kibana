/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout';
import type { SetProcessor, StreamlangDSL } from '@kbn/streamlang';
import { transpileEsql as transpile } from '@kbn/streamlang';
import { streamlangApiTest as apiTest } from '../..';

apiTest.describe('Streamlang to ES|QL - Filter Conditions', { tag: ['@ess', '@svlOblt'] }, () => {
  apiTest('should handle eq (equals) filter condition', async ({ testBed, esql }) => {
    const indexName = 'stream-e2e-test-eq-filter';

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

    const { query } = transpile(streamlangDSL);

    // ES|QL errors out when unmapped fields (columns) are read
    // The following doc helps map the fields for which ES|QL has to perform nullability checks
    const mappingDoc = { attributes: { status: 'null', is_active: 'null' } };
    const docs = [
      mappingDoc,
      { attributes: { status: 'active' } },
      { attributes: { status: 'inactive' } },
      { attributes: { status: 'pending' } },
    ];

    await testBed.ingest(indexName, docs);
    const esqlResult = await esql.queryOnIndex(indexName, query);

    expect(esqlResult.documentsOrdered[1]).toStrictEqual(
      expect.objectContaining({ 'attributes.status': 'active', 'attributes.is_active': 'yes' })
    );
    expect(esqlResult.documentsOrdered[2]).toStrictEqual(
      expect.objectContaining({ 'attributes.status': 'inactive', 'attributes.is_active': null })
    );
    expect(esqlResult.documentsOrdered[3]).toStrictEqual(
      expect.objectContaining({ 'attributes.status': 'pending', 'attributes.is_active': null })
    );
  });

  apiTest('should handle neq (not equals) filter condition', async ({ testBed, esql }) => {
    const indexName = 'stream-e2e-test-neq-filter';

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

    const { query } = transpile(streamlangDSL);
    expect(query).toContain('`attributes.status` != "deleted"');

    const mappingDoc = { attributes: { status: 'null', not_deleted: 'null' } };
    const docs = [
      mappingDoc,
      { attributes: { status: 'active' } },
      { attributes: { status: 'deleted' } },
      { attributes: { status: 'inactive' } },
    ];

    await testBed.ingest(indexName, docs);
    const esqlResult = await esql.queryOnIndex(indexName, query);

    expect(esqlResult.documentsOrdered[1]).toStrictEqual(
      expect.objectContaining({ 'attributes.status': 'active', 'attributes.not_deleted': 'kept' })
    );
    expect(esqlResult.documentsOrdered[2]).toStrictEqual(
      expect.objectContaining({ 'attributes.status': 'deleted', 'attributes.not_deleted': null })
    );
    expect(esqlResult.documentsOrdered[3]).toStrictEqual(
      expect.objectContaining({ 'attributes.status': 'inactive', 'attributes.not_deleted': 'kept' })
    );
  });

  apiTest('should handle gt (greater than) filter condition', async ({ testBed, esql }) => {
    const indexName = 'stream-e2e-test-gt-filter';

    const streamlangDSL: StreamlangDSL = {
      steps: [
        {
          action: 'set',
          to: 'attributes.high_priority',
          value: 'high',
          where: {
            field: 'attributes.priority',
            gt: 5,
          },
        } as SetProcessor,
      ],
    };

    const { query } = transpile(streamlangDSL);
    expect(query).toContain('`attributes.priority` > 5');

    const mappingDoc = { attributes: { priority: 0, high_priority: 'null' } };
    const docs = [
      mappingDoc,
      { attributes: { priority: 8 } },
      { attributes: { priority: 5 } },
      { attributes: { priority: 3 } },
      { attributes: { priority: 10 } },
    ];

    await testBed.ingest(indexName, docs);
    const esqlResult = await esql.queryOnIndex(indexName, query);

    expect(esqlResult.documentsOrdered[1]).toStrictEqual(
      expect.objectContaining({ 'attributes.priority': 8, 'attributes.high_priority': 'high' })
    );
    expect(esqlResult.documentsOrdered[2]).toStrictEqual(
      expect.objectContaining({ 'attributes.priority': 5, 'attributes.high_priority': null })
    );
    expect(esqlResult.documentsOrdered[3]).toStrictEqual(
      expect.objectContaining({ 'attributes.priority': 3, 'attributes.high_priority': null })
    );
    expect(esqlResult.documentsOrdered[4]).toStrictEqual(
      expect.objectContaining({ 'attributes.priority': 10, 'attributes.high_priority': 'high' })
    );
  });

  apiTest(
    'should handle gte (greater than or equal) filter condition',
    async ({ testBed, esql }) => {
      const indexName = 'stream-e2e-test-gte-filter';

      const streamlangDSL: StreamlangDSL = {
        steps: [
          {
            action: 'set',
            to: 'attributes.adult',
            value: 'yes',
            where: {
              field: 'attributes.age',
              gte: 18,
            },
          } as SetProcessor,
        ],
      };

      const { query } = transpile(streamlangDSL);
      expect(query).toContain('`attributes.age` >= 18');

      const mappingDoc = { attributes: { age: 0, adult: 'null' } };
      const docs = [
        mappingDoc,
        { attributes: { age: 25 } },
        { attributes: { age: 18 } },
        { attributes: { age: 16 } },
      ];

      await testBed.ingest(indexName, docs);
      const esqlResult = await esql.queryOnIndex(indexName, query);

      expect(esqlResult.documentsOrdered[1]).toStrictEqual(
        expect.objectContaining({ 'attributes.age': 25, 'attributes.adult': 'yes' })
      );
      expect(esqlResult.documentsOrdered[2]).toStrictEqual(
        expect.objectContaining({ 'attributes.age': 18, 'attributes.adult': 'yes' })
      );
      expect(esqlResult.documentsOrdered[3]).toStrictEqual(
        expect.objectContaining({ 'attributes.age': 16, 'attributes.adult': null })
      );
    }
  );

  apiTest('should handle lt (less than) filter condition', async ({ testBed, esql }) => {
    const indexName = 'stream-e2e-test-lt-filter';

    const streamlangDSL: StreamlangDSL = {
      steps: [
        {
          action: 'set',
          to: 'attributes.low_stock',
          value: 'low',
          where: {
            field: 'attributes.quantity',
            lt: 10,
          },
        } as SetProcessor,
      ],
    };

    const { query } = transpile(streamlangDSL);
    expect(query).toContain('`attributes.quantity` < 10');

    const mappingDoc = { attributes: { quantity: 100, low_stock: 'null' } };
    const docs = [
      mappingDoc,
      { attributes: { quantity: 5 } },
      { attributes: { quantity: 10 } },
      { attributes: { quantity: 15 } },
    ];

    await testBed.ingest(indexName, docs);
    const esqlResult = await esql.queryOnIndex(indexName, query);

    expect(esqlResult.documentsOrdered[1]).toStrictEqual(
      expect.objectContaining({ 'attributes.quantity': 5, 'attributes.low_stock': 'low' })
    );
    expect(esqlResult.documentsOrdered[2]).toStrictEqual(
      expect.objectContaining({ 'attributes.quantity': 10, 'attributes.low_stock': null })
    );
    expect(esqlResult.documentsOrdered[3]).toStrictEqual(
      expect.objectContaining({ 'attributes.quantity': 15, 'attributes.low_stock': null })
    );
  });

  apiTest('should handle lte (less than or equal) filter condition', async ({ testBed, esql }) => {
    const indexName = 'stream-e2e-test-lte-filter';

    const streamlangDSL: StreamlangDSL = {
      steps: [
        {
          action: 'set',
          to: 'attributes.small_file',
          value: 'small',
          where: {
            field: 'attributes.size',
            lte: 1024,
          },
        } as SetProcessor,
      ],
    };

    const { query } = transpile(streamlangDSL);
    expect(query).toContain('`attributes.size` <= 1024');

    const mappingDoc = { attributes: { size: 1000, small_file: 'null' } };
    const docs = [
      mappingDoc,
      { attributes: { size: 512 } },
      { attributes: { size: 1024 } },
      { attributes: { size: 2048 } },
    ];

    await testBed.ingest(indexName, docs);
    const esqlResult = await esql.queryOnIndex(indexName, query);

    expect(esqlResult.documentsOrdered[1]).toStrictEqual(
      expect.objectContaining({ 'attributes.size': 512, 'attributes.small_file': 'small' })
    );
    expect(esqlResult.documentsOrdered[2]).toStrictEqual(
      expect.objectContaining({ 'attributes.size': 1024, 'attributes.small_file': 'small' })
    );
    expect(esqlResult.documentsOrdered[3]).toStrictEqual(
      expect.objectContaining({ 'attributes.size': 2048, 'attributes.small_file': null })
    );
  });

  apiTest('should handle exists filter condition', async ({ testBed, esql }) => {
    const indexName = 'stream-e2e-test-exists-filter';

    const streamlangDSL: StreamlangDSL = {
      steps: [
        {
          action: 'set',
          to: 'attributes.has_email',
          value: 'yes',
          where: {
            field: 'attributes.user_email',
            exists: true,
          },
        } as SetProcessor,
      ],
    };

    const { query } = transpile(streamlangDSL);

    const mappingDoc = { attributes: { user_email: 'null', user_name: 'null', has_email: 'null' } };
    const docs = [
      mappingDoc,
      { attributes: { user_email: 'test@example.com' } },
      { attributes: { user_name: 'John' } },
      { attributes: { user_email: 'another@example.com' } },
    ];

    await testBed.ingest(indexName, docs);
    const esqlResult = await esql.queryOnIndex(indexName, query);

    expect(esqlResult.documentsOrdered[1]).toStrictEqual(
      expect.objectContaining({
        'attributes.user_email': 'test@example.com',
        'attributes.has_email': 'yes',
      })
    );
    expect(esqlResult.documentsOrdered[2]).toStrictEqual(
      expect.objectContaining({ 'attributes.user_name': 'John', 'attributes.has_email': null })
    );
    expect(esqlResult.documentsOrdered[3]).toStrictEqual(
      expect.objectContaining({
        'attributes.user_email': 'another@example.com',
        'attributes.has_email': 'yes',
      })
    );
  });

  apiTest('should handle range filter condition', async ({ testBed, esql }) => {
    const indexName = 'stream-e2e-test-range-filter';

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

    const { query } = transpile(streamlangDSL);

    const mappingDoc = { attributes: { temperature: 0, in_range: 'null' } };
    const docs = [
      mappingDoc,
      { attributes: { temperature: 15 } },
      { attributes: { temperature: 20 } },
      { attributes: { temperature: 25 } },
      { attributes: { temperature: 30 } },
      { attributes: { temperature: 35 } },
    ];

    await testBed.ingest(indexName, docs);
    const esqlResult = await esql.queryOnIndex(indexName, query);

    expect(esqlResult.documentsOrdered[1]).toStrictEqual(
      expect.objectContaining({ 'attributes.temperature': 15, 'attributes.in_range': null })
    );
    expect(esqlResult.documentsOrdered[2]).toStrictEqual(
      expect.objectContaining({ 'attributes.temperature': 20, 'attributes.in_range': 'optimal' })
    );
    expect(esqlResult.documentsOrdered[3]).toStrictEqual(
      expect.objectContaining({ 'attributes.temperature': 25, 'attributes.in_range': 'optimal' })
    );
    expect(esqlResult.documentsOrdered[4]).toStrictEqual(
      expect.objectContaining({ 'attributes.temperature': 30, 'attributes.in_range': null })
    );
    expect(esqlResult.documentsOrdered[5]).toStrictEqual(
      expect.objectContaining({ 'attributes.temperature': 35, 'attributes.in_range': null })
    );
  });

  apiTest('should handle contains filter with LIKE pattern using *', async ({ testBed, esql }) => {
    const indexName = 'stream-e2e-test-contains-filter';

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

    const { query } = transpile(streamlangDSL);

    // Verify the query uses LIKE with * wildcards, not LIKE() function or % wildcards
    expect(query).toContain('`attributes.service_name` LIKE "*synth-service-2*"');
    expect(query).not.toContain('LIKE(');
    expect(query).not.toContain('%');

    const mappingDoc = { attributes: { service_name: 'null', matched: 'null' } };
    const docs = [
      mappingDoc,
      { attributes: { service_name: 'synth-service-2' } },
      { attributes: { service_name: 'prefix-synth-service-2-suffix' } },
      { attributes: { service_name: 'synth-service-1' } },
      { attributes: { service_name: 'other-service' } },
    ];

    await testBed.ingest(indexName, docs);
    const esqlResult = await esql.queryOnIndex(indexName, query);

    // First two documents should match (exact and partial match)
    expect(esqlResult.documentsOrdered[1]).toStrictEqual(
      expect.objectContaining({
        'attributes.service_name': 'synth-service-2',
        'attributes.matched': 'matched',
      })
    );

    expect(esqlResult.documentsOrdered[2]).toStrictEqual(
      expect.objectContaining({
        'attributes.service_name': 'prefix-synth-service-2-suffix',
        'attributes.matched': 'matched',
      })
    );

    // Last two documents should not match
    expect(esqlResult.documentsOrdered[3]).toStrictEqual(
      expect.objectContaining({
        'attributes.service_name': 'synth-service-1',
        'attributes.matched': null,
      })
    );

    expect(esqlResult.documentsOrdered[4]).toStrictEqual(
      expect.objectContaining({
        'attributes.service_name': 'other-service',
        'attributes.matched': null,
      })
    );
  });

  apiTest(
    'should handle startsWith filter with LIKE pattern using *',
    async ({ testBed, esql }) => {
      const indexName = 'stream-e2e-test-startswith-filter';

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

      const { query } = transpile(streamlangDSL);

      // Verify the query uses LIKE with trailing * wildcard
      expect(query).toContain('`attributes.message` LIKE "Error:*"');
      expect(query).not.toContain('LIKE(');
      expect(query).not.toContain('%');

      const mappingDoc = { attributes: { message: 'null', is_error: 'null' } };
      const docs = [
        mappingDoc,
        { attributes: { message: 'Error: Connection failed' } },
        { attributes: { message: 'Error: Timeout occurred' } },
        { attributes: { message: 'Warning: Low memory' } },
        { attributes: { message: 'Info: Server started' } },
      ];

      await testBed.ingest(indexName, docs);
      const esqlResult = await esql.queryOnIndex(indexName, query);

      // First two documents should match (start with "Error:")
      expect(esqlResult.documentsOrdered[1]).toStrictEqual(
        expect.objectContaining({
          'attributes.message': 'Error: Connection failed',
          'attributes.is_error': 'error',
        })
      );

      expect(esqlResult.documentsOrdered[2]).toStrictEqual(
        expect.objectContaining({
          'attributes.message': 'Error: Timeout occurred',
          'attributes.is_error': 'error',
        })
      );

      // Last two documents should not match
      expect(esqlResult.documentsOrdered[3]).toStrictEqual(
        expect.objectContaining({
          'attributes.message': 'Warning: Low memory',
          'attributes.is_error': null,
        })
      );

      expect(esqlResult.documentsOrdered[4]).toStrictEqual(
        expect.objectContaining({
          'attributes.message': 'Info: Server started',
          'attributes.is_error': null,
        })
      );
    }
  );

  apiTest('should handle endsWith filter with LIKE pattern using *', async ({ testBed, esql }) => {
    const indexName = 'stream-e2e-test-endswith-filter';

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

    const { query } = transpile(streamlangDSL);

    // Verify the query uses LIKE with leading * wildcard
    expect(query).toContain('`attributes.filename` LIKE "*.log"');
    expect(query).not.toContain('LIKE(');
    expect(query).not.toContain('%');

    const mappingDoc = { attributes: { filename: 'null', is_log_file: 'null' } };
    const docs = [
      mappingDoc,
      { attributes: { filename: 'application.log' } },
      { attributes: { filename: 'error.log' } },
      { attributes: { filename: 'config.json' } },
      { attributes: { filename: 'data.csv' } },
    ];

    await testBed.ingest(indexName, docs);
    const esqlResult = await esql.queryOnIndex(indexName, query);

    // First two documents should match (end with ".log")
    expect(esqlResult.documentsOrdered[1]).toStrictEqual(
      expect.objectContaining({
        'attributes.filename': 'application.log',
        'attributes.is_log_file': 'log',
      })
    );

    expect(esqlResult.documentsOrdered[2]).toStrictEqual(
      expect.objectContaining({
        'attributes.filename': 'error.log',
        'attributes.is_log_file': 'log',
      })
    );

    // Last two documents should not match
    expect(esqlResult.documentsOrdered[3]).toStrictEqual(
      expect.objectContaining({
        'attributes.filename': 'config.json',
        'attributes.is_log_file': null,
      })
    );

    expect(esqlResult.documentsOrdered[4]).toStrictEqual(
      expect.objectContaining({
        'attributes.filename': 'data.csv',
        'attributes.is_log_file': null,
      })
    );
  });

  apiTest(
    'should handle multiple filter conditions with LIKE patterns',
    async ({ testBed, esql }) => {
      const indexName = 'stream-e2e-test-multiple-filters';

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

      const { query } = transpile(streamlangDSL);

      // Verify all three LIKE patterns are correct
      expect(query).toContain('`attributes.service_name` LIKE "prod-*"');
      expect(query).toContain('`attributes.message` LIKE "*error*"');
      expect(query).toContain('`attributes.log_path` LIKE "*.log"');
      expect(query).not.toContain('LIKE(');
      expect(query).not.toContain('%');

      const mappingDoc = {
        attributes: {
          service_name: 'null',
          message: 'null',
          log_path: 'null',
          priority: 'null',
        },
      };
      const docs = [
        mappingDoc,
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

      await testBed.ingest(indexName, docs);
      const esqlResult = await esql.queryOnIndex(indexName, query);

      // Only first document should match all three conditions
      expect(esqlResult.documentsOrdered[1]).toStrictEqual(
        expect.objectContaining({
          'attributes.service_name': 'prod-api',
          'attributes.priority': 'high',
        })
      );

      // Other documents should not match all conditions
      expect(esqlResult.documentsOrdered[2]).toStrictEqual(
        expect.objectContaining({
          'attributes.service_name': 'prod-worker',
          'attributes.priority': null, // doesn't contain 'error'
        })
      );

      expect(esqlResult.documentsOrdered[3]).toStrictEqual(
        expect.objectContaining({
          'attributes.service_name': 'dev-api',
          'attributes.priority': null, // doesn't start with 'prod-'
        })
      );
    }
  );

  apiTest('should handle NOT condition with contains filter', async ({ testBed, esql }) => {
    const indexName = 'stream-e2e-test-not-contains';

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

    const { query } = transpile(streamlangDSL);

    // Verify the query uses NOT with LIKE
    expect(query).toContain('NOT `attributes.log_level` LIKE "*DEBUG*"');
    expect(query).not.toContain('LIKE(');
    expect(query).not.toContain('%');

    const mappingDoc = { attributes: { log_level: 'null', not_debug: 'null' } };
    const docs = [
      mappingDoc,
      { attributes: { log_level: 'INFO' } },
      { attributes: { log_level: 'DEBUG' } },
      { attributes: { log_level: 'ERROR' } },
      { attributes: { log_level: 'WARNING_DEBUG' } },
    ];

    await testBed.ingest(indexName, docs);
    const esqlResult = await esql.queryOnIndex(indexName, query);

    // First and third documents should match (not DEBUG)
    expect(esqlResult.documentsOrdered[1]).toStrictEqual(
      expect.objectContaining({
        'attributes.log_level': 'INFO',
        'attributes.not_debug': 'production',
      })
    );

    expect(esqlResult.documentsOrdered[2]).toStrictEqual(
      expect.objectContaining({
        'attributes.log_level': 'DEBUG',
        'attributes.not_debug': null,
      })
    );

    expect(esqlResult.documentsOrdered[3]).toStrictEqual(
      expect.objectContaining({
        'attributes.log_level': 'ERROR',
        'attributes.not_debug': 'production',
      })
    );

    expect(esqlResult.documentsOrdered[4]).toStrictEqual(
      expect.objectContaining({
        'attributes.log_level': 'WARNING_DEBUG',
        'attributes.not_debug': null, // contains DEBUG
      })
    );
  });

  apiTest('should handle OR condition with multiple LIKE patterns', async ({ testBed, esql }) => {
    const indexName = 'stream-e2e-test-or-like';

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

    const { query } = transpile(streamlangDSL);

    // Verify all three OR conditions use correct LIKE patterns
    expect(query).toContain('`attributes.message` LIKE "CRITICAL:*"');
    expect(query).toContain('`attributes.message` LIKE "*fatal*"');
    expect(query).toContain('`attributes.message` LIKE "*panic"');
    expect(query).not.toContain('LIKE(');
    expect(query).not.toContain('%');

    const mappingDoc = { attributes: { message: 'null', important: 'null' } };
    const docs = [
      mappingDoc,
      { attributes: { message: 'CRITICAL: System failure' } },
      { attributes: { message: 'A fatal error occurred' } },
      { attributes: { message: 'Kernel panic' } },
      { attributes: { message: 'Warning: Low disk space' } },
    ];

    await testBed.ingest(indexName, docs);
    const esqlResult = await esql.queryOnIndex(indexName, query);

    // First three documents should match (at least one condition true)
    expect(esqlResult.documentsOrdered[1]).toStrictEqual(
      expect.objectContaining({
        'attributes.message': 'CRITICAL: System failure',
        'attributes.important': 'critical',
      })
    );

    expect(esqlResult.documentsOrdered[2]).toStrictEqual(
      expect.objectContaining({
        'attributes.message': 'A fatal error occurred',
        'attributes.important': 'critical',
      })
    );

    expect(esqlResult.documentsOrdered[3]).toStrictEqual(
      expect.objectContaining({
        'attributes.message': 'Kernel panic',
        'attributes.important': 'critical',
      })
    );

    // Last document should not match
    expect(esqlResult.documentsOrdered[4]).toStrictEqual(
      expect.objectContaining({
        'attributes.message': 'Warning: Low disk space',
        'attributes.important': null,
      })
    );
  });

  apiTest('should handle special characters in LIKE patterns', async ({ testBed, esql }) => {
    const indexName = 'stream-e2e-test-special-chars';

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

    const { query } = transpile(streamlangDSL);

    // Verify special characters are preserved in pattern
    expect(query).toContain('`attributes.url_path` LIKE "*/api/v1/*"');

    const mappingDoc = { attributes: { url_path: 'null', is_api_path: 'null' } };
    const docs = [
      mappingDoc,
      { attributes: { url_path: '/api/v1/users' } },
      { attributes: { url_path: '/api/v1/products/123' } },
      { attributes: { url_path: '/api/v2/users' } },
      { attributes: { url_path: '/admin/users' } },
    ];

    await testBed.ingest(indexName, docs);
    const esqlResult = await esql.queryOnIndex(indexName, query);

    // First two documents should match
    expect(esqlResult.documentsOrdered[1]).toStrictEqual(
      expect.objectContaining({
        'attributes.url_path': '/api/v1/users',
        'attributes.is_api_path': 'api_v1',
      })
    );

    expect(esqlResult.documentsOrdered[2]).toStrictEqual(
      expect.objectContaining({
        'attributes.url_path': '/api/v1/products/123',
        'attributes.is_api_path': 'api_v1',
      })
    );

    // Last two documents should not match
    expect(esqlResult.documentsOrdered[3]).toStrictEqual(
      expect.objectContaining({
        'attributes.url_path': '/api/v2/users',
        'attributes.is_api_path': null,
      })
    );

    expect(esqlResult.documentsOrdered[4]).toStrictEqual(
      expect.objectContaining({
        'attributes.url_path': '/admin/users',
        'attributes.is_api_path': null,
      })
    );
  });
});
