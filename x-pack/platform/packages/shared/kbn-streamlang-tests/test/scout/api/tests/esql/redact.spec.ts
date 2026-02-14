/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/api';
import type { RedactProcessor, StreamlangDSL } from '@kbn/streamlang';
import { transpileEsql as transpile } from '@kbn/streamlang';
import { streamlangApiTest as apiTest } from '../..';

apiTest.describe('Streamlang to ES|QL - Redact Processor', { tag: ['@ess', '@svlOblt'] }, () => {
  apiTest(
    'should redact IP address with EVAL replace() and default delimiters',
    async ({ testBed, esql }) => {
      const indexName = 'stream-e2e-test-redact-ip-basic';

      const streamlangDSL: StreamlangDSL = {
        steps: [
          {
            action: 'redact',
            from: 'message',
            patterns: ['%{IP:client_ip}'],
          } as RedactProcessor,
        ],
      };

      const { query } = transpile(streamlangDSL);

      const docs = [{ message: 'Connection from 192.168.1.1 established' }];
      await testBed.ingest(indexName, docs);
      const esqlResult = await esql.queryOnIndex(indexName, query);

      expect(esqlResult.documents).toHaveLength(1);
      expect(esqlResult.documents[0]).toStrictEqual(
        expect.objectContaining({ message: 'Connection from <client_ip> established' })
      );
    }
  );

  apiTest('should redact email address', async ({ testBed, esql }) => {
    const indexName = 'stream-e2e-test-redact-email';

    const streamlangDSL: StreamlangDSL = {
      steps: [
        {
          action: 'redact',
          from: 'message',
          patterns: ['%{EMAILADDRESS:email}'],
        } as RedactProcessor,
      ],
    };

    const { query } = transpile(streamlangDSL);

    const docs = [{ message: 'Contact user at john.doe@example.com for details' }];
    await testBed.ingest(indexName, docs);
    const esqlResult = await esql.queryOnIndex(indexName, query);

    expect(esqlResult.documents).toHaveLength(1);
    expect(esqlResult.documents[0]).toStrictEqual(
      expect.objectContaining({ message: 'Contact user at <email> for details' })
    );
  });

  apiTest('should redact multiple patterns', async ({ testBed, esql }) => {
    const indexName = 'stream-e2e-test-redact-multiple';

    const streamlangDSL: StreamlangDSL = {
      steps: [
        {
          action: 'redact',
          from: 'message',
          patterns: ['%{IP:ip}', '%{EMAILADDRESS:email}'],
        } as RedactProcessor,
      ],
    };

    const { query } = transpile(streamlangDSL);

    const docs = [{ message: 'User john@example.com connected from 10.0.0.1' }];
    await testBed.ingest(indexName, docs);
    const esqlResult = await esql.queryOnIndex(indexName, query);

    expect(esqlResult.documents).toHaveLength(1);
    expect(esqlResult.documents[0]).toStrictEqual(
      expect.objectContaining({ message: 'User <email> connected from <ip>' })
    );
  });

  apiTest('should redact with custom prefix and suffix', async ({ testBed, esql }) => {
    const indexName = 'stream-e2e-test-redact-custom-delimiters';

    const streamlangDSL: StreamlangDSL = {
      steps: [
        {
          action: 'redact',
          from: 'message',
          patterns: ['%{IP:client}'],
          prefix: '[REDACTED:',
          suffix: ']',
        } as RedactProcessor,
      ],
    };

    const { query } = transpile(streamlangDSL);

    const docs = [{ message: 'Request from 172.16.0.1' }];
    await testBed.ingest(indexName, docs);
    const esqlResult = await esql.queryOnIndex(indexName, query);

    expect(esqlResult.documents).toHaveLength(1);
    expect(esqlResult.documents[0]).toStrictEqual(
      expect.objectContaining({ message: 'Request from [REDACTED:client]' })
    );
  });

  apiTest('should redact MAC address', async ({ testBed, esql }) => {
    const indexName = 'stream-e2e-test-redact-mac';

    const streamlangDSL: StreamlangDSL = {
      steps: [
        {
          action: 'redact',
          from: 'message',
          patterns: ['%{MAC:mac_address}'],
        } as RedactProcessor,
      ],
    };

    const { query } = transpile(streamlangDSL);

    const docs = [{ message: 'Device MAC: 00:1A:2B:3C:4D:5E' }];
    await testBed.ingest(indexName, docs);
    const esqlResult = await esql.queryOnIndex(indexName, query);

    expect(esqlResult.documents).toHaveLength(1);
    expect(esqlResult.documents[0]).toStrictEqual(
      expect.objectContaining({ message: 'Device MAC: <mac_address>' })
    );
  });

  apiTest(
    'should handle ignore_missing: true (default) - documents without field pass through',
    async ({ testBed, esql }) => {
      const indexName = 'stream-e2e-test-redact-ignore-missing-default';

      const streamlangDSL: StreamlangDSL = {
        steps: [
          {
            action: 'redact',
            from: 'message',
            patterns: ['%{IP:ip}'],
            // ignore_missing defaults to true for redact
          } as RedactProcessor,
        ],
      };

      const { query } = transpile(streamlangDSL);

      const docWithField = { message: 'Connection from 192.168.1.1', status: 'doc1' };
      const docWithoutField = { status: 'doc2' }; // Should pass through
      const docs = [docWithField, docWithoutField];
      await testBed.ingest(indexName, docs);
      const esqlResult = await esql.queryOnIndex(indexName, query);

      // Both documents should be present
      expect(esqlResult.documents).toHaveLength(2);
      const doc1 = esqlResult.documents.find((d: any) => d.status === 'doc1');
      const doc2 = esqlResult.documents.find((d: any) => d.status === 'doc2');
      expect(doc1).toStrictEqual(expect.objectContaining({ message: 'Connection from <ip>' }));
      expect(doc2).toStrictEqual(expect.objectContaining({ message: null }));
    }
  );

  apiTest(
    'should handle ignore_missing: false - filter documents without field',
    async ({ testBed, esql }) => {
      const indexName = 'stream-e2e-test-redact-no-ignore-missing';

      const streamlangDSL: StreamlangDSL = {
        steps: [
          {
            action: 'redact',
            from: 'message',
            patterns: ['%{IP:ip}'],
            ignore_missing: false,
          } as RedactProcessor,
        ],
      };

      const { query } = transpile(streamlangDSL);

      const docWithField = { message: 'Connection from 192.168.1.1', status: 'doc1' };
      const docWithoutField = { status: 'doc2' }; // Should be filtered out
      const docs = [docWithField, docWithoutField];
      await testBed.ingest(indexName, docs);
      const esqlResult = await esql.queryOnIndex(indexName, query);

      // ES|QL filters out documents with missing field when ignore_missing: false
      expect(esqlResult.documents).toHaveLength(1);
      expect(esqlResult.documents[0]).toStrictEqual(
        expect.objectContaining({ status: 'doc1', message: 'Connection from <ip>' })
      );
    }
  );

  apiTest('should redact field conditionally with EVAL CASE', async ({ testBed, esql }) => {
    const indexName = 'stream-e2e-test-redact-conditional';

    const streamlangDSL: StreamlangDSL = {
      steps: [
        {
          action: 'redact',
          from: 'message',
          patterns: ['%{IP:ip}'],
          where: {
            field: 'environment',
            eq: 'production',
          },
        } as RedactProcessor,
      ],
    };

    const { query } = transpile(streamlangDSL);

    const docs = [
      { message: 'Connection from 192.168.1.1', environment: 'production', status: 'doc1' },
      { message: 'Connection from 192.168.1.2', environment: 'development', status: 'doc2' },
    ];
    await testBed.ingest(indexName, docs);
    const esqlResult = await esql.queryOnIndex(indexName, query);

    expect(esqlResult.documents).toHaveLength(2);

    // Production doc should have IP redacted
    const prodDoc = esqlResult.documents.find((d: any) => d.status === 'doc1');
    expect(prodDoc).toStrictEqual(expect.objectContaining({ message: 'Connection from <ip>' }));

    // Development doc should keep original IP
    const devDoc = esqlResult.documents.find((d: any) => d.status === 'doc2');
    expect(devDoc).toStrictEqual(
      expect.objectContaining({ message: 'Connection from 192.168.1.2' })
    );
  });

  apiTest('should redact UUID', async ({ testBed, esql }) => {
    const indexName = 'stream-e2e-test-redact-uuid';

    const streamlangDSL: StreamlangDSL = {
      steps: [
        {
          action: 'redact',
          from: 'message',
          patterns: ['%{UUID:user_id}'],
        } as RedactProcessor,
      ],
    };

    const { query } = transpile(streamlangDSL);

    const docs = [{ message: 'User 550e8400-e29b-41d4-a716-446655440000 logged in' }];
    await testBed.ingest(indexName, docs);
    const esqlResult = await esql.queryOnIndex(indexName, query);

    expect(esqlResult.documents).toHaveLength(1);
    expect(esqlResult.documents[0]).toStrictEqual(
      expect.objectContaining({ message: 'User <user_id> logged in' })
    );
  });

  apiTest('should not modify field when no pattern matches', async ({ testBed, esql }) => {
    const indexName = 'stream-e2e-test-redact-no-match';

    const streamlangDSL: StreamlangDSL = {
      steps: [
        {
          action: 'redact',
          from: 'message',
          patterns: ['%{IP:ip}'],
        } as RedactProcessor,
      ],
    };

    const { query } = transpile(streamlangDSL);

    const docs = [{ message: 'Hello world, no IP here' }];
    await testBed.ingest(indexName, docs);
    const esqlResult = await esql.queryOnIndex(indexName, query);

    expect(esqlResult.documents).toHaveLength(1);
    expect(esqlResult.documents[0]).toStrictEqual(
      expect.objectContaining({ message: 'Hello world, no IP here' })
    );
  });

  apiTest('should reject Mustache template syntax {{ and {{{ in field names', async () => {
    const streamlangDSL: StreamlangDSL = {
      steps: [
        {
          action: 'redact',
          from: '{{field.name}}',
          patterns: ['%{IP:ip}'],
        } as RedactProcessor,
      ],
    };
    expect(() => transpile(streamlangDSL)).toThrow(
      'Mustache template syntax {{ }} or {{{ }}} is not allowed in field names'
    );
  });
});
