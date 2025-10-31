/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout';
import type { SetProcessor, StreamlangDSL } from '@kbn/streamlang';
import { transpileIngestPipeline, transpileEsql } from '@kbn/streamlang';
import { streamlangApiTest as apiTest } from '../..';

apiTest.describe('Cross-compatibility - Filter Conditions', { tag: ['@ess', '@svlOblt'] }, () => {
  apiTest('should handle eq (equals) filter condition', async ({ testBed, esql }) => {
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

    const { processors } = transpileIngestPipeline(streamlangDSL);
    const { query } = transpileEsql(streamlangDSL);

    // ES|QL needs a mapping doc for the new field
    const mappingDoc = { attributes: { status: 'null', is_active: 'null' } };
    const docs = [
      { attributes: { status: 'active' } },
      { attributes: { status: 'inactive' } },
      { attributes: { status: 'pending' } },
    ];

    // Test ingest pipeline
    await testBed.ingest('ingest-eq', docs, processors);
    const ingestResult = await testBed.getDocsOrdered('ingest-eq');

    // Test ESQL
    await testBed.ingest('esql-eq', [mappingDoc, ...docs]);
    const esqlResult = await esql.queryOnIndex('esql-eq', query);

    // Verify both produce same results
    expect(ingestResult[0]).toStrictEqual(
      expect.objectContaining({ attributes: { status: 'active', is_active: 'yes' } })
    );
    expect(ingestResult[1].attributes).not.toHaveProperty('is_active');
    expect(ingestResult[2].attributes).not.toHaveProperty('is_active');

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

    const { processors } = transpileIngestPipeline(streamlangDSL);
    const { query } = transpileEsql(streamlangDSL);

    const mappingDoc = { attributes: { status: 'null', not_deleted: 'null' } };
    const docs = [
      { attributes: { status: 'active' } },
      { attributes: { status: 'deleted' } },
      { attributes: { status: 'inactive' } },
    ];

    await testBed.ingest('ingest-neq', docs, processors);
    const ingestResult = await testBed.getDocsOrdered('ingest-neq');

    await testBed.ingest('esql-neq', [mappingDoc, ...docs]);
    const esqlResult = await esql.queryOnIndex('esql-neq', query);

    expect(ingestResult[0]).toStrictEqual(
      expect.objectContaining({ attributes: { status: 'active', not_deleted: 'kept' } })
    );
    expect(ingestResult[1].attributes).not.toHaveProperty('not_deleted');
    expect(ingestResult[2]).toStrictEqual(
      expect.objectContaining({ attributes: { status: 'inactive', not_deleted: 'kept' } })
    );

    expect(esqlResult.documentsOrdered[1]).toStrictEqual(
      expect.objectContaining({ 'attributes.status': 'active', 'attributes.not_deleted': 'kept' })
    );
    expect(esqlResult.documentsOrdered[2]).toStrictEqual(
      expect.objectContaining({ 'attributes.status': 'deleted', 'attributes.not_deleted': null })
    );
    expect(esqlResult.documentsOrdered[3]).toStrictEqual(
      expect.objectContaining({
        'attributes.status': 'inactive',
        'attributes.not_deleted': 'kept',
      })
    );
  });

  apiTest('should handle gt (greater than) filter condition', async ({ testBed, esql }) => {
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

    const { processors } = transpileIngestPipeline(streamlangDSL);
    const { query } = transpileEsql(streamlangDSL);

    const mappingDoc = { attributes: { priority: 0, high_priority: 'null' } };
    const docs = [
      { attributes: { priority: 10 } },
      { attributes: { priority: 8 } },
      { attributes: { priority: 5 } },
      { attributes: { priority: 3 } },
    ];

    await testBed.ingest('ingest-gt', docs, processors);
    const ingestResult = await testBed.getDocsOrdered('ingest-gt');

    await testBed.ingest('esql-gt', [mappingDoc, ...docs]);
    const esqlResult = await esql.queryOnIndex('esql-gt', query);

    expect(ingestResult[0]).toStrictEqual(
      expect.objectContaining({ attributes: { priority: 10, high_priority: 'high' } })
    );
    expect(ingestResult[1]).toStrictEqual(
      expect.objectContaining({ attributes: { priority: 8, high_priority: 'high' } })
    );
    expect(ingestResult[2].attributes).not.toHaveProperty('high_priority');
    expect(ingestResult[3].attributes).not.toHaveProperty('high_priority');

    expect(esqlResult.documentsOrdered[1]).toStrictEqual(
      expect.objectContaining({ 'attributes.priority': 10, 'attributes.high_priority': 'high' })
    );
    expect(esqlResult.documentsOrdered[2]).toStrictEqual(
      expect.objectContaining({ 'attributes.priority': 8, 'attributes.high_priority': 'high' })
    );
    expect(esqlResult.documentsOrdered[3]).toStrictEqual(
      expect.objectContaining({ 'attributes.priority': 5, 'attributes.high_priority': null })
    );
    expect(esqlResult.documentsOrdered[4]).toStrictEqual(
      expect.objectContaining({ 'attributes.priority': 3, 'attributes.high_priority': null })
    );
  });

  apiTest(
    'should handle gte (greater than or equal) filter condition',
    async ({ testBed, esql }) => {
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

      const { processors } = transpileIngestPipeline(streamlangDSL);
      const { query } = transpileEsql(streamlangDSL);

      const mappingDoc = { attributes: { age: 0, adult: 'null' } };
      const docs = [
        { attributes: { age: 25 } },
        { attributes: { age: 18 } },
        { attributes: { age: 16 } },
      ];

      await testBed.ingest('ingest-gte', docs, processors);
      const ingestResult = await testBed.getDocsOrdered('ingest-gte');

      await testBed.ingest('esql-gte', [mappingDoc, ...docs]);
      const esqlResult = await esql.queryOnIndex('esql-gte', query);

      expect(ingestResult[0]).toStrictEqual(
        expect.objectContaining({ attributes: { age: 25, adult: 'yes' } })
      );
      expect(ingestResult[1]).toStrictEqual(
        expect.objectContaining({ attributes: { age: 18, adult: 'yes' } })
      );
      expect(ingestResult[2].attributes).not.toHaveProperty('adult');

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

    const { processors } = transpileIngestPipeline(streamlangDSL);
    const { query } = transpileEsql(streamlangDSL);

    const mappingDoc = { attributes: { quantity: 100, low_stock: 'null' } };
    const docs = [
      { attributes: { quantity: 5 } },
      { attributes: { quantity: 8 } },
      { attributes: { quantity: 10 } },
      { attributes: { quantity: 15 } },
    ];

    await testBed.ingest('ingest-lt', docs, processors);
    const ingestResult = await testBed.getDocsOrdered('ingest-lt');

    await testBed.ingest('esql-lt', [mappingDoc, ...docs]);
    const esqlResult = await esql.queryOnIndex('esql-lt', query);

    expect(ingestResult[0]).toStrictEqual(
      expect.objectContaining({ attributes: { quantity: 5, low_stock: 'low' } })
    );
    expect(ingestResult[1]).toStrictEqual(
      expect.objectContaining({ attributes: { quantity: 8, low_stock: 'low' } })
    );
    expect(ingestResult[2].attributes).not.toHaveProperty('low_stock');
    expect(ingestResult[3].attributes).not.toHaveProperty('low_stock');

    expect(esqlResult.documentsOrdered[1]).toStrictEqual(
      expect.objectContaining({ 'attributes.quantity': 5, 'attributes.low_stock': 'low' })
    );
    expect(esqlResult.documentsOrdered[2]).toStrictEqual(
      expect.objectContaining({ 'attributes.quantity': 8, 'attributes.low_stock': 'low' })
    );
    expect(esqlResult.documentsOrdered[3]).toStrictEqual(
      expect.objectContaining({ 'attributes.quantity': 10, 'attributes.low_stock': null })
    );
    expect(esqlResult.documentsOrdered[4]).toStrictEqual(
      expect.objectContaining({ 'attributes.quantity': 15, 'attributes.low_stock': null })
    );
  });

  apiTest('should handle lte (less than or equal) filter condition', async ({ testBed, esql }) => {
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

    const { processors } = transpileIngestPipeline(streamlangDSL);
    const { query } = transpileEsql(streamlangDSL);

    const mappingDoc = { attributes: { size: 1000, small_file: 'null' } };
    const docs = [
      { attributes: { size: 512 } },
      { attributes: { size: 1024 } },
      { attributes: { size: 2048 } },
    ];

    await testBed.ingest('ingest-lte', docs, processors);
    const ingestResult = await testBed.getDocsOrdered('ingest-lte');

    await testBed.ingest('esql-lte', [mappingDoc, ...docs]);
    const esqlResult = await esql.queryOnIndex('esql-lte', query);

    expect(ingestResult[0]).toStrictEqual(
      expect.objectContaining({ attributes: { size: 512, small_file: 'small' } })
    );
    expect(ingestResult[1]).toStrictEqual(
      expect.objectContaining({ attributes: { size: 1024, small_file: 'small' } })
    );
    expect(ingestResult[2].attributes).not.toHaveProperty('small_file');

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

    const { processors } = transpileIngestPipeline(streamlangDSL);
    const { query } = transpileEsql(streamlangDSL);

    const mappingDoc = { attributes: { user_email: 'null', user_name: 'null', has_email: 'null' } };
    const docs = [
      { attributes: { user_email: 'test@example.com' } },
      { attributes: { user_name: 'John' } },
      { attributes: { user_email: 'another@example.com' } },
    ];

    await testBed.ingest('ingest-exists', docs, processors);
    const ingestResult = await testBed.getDocsOrdered('ingest-exists');

    await testBed.ingest('esql-exists', [mappingDoc, ...docs]);
    const esqlResult = await esql.queryOnIndex('esql-exists', query);

    expect(ingestResult[0].attributes).toStrictEqual(
      expect.objectContaining({ user_email: 'test@example.com', has_email: 'yes' })
    );
    expect(ingestResult[1].attributes).not.toHaveProperty('has_email');
    expect(ingestResult[2].attributes).toStrictEqual(
      expect.objectContaining({ user_email: 'another@example.com', has_email: 'yes' })
    );

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

    const { processors } = transpileIngestPipeline(streamlangDSL);
    const { query } = transpileEsql(streamlangDSL);

    const mappingDoc = { attributes: { temperature: 0, in_range: 'null' } };
    const docs = [
      { attributes: { temperature: 15 } },
      { attributes: { temperature: 20 } },
      { attributes: { temperature: 25 } },
      { attributes: { temperature: 30 } },
      { attributes: { temperature: 35 } },
    ];

    await testBed.ingest('ingest-range', docs, processors);
    const ingestResult = await testBed.getDocsOrdered('ingest-range');

    await testBed.ingest('esql-range', [mappingDoc, ...docs]);
    const esqlResult = await esql.queryOnIndex('esql-range', query);

    expect(ingestResult[0].attributes).not.toHaveProperty('in_range');
    expect(ingestResult[1]).toStrictEqual(
      expect.objectContaining({ attributes: { temperature: 20, in_range: 'optimal' } })
    );
    expect(ingestResult[2]).toStrictEqual(
      expect.objectContaining({ attributes: { temperature: 25, in_range: 'optimal' } })
    );
    expect(ingestResult[3].attributes).not.toHaveProperty('in_range');
    expect(ingestResult[4].attributes).not.toHaveProperty('in_range');

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

  apiTest('should handle contains filter condition', async ({ testBed, esql }) => {
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

    const { processors } = transpileIngestPipeline(streamlangDSL);
    const { query } = transpileEsql(streamlangDSL);

    const mappingDoc = { attributes: { service_name: 'null', matched: 'null' } };
    const docs = [
      { attributes: { service_name: 'synth-service-2' } },
      { attributes: { service_name: 'prefix-synth-service-2-suffix' } },
      { attributes: { service_name: 'synth-service-1' } },
      { attributes: { service_name: 'other-service' } },
    ];

    await testBed.ingest('ingest-contains', docs, processors);
    const ingestResult = await testBed.getDocsOrdered('ingest-contains');

    await testBed.ingest('esql-contains', [mappingDoc, ...docs]);
    const esqlResult = await esql.queryOnIndex('esql-contains', query);

    expect(ingestResult[0].attributes).toStrictEqual(
      expect.objectContaining({ service_name: 'synth-service-2', matched: 'matched' })
    );
    expect(ingestResult[1].attributes).toStrictEqual(
      expect.objectContaining({
        service_name: 'prefix-synth-service-2-suffix',
        matched: 'matched',
      })
    );
    expect(ingestResult[2].attributes).not.toHaveProperty('matched');
    expect(ingestResult[3].attributes).not.toHaveProperty('matched');

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

  apiTest('should handle startsWith filter condition', async ({ testBed, esql }) => {
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

    const { processors } = transpileIngestPipeline(streamlangDSL);
    const { query } = transpileEsql(streamlangDSL);

    const mappingDoc = { attributes: { message: 'null', is_error: 'null' } };
    const docs = [
      { attributes: { message: 'Error: Connection failed' } },
      { attributes: { message: 'Error: Timeout occurred' } },
      { attributes: { message: 'Warning: Low memory' } },
      { attributes: { message: 'Info: Server started' } },
    ];

    await testBed.ingest('ingest-startswith', docs, processors);
    const ingestResult = await testBed.getDocsOrdered('ingest-startswith');

    await testBed.ingest('esql-startswith', [mappingDoc, ...docs]);
    const esqlResult = await esql.queryOnIndex('esql-startswith', query);

    expect(ingestResult[0].attributes).toStrictEqual(
      expect.objectContaining({ message: 'Error: Connection failed', is_error: 'error' })
    );
    expect(ingestResult[1].attributes).toStrictEqual(
      expect.objectContaining({ message: 'Error: Timeout occurred', is_error: 'error' })
    );
    expect(ingestResult[2].attributes).not.toHaveProperty('is_error');
    expect(ingestResult[3].attributes).not.toHaveProperty('is_error');

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
  });

  apiTest('should handle endsWith filter condition', async ({ testBed, esql }) => {
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

    const { processors } = transpileIngestPipeline(streamlangDSL);
    const { query } = transpileEsql(streamlangDSL);

    const mappingDoc = { attributes: { filename: 'null', is_log_file: 'null' } };
    const docs = [
      { attributes: { filename: 'application.log' } },
      { attributes: { filename: 'error.log' } },
      { attributes: { filename: 'config.json' } },
      { attributes: { filename: 'data.csv' } },
    ];

    await testBed.ingest('ingest-endswith', docs, processors);
    const ingestResult = await testBed.getDocsOrdered('ingest-endswith');

    await testBed.ingest('esql-endswith', [mappingDoc, ...docs]);
    const esqlResult = await esql.queryOnIndex('esql-endswith', query);

    expect(ingestResult[0].attributes).toStrictEqual(
      expect.objectContaining({ filename: 'application.log', is_log_file: 'log' })
    );
    expect(ingestResult[1].attributes).toStrictEqual(
      expect.objectContaining({ filename: 'error.log', is_log_file: 'log' })
    );
    expect(ingestResult[2].attributes).not.toHaveProperty('is_log_file');
    expect(ingestResult[3].attributes).not.toHaveProperty('is_log_file');

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

  apiTest('should handle multiple filter conditions with AND', async ({ testBed, esql }) => {
    const streamlangDSL: StreamlangDSL = {
      steps: [
        {
          action: 'set',
          to: 'attributes.priority',
          value: 'high',
          where: {
            and: [
              { field: 'attributes.service_name', startsWith: 'prod-' },
              { field: 'attributes.message', contains: 'error' },
              { field: 'attributes.log_path', endsWith: '.log' },
            ],
          },
        } as SetProcessor,
      ],
    };

    const { processors } = transpileIngestPipeline(streamlangDSL);
    const { query } = transpileEsql(streamlangDSL);

    const mappingDoc = {
      attributes: { service_name: 'null', message: 'null', log_path: 'null', priority: 'null' },
    };
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

    await testBed.ingest('ingest-multiple-and', docs, processors);
    const ingestResult = await testBed.getDocsOrdered('ingest-multiple-and');

    await testBed.ingest('esql-multiple-and', [mappingDoc, ...docs]);
    const esqlResult = await esql.queryOnIndex('esql-multiple-and', query);

    expect(ingestResult[0].attributes).toStrictEqual(
      expect.objectContaining({ service_name: 'prod-api', priority: 'high' })
    );
    expect(ingestResult[1].attributes).not.toHaveProperty('priority');
    expect(ingestResult[2].attributes).not.toHaveProperty('priority');

    expect(esqlResult.documentsOrdered[1]).toStrictEqual(
      expect.objectContaining({
        'attributes.service_name': 'prod-api',
        'attributes.priority': 'high',
      })
    );
    expect(esqlResult.documentsOrdered[2]).toStrictEqual(
      expect.objectContaining({
        'attributes.service_name': 'prod-worker',
        'attributes.priority': null,
      })
    );
    expect(esqlResult.documentsOrdered[3]).toStrictEqual(
      expect.objectContaining({ 'attributes.service_name': 'dev-api', 'attributes.priority': null })
    );
  });

  apiTest('should handle NOT condition with contains filter', async ({ testBed, esql }) => {
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

    const { processors } = transpileIngestPipeline(streamlangDSL);
    const { query } = transpileEsql(streamlangDSL);

    const mappingDoc = { attributes: { log_level: 'null', not_debug: 'null' } };
    const docs = [
      { attributes: { log_level: 'INFO' } },
      { attributes: { log_level: 'DEBUG' } },
      { attributes: { log_level: 'ERROR' } },
      { attributes: { log_level: 'WARNING_DEBUG' } },
    ];

    await testBed.ingest('ingest-not-contains', docs, processors);
    const ingestResult = await testBed.getDocsOrdered('ingest-not-contains');

    await testBed.ingest('esql-not-contains', [mappingDoc, ...docs]);
    const esqlResult = await esql.queryOnIndex('esql-not-contains', query);

    expect(ingestResult[0].attributes).toStrictEqual(
      expect.objectContaining({ log_level: 'INFO', not_debug: 'production' })
    );
    expect(ingestResult[1].attributes).not.toHaveProperty('not_debug');
    expect(ingestResult[2].attributes).toStrictEqual(
      expect.objectContaining({ log_level: 'ERROR', not_debug: 'production' })
    );
    expect(ingestResult[3].attributes).not.toHaveProperty('not_debug');

    expect(esqlResult.documentsOrdered[1]).toStrictEqual(
      expect.objectContaining({
        'attributes.log_level': 'INFO',
        'attributes.not_debug': 'production',
      })
    );
    expect(esqlResult.documentsOrdered[2]).toStrictEqual(
      expect.objectContaining({ 'attributes.log_level': 'DEBUG', 'attributes.not_debug': null })
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
        'attributes.not_debug': null,
      })
    );
  });

  apiTest('should handle OR condition with multiple patterns', async ({ testBed, esql }) => {
    const streamlangDSL: StreamlangDSL = {
      steps: [
        {
          action: 'set',
          to: 'attributes.important',
          value: 'critical',
          where: {
            or: [
              { field: 'attributes.message', startsWith: 'CRITICAL:' },
              { field: 'attributes.message', contains: 'fatal' },
              { field: 'attributes.message', endsWith: 'panic' },
            ],
          },
        } as SetProcessor,
      ],
    };

    const { processors } = transpileIngestPipeline(streamlangDSL);
    const { query } = transpileEsql(streamlangDSL);

    const mappingDoc = { attributes: { message: 'null', important: 'null' } };
    const docs = [
      { attributes: { message: 'CRITICAL: System failure' } },
      { attributes: { message: 'A fatal error occurred' } },
      { attributes: { message: 'Kernel panic' } },
      { attributes: { message: 'Warning: Low disk space' } },
    ];

    await testBed.ingest('ingest-or-patterns', docs, processors);
    const ingestResult = await testBed.getDocsOrdered('ingest-or-patterns');

    await testBed.ingest('esql-or-patterns', [mappingDoc, ...docs]);
    const esqlResult = await esql.queryOnIndex('esql-or-patterns', query);

    expect(ingestResult[0].attributes).toStrictEqual(
      expect.objectContaining({ message: 'CRITICAL: System failure', important: 'critical' })
    );
    expect(ingestResult[1].attributes).toStrictEqual(
      expect.objectContaining({ message: 'A fatal error occurred', important: 'critical' })
    );
    expect(ingestResult[2].attributes).toStrictEqual(
      expect.objectContaining({ message: 'Kernel panic', important: 'critical' })
    );
    expect(ingestResult[3].attributes).not.toHaveProperty('important');

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
    expect(esqlResult.documentsOrdered[4]).toStrictEqual(
      expect.objectContaining({
        'attributes.message': 'Warning: Low disk space',
        'attributes.important': null,
      })
    );
  });

  apiTest('should handle special characters in patterns', async ({ testBed, esql }) => {
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

    const { processors } = transpileIngestPipeline(streamlangDSL);
    const { query } = transpileEsql(streamlangDSL);

    const mappingDoc = { attributes: { url_path: 'null', is_api_path: 'null' } };
    const docs = [
      { attributes: { url_path: '/api/v1/users' } },
      { attributes: { url_path: '/api/v1/products/123' } },
      { attributes: { url_path: '/api/v2/users' } },
      { attributes: { url_path: '/admin/users' } },
    ];

    await testBed.ingest('ingest-special-chars', docs, processors);
    const ingestResult = await testBed.getDocsOrdered('ingest-special-chars');

    await testBed.ingest('esql-special-chars', [mappingDoc, ...docs]);
    const esqlResult = await esql.queryOnIndex('esql-special-chars', query);

    expect(ingestResult[0].attributes).toStrictEqual(
      expect.objectContaining({ url_path: '/api/v1/users', is_api_path: 'api_v1' })
    );
    expect(ingestResult[1].attributes).toStrictEqual(
      expect.objectContaining({ url_path: '/api/v1/products/123', is_api_path: 'api_v1' })
    );
    expect(ingestResult[2].attributes).not.toHaveProperty('is_api_path');
    expect(ingestResult[3].attributes).not.toHaveProperty('is_api_path');

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
