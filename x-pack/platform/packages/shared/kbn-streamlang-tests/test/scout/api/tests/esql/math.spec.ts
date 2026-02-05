/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/api';
import type { MathProcessor, StreamlangDSL } from '@kbn/streamlang';
import { transpileEsql as transpile } from '@kbn/streamlang';
import { streamlangApiTest as apiTest } from '../..';

apiTest.describe('Streamlang to ES|QL - Math Processor', { tag: ['@ess', '@svlOblt'] }, () => {
  // === Basic Arithmetic ===
  apiTest('should compute multiplication of fields', async ({ testBed, esql }) => {
    const indexName = 'stream-e2e-test-math-multiply';

    const streamlangDSL: StreamlangDSL = {
      steps: [
        {
          action: 'math',
          expression: 'price * quantity',
          to: 'total',
        } as MathProcessor,
      ],
    };

    const { query } = transpile(streamlangDSL);

    const docs = [{ price: 10, quantity: 5 }];
    await testBed.ingest(indexName, docs);
    const esqlResult = await esql.queryOnIndex(indexName, query);

    expect(esqlResult.documents[0]).toStrictEqual(
      expect.objectContaining({
        total: 50,
      })
    );
  });

  apiTest('should compute addition of fields', async ({ testBed, esql }) => {
    const indexName = 'stream-e2e-test-math-add';

    const streamlangDSL: StreamlangDSL = {
      steps: [
        {
          action: 'math',
          expression: 'a + b',
          to: 'sum',
        } as MathProcessor,
      ],
    };

    const { query } = transpile(streamlangDSL);

    const docs = [{ a: 15, b: 25 }];
    await testBed.ingest(indexName, docs);
    const esqlResult = await esql.queryOnIndex(indexName, query);

    expect(esqlResult.documents[0]).toStrictEqual(
      expect.objectContaining({
        sum: 40,
      })
    );
  });

  apiTest('should compute subtraction of fields', async ({ testBed, esql }) => {
    const indexName = 'stream-e2e-test-math-subtract';

    const streamlangDSL: StreamlangDSL = {
      steps: [
        {
          action: 'math',
          expression: 'a - b',
          to: 'difference',
        } as MathProcessor,
      ],
    };

    const { query } = transpile(streamlangDSL);

    const docs = [{ a: 100, b: 30 }];
    await testBed.ingest(indexName, docs);
    const esqlResult = await esql.queryOnIndex(indexName, query);

    expect(esqlResult.documents[0]).toStrictEqual(
      expect.objectContaining({
        difference: 70,
      })
    );
  });

  apiTest('should compute division of fields', async ({ testBed, esql }) => {
    const indexName = 'stream-e2e-test-math-divide';

    const streamlangDSL: StreamlangDSL = {
      steps: [
        {
          action: 'math',
          expression: 'total / count',
          to: 'average',
        } as MathProcessor,
      ],
    };

    const { query } = transpile(streamlangDSL);

    const docs = [{ total: 100, count: 4 }];
    await testBed.ingest(indexName, docs);
    const esqlResult = await esql.queryOnIndex(indexName, query);

    expect(esqlResult.documents[0]).toStrictEqual(
      expect.objectContaining({
        average: 25,
      })
    );
  });

  // === Nested Field Paths ===
  apiTest('should compute with nested field paths', async ({ testBed, esql }) => {
    const indexName = 'stream-e2e-test-math-nested';

    const streamlangDSL: StreamlangDSL = {
      steps: [
        {
          action: 'math',
          expression: 'attributes.price * attributes.quantity',
          to: 'attributes.total',
        } as MathProcessor,
      ],
    };

    const { query } = transpile(streamlangDSL);

    const docs = [{ attributes: { price: 25, quantity: 4 } }];
    await testBed.ingest(indexName, docs);
    const esqlResult = await esql.queryOnIndex(indexName, query);

    expect(esqlResult.documents[0]).toStrictEqual(
      expect.objectContaining({
        'attributes.total': 100,
      })
    );
  });

  // === Log Function ===
  apiTest('should compute log (natural log)', async ({ testBed, esql }) => {
    const indexName = 'stream-e2e-test-math-log';

    const streamlangDSL: StreamlangDSL = {
      steps: [
        {
          action: 'math',
          expression: 'log(value)',
          to: 'result',
        } as MathProcessor,
      ],
    };

    const { query } = transpile(streamlangDSL);

    // log(e) = 1, using e ≈ 2.718281828459045
    const docs = [{ value: 2.718281828459045 }];
    await testBed.ingest(indexName, docs);
    const esqlResult = await esql.queryOnIndex(indexName, query);

    // Allow small floating-point tolerance
    const result = esqlResult.documents[0].result as number;
    expect(result).toBeCloseTo(1, 5);
  });

  // === Comparison Operators ===
  apiTest('should compute neq (not equal) comparison', async ({ testBed, esql }) => {
    const indexName = 'stream-e2e-test-math-neq';

    const streamlangDSL: StreamlangDSL = {
      steps: [
        {
          action: 'math',
          expression: 'neq(a, b)',
          to: 'not_equal',
        } as MathProcessor,
      ],
    };

    const { query } = transpile(streamlangDSL);

    const docs = [
      { order_id: 1, a: 5, b: 3 },
      { order_id: 2, a: 5, b: 5 },
    ];
    await testBed.ingest(indexName, docs);
    const esqlResult = await esql.queryOnIndex(indexName, query);

    expect(esqlResult.documentsOrdered[0]).toStrictEqual(
      expect.objectContaining({
        not_equal: true,
      })
    );
    expect(esqlResult.documentsOrdered[1]).toStrictEqual(
      expect.objectContaining({
        not_equal: false,
      })
    );
  });

  apiTest('should compute gt (greater than) comparison', async ({ testBed, esql }) => {
    const indexName = 'stream-e2e-test-math-gt';

    const streamlangDSL: StreamlangDSL = {
      steps: [
        {
          action: 'math',
          expression: 'gt(a, b)',
          to: 'a_greater',
        } as MathProcessor,
      ],
    };

    const { query } = transpile(streamlangDSL);

    const docs = [
      { order_id: 1, a: 10, b: 5 },
      { order_id: 2, a: 3, b: 7 },
    ];
    await testBed.ingest(indexName, docs);
    const esqlResult = await esql.queryOnIndex(indexName, query);

    expect(esqlResult.documentsOrdered[0]).toStrictEqual(
      expect.objectContaining({ a_greater: true })
    );
    expect(esqlResult.documentsOrdered[1]).toStrictEqual(
      expect.objectContaining({ a_greater: false })
    );
  });

  apiTest('should compute lt (less than) comparison', async ({ testBed, esql }) => {
    const indexName = 'stream-e2e-test-math-lt';

    const streamlangDSL: StreamlangDSL = {
      steps: [
        {
          action: 'math',
          expression: 'lt(a, b)',
          to: 'a_less',
        } as MathProcessor,
      ],
    };

    const { query } = transpile(streamlangDSL);

    const docs = [
      { order_id: 1, a: 3, b: 7 },
      { order_id: 2, a: 10, b: 5 },
    ];
    await testBed.ingest(indexName, docs);
    const esqlResult = await esql.queryOnIndex(indexName, query);

    expect(esqlResult.documentsOrdered[0]).toStrictEqual(expect.objectContaining({ a_less: true }));
    expect(esqlResult.documentsOrdered[1]).toStrictEqual(
      expect.objectContaining({ a_less: false })
    );
  });

  apiTest('should compute eq (equality) comparison', async ({ testBed, esql }) => {
    const indexName = 'stream-e2e-test-math-eq';

    const streamlangDSL: StreamlangDSL = {
      steps: [
        {
          action: 'math',
          expression: 'eq(a, b)',
          to: 'equal',
        } as MathProcessor,
      ],
    };

    const { query } = transpile(streamlangDSL);

    const docs = [
      { order_id: 1, a: 5, b: 5 },
      { order_id: 2, a: 5, b: 3 },
    ];
    await testBed.ingest(indexName, docs);
    const esqlResult = await esql.queryOnIndex(indexName, query);

    expect(esqlResult.documentsOrdered[0]).toStrictEqual(expect.objectContaining({ equal: true }));
    expect(esqlResult.documentsOrdered[1]).toStrictEqual(expect.objectContaining({ equal: false }));
  });

  // === Where Condition ===
  apiTest('should only apply math when where condition is met', async ({ testBed, esql }) => {
    const indexName = 'stream-e2e-test-math-where';

    const streamlangDSL: StreamlangDSL = {
      steps: [
        {
          action: 'math',
          expression: 'price * quantity',
          to: 'total',
          where: {
            field: 'active',
            eq: true,
          },
        } as MathProcessor,
      ],
    };

    const { query } = transpile(streamlangDSL);

    const docs = [
      { order_id: 1, price: 0, quantity: 0, active: true, total: 0 }, // Mapping doc
      { order_id: 2, price: 10, quantity: 5, active: true, total: null },
      { order_id: 3, price: 20, quantity: 3, active: false, total: null },
    ];
    await testBed.ingest(indexName, docs);
    const esqlResult = await esql.queryOnIndex(indexName, query);

    // Active doc should have total calculated
    expect(esqlResult.documentsOrdered[1]).toStrictEqual(
      expect.objectContaining({
        total: 50,
      })
    );

    // Inactive doc should have total unchanged (null)
    expect(esqlResult.documentsOrdered[2]).toStrictEqual(
      expect.objectContaining({
        total: null,
      })
    );
  });

  // === Ignore Missing ===
  apiTest(
    'should skip calculation when ignore_missing is true and field is null',
    async ({ testBed, esql }) => {
      const indexName = 'stream-e2e-test-math-ignore-missing';

      const streamlangDSL: StreamlangDSL = {
        steps: [
          {
            action: 'math',
            expression: 'price * quantity',
            to: 'total',
            ignore_missing: true,
          } as MathProcessor,
        ],
      };

      const { query } = transpile(streamlangDSL);

      const docs = [
        { order_id: 1, price: 0, quantity: 0, total: 0 }, // Mapping doc
        { order_id: 2, price: 10, quantity: 5, total: null },
        { order_id: 3, price: 20, quantity: null, total: null }, // quantity missing
      ];
      await testBed.ingest(indexName, docs);
      const esqlResult = await esql.queryOnIndex(indexName, query);

      // First doc should have total calculated
      expect(esqlResult.documentsOrdered[1]).toStrictEqual(
        expect.objectContaining({
          total: 50,
        })
      );

      // Second doc should have total unchanged (null) because quantity is missing
      expect(esqlResult.documentsOrdered[2]).toStrictEqual(
        expect.objectContaining({
          total: null,
        })
      );
    }
  );

  // === Validation Errors for Rejected Functions ===
  apiTest('should throw errors for unsupported functions and invalid syntax', async () => {
    const rejectedCases = [
      { expression: 'abs(value)', pattern: /abs.*not supported/i },
      { expression: 'sqrt(value)', pattern: /sqrt.*not supported/i },
      { expression: 'pow(base, 2)', pattern: /pow.*not supported/i },
      { expression: 'mod(value, 3)', pattern: /mod.*not supported/i },
      { expression: 'pi()', pattern: /pi.*not supported/i },
      { expression: 'round(value)', pattern: /round.*not supported/i },
      { expression: 'mean(values)', pattern: /mean.*not supported/i },
      { expression: 'price * * quantity', pattern: /parse/i }, // Invalid syntax
    ];

    for (const { expression, pattern } of rejectedCases) {
      const streamlangDSL: StreamlangDSL = {
        steps: [{ action: 'math', expression, to: 'result' } as MathProcessor],
      };
      expect(() => transpile(streamlangDSL)).toThrow(pattern);
    }
  });
});
