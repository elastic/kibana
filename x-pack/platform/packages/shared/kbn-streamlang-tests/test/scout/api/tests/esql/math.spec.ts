/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout';
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

  // === Custom Behaviors: mod and neq ===
  apiTest('should compute mod (modulus) operation', async ({ testBed, esql }) => {
    const indexName = 'stream-e2e-test-math-mod';

    const streamlangDSL: StreamlangDSL = {
      steps: [
        {
          action: 'math',
          expression: 'mod(value, 3)',
          to: 'remainder',
        } as MathProcessor,
      ],
    };

    const { query } = transpile(streamlangDSL);

    const docs = [{ value: 10 }];
    await testBed.ingest(indexName, docs);
    const esqlResult = await esql.queryOnIndex(indexName, query);

    expect(esqlResult.documents[0]).toStrictEqual(
      expect.objectContaining({
        remainder: 1,
      })
    );
  });

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

  // === Math Functions ===
  apiTest('should compute abs function', async ({ testBed, esql }) => {
    const indexName = 'stream-e2e-test-math-abs';

    const streamlangDSL: StreamlangDSL = {
      steps: [
        {
          action: 'math',
          expression: 'abs(value)',
          to: 'absolute',
        } as MathProcessor,
      ],
    };

    const { query } = transpile(streamlangDSL);

    const docs = [{ value: -42 }];
    await testBed.ingest(indexName, docs);
    const esqlResult = await esql.queryOnIndex(indexName, query);

    expect(esqlResult.documents[0]).toStrictEqual(
      expect.objectContaining({
        absolute: 42,
      })
    );
  });

  apiTest('should compute sqrt function', async ({ testBed, esql }) => {
    const indexName = 'stream-e2e-test-math-sqrt';

    const streamlangDSL: StreamlangDSL = {
      steps: [
        {
          action: 'math',
          expression: 'sqrt(value)',
          to: 'root',
        } as MathProcessor,
      ],
    };

    const { query } = transpile(streamlangDSL);

    const docs = [{ value: 144 }];
    await testBed.ingest(indexName, docs);
    const esqlResult = await esql.queryOnIndex(indexName, query);

    expect(esqlResult.documents[0]).toStrictEqual(
      expect.objectContaining({
        root: 12,
      })
    );
  });

  apiTest('should compute pow function', async ({ testBed, esql }) => {
    const indexName = 'stream-e2e-test-math-pow';

    const streamlangDSL: StreamlangDSL = {
      steps: [
        {
          action: 'math',
          expression: 'pow(base, exponent)',
          to: 'result',
        } as MathProcessor,
      ],
    };

    const { query } = transpile(streamlangDSL);

    const docs = [{ base: 2, exponent: 3 }];
    await testBed.ingest(indexName, docs);
    const esqlResult = await esql.queryOnIndex(indexName, query);

    expect(esqlResult.documents[0]).toStrictEqual(
      expect.objectContaining({
        result: 8,
      })
    );
  });

  // === Variable Arity Functions ===
  apiTest('should compute round with 1 argument', async ({ testBed, esql }) => {
    const indexName = 'stream-e2e-test-math-round-1arg';

    const streamlangDSL: StreamlangDSL = {
      steps: [
        {
          action: 'math',
          expression: 'round(value)',
          to: 'rounded',
        } as MathProcessor,
      ],
    };

    const { query } = transpile(streamlangDSL);

    const docs = [{ value: 3.7 }];
    await testBed.ingest(indexName, docs);
    const esqlResult = await esql.queryOnIndex(indexName, query);

    expect(esqlResult.documents[0]).toStrictEqual(
      expect.objectContaining({
        rounded: 4,
      })
    );
  });

  apiTest('should compute round with 2 arguments (decimal places)', async ({ testBed, esql }) => {
    const indexName = 'stream-e2e-test-math-round-2arg';

    const streamlangDSL: StreamlangDSL = {
      steps: [
        {
          action: 'math',
          expression: 'round(value, 2)',
          to: 'rounded',
        } as MathProcessor,
      ],
    };

    const { query } = transpile(streamlangDSL);

    const docs = [{ value: 3.14159 }];
    await testBed.ingest(indexName, docs);
    const esqlResult = await esql.queryOnIndex(indexName, query);

    expect(esqlResult.documents[0]).toStrictEqual(
      expect.objectContaining({
        rounded: 3.14,
      })
    );
  });

  apiTest('should compute log with 1 argument (natural log)', async ({ testBed, esql }) => {
    const indexName = 'stream-e2e-test-math-log-1arg';

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

  apiTest('should compute log with 2 arguments (custom base)', async ({ testBed, esql }) => {
    const indexName = 'stream-e2e-test-math-log-2arg';

    const streamlangDSL: StreamlangDSL = {
      steps: [
        {
          action: 'math',
          expression: 'log(value, 2)',
          to: 'result',
        } as MathProcessor,
      ],
    };

    const { query } = transpile(streamlangDSL);

    // log base 2 of 8 = 3
    const docs = [{ value: 8 }];
    await testBed.ingest(indexName, docs);
    const esqlResult = await esql.queryOnIndex(indexName, query);

    expect(esqlResult.documents[0]).toStrictEqual(
      expect.objectContaining({
        result: 3,
      })
    );
  });

  // === Comparison Operators ===
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

  // === Constants ===
  apiTest('should use pi constant in expressions', async ({ testBed, esql }) => {
    const indexName = 'stream-e2e-test-math-pi';

    const streamlangDSL: StreamlangDSL = {
      steps: [
        {
          action: 'math',
          expression: 'pi() * radius * radius',
          to: 'area',
        } as MathProcessor,
      ],
    };

    const { query } = transpile(streamlangDSL);

    const docs = [{ radius: 1 }];
    await testBed.ingest(indexName, docs);
    const esqlResult = await esql.queryOnIndex(indexName, query);

    const area = esqlResult.documents[0].area as number;
    expect(area).toBeCloseTo(Math.PI, 5);
  });

  apiTest('should use e constant in expressions', async ({ testBed, esql }) => {
    const indexName = 'stream-e2e-test-math-e';

    const streamlangDSL: StreamlangDSL = {
      steps: [
        {
          action: 'math',
          expression: 'e()',
          to: 'euler',
        } as MathProcessor,
      ],
    };

    const { query } = transpile(streamlangDSL);

    const docs = [{ dummy: 1 }];
    await testBed.ingest(indexName, docs);
    const esqlResult = await esql.queryOnIndex(indexName, query);

    const euler = esqlResult.documents[0].euler as number;
    expect(euler).toBeCloseTo(Math.E, 5);
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

  // === Validation Errors ===
  apiTest('should throw error for unsupported function', async () => {
    const streamlangDSL: StreamlangDSL = {
      steps: [
        {
          action: 'math',
          expression: 'mean(values)',
          to: 'avg',
        } as MathProcessor,
      ],
    };

    expect(() => transpile(streamlangDSL)).toThrow(/Function 'mean' is not supported/);
  });

  apiTest('should throw error for invalid syntax', async () => {
    const streamlangDSL: StreamlangDSL = {
      steps: [
        {
          action: 'math',
          expression: 'price * * quantity', // Invalid double operator
          to: 'total',
        } as MathProcessor,
      ],
    };

    expect(() => transpile(streamlangDSL)).toThrow(/parse/i);
  });
});
