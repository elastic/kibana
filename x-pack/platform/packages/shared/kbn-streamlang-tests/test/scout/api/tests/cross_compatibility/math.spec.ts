/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/api';
import type { MathProcessor, StreamlangDSL } from '@kbn/streamlang';
import { transpileIngestPipeline, transpileEsql } from '@kbn/streamlang';
import { streamlangApiTest as apiTest } from '../..';

apiTest.describe('Cross-compatibility - Math Processor', { tag: ['@ess', '@svlOblt'] }, () => {
  // *** Compatible Cases ***

  apiTest('should compute multiplication of fields', async ({ testBed, esql }) => {
    const streamlangDSL: StreamlangDSL = {
      steps: [
        {
          action: 'math',
          expression: 'price * quantity',
          to: 'total',
        } as MathProcessor,
      ],
    };

    const { processors } = transpileIngestPipeline(streamlangDSL);
    const { query } = transpileEsql(streamlangDSL);

    const docs = [{ price: 10, quantity: 5 }];
    await testBed.ingest('ingest-math-multiply', docs, processors);
    const ingestResult = await testBed.getDocsOrdered('ingest-math-multiply');

    await testBed.ingest('esql-math-multiply', docs);
    const esqlResult = await esql.queryOnIndex('esql-math-multiply', query);

    expect(ingestResult[0]?.total).toBe(50);
    expect(esqlResult.documentsOrdered[0]).toStrictEqual(expect.objectContaining({ total: 50 }));
  });

  apiTest('should compute with nested field paths', async ({ testBed, esql }) => {
    const streamlangDSL: StreamlangDSL = {
      steps: [
        {
          action: 'math',
          expression: 'attributes.price * attributes.quantity',
          to: 'attributes.total',
        } as MathProcessor,
      ],
    };

    const { processors } = transpileIngestPipeline(streamlangDSL);
    const { query } = transpileEsql(streamlangDSL);

    const docs = [{ attributes: { price: 25, quantity: 4 } }];
    await testBed.ingest('ingest-math-nested', docs, processors);
    const ingestResult = await testBed.getDocsOrdered('ingest-math-nested');

    await testBed.ingest('esql-math-nested', docs);
    const esqlResult = await esql.queryOnIndex('esql-math-nested', query);

    // Ingest pipeline uses flat key storage: attributes.total as separate key
    const ingestDoc = ingestResult[0] as Record<string, unknown>;
    expect(ingestDoc['attributes.total']).toBe(100);
    // ES|QL also produces a flat key
    expect(esqlResult.documentsOrdered[0]).toStrictEqual(
      expect.objectContaining({ 'attributes.total': 100 })
    );
  });

  apiTest(
    'integer division - both engines truncate for integer-typed fields',
    async ({ testBed, esql }) => {
      const streamlangDSL: StreamlangDSL = {
        steps: [
          {
            action: 'math',
            expression: 'intVal / divisor',
            to: 'result',
          } as MathProcessor,
        ],
      };

      const { processors } = transpileIngestPipeline(streamlangDSL);
      const { query } = transpileEsql(streamlangDSL);

      // Use integer values - both engines will do integer division
      const docs = [{ intVal: 10, divisor: 3.0 }];

      // Test Ingest Pipeline (Painless)
      await testBed.ingest('ingest-math-int-div', docs, processors);
      const ingestResult = await testBed.getDocsOrdered('ingest-math-int-div');
      const ingestValue = (ingestResult[0] as Record<string, unknown>).result as number;

      // Test ES|QL
      await testBed.ingest('esql-math-int-div', docs);
      const esqlResult = await esql.queryOnIndex('esql-math-int-div', query);
      const esqlValue = esqlResult.documentsOrdered[0].result as number;

      // Both engines: integer division truncates - 10 / 3.0 = 3
      expect(ingestValue).toBe(3);
      expect(esqlValue).toBe(3);

      // Both produce the same result for integer-typed fields
      expect(ingestValue).toBe(esqlValue);
    }
  );

  // === Log Function ===
  apiTest('should compute log (natural log) consistently', async ({ testBed, esql }) => {
    const streamlangDSL: StreamlangDSL = {
      steps: [
        {
          action: 'math',
          expression: 'log(value)',
          to: 'result',
        } as MathProcessor,
      ],
    };

    const { processors } = transpileIngestPipeline(streamlangDSL);
    const { query } = transpileEsql(streamlangDSL);

    // log(e) = 1
    const docs = [{ value: 2.718281828459045 }];

    await testBed.ingest('ingest-math-log', docs, processors);
    const ingestResult = await testBed.getDocsOrdered('ingest-math-log');

    await testBed.ingest('esql-math-log', docs);
    const esqlResult = await esql.queryOnIndex('esql-math-log', query);

    const ingestValue = (ingestResult[0] as Record<string, unknown>).result as number;
    const esqlValue = esqlResult.documentsOrdered[0].result as number;

    expect(ingestValue).toBeCloseTo(1, 5);
    expect(esqlValue).toBeCloseTo(1, 5);
    // Floating-point precision differs slightly between engines
    expect(ingestValue).toBeCloseTo(esqlValue, 5);
  });

  // === Comparison Operators ===
  apiTest('should compute neq (not equal) consistently', async ({ testBed, esql }) => {
    const streamlangDSL: StreamlangDSL = {
      steps: [
        {
          action: 'math',
          expression: 'neq(a, b)', // neq is a custom function registered for tinymath
          to: 'not_equal',
        } as MathProcessor,
      ],
    };

    const { processors } = transpileIngestPipeline(streamlangDSL);
    const { query } = transpileEsql(streamlangDSL);

    const docs = [
      { order_id: 1, a: 5, b: 3 },
      { order_id: 2, a: 5, b: 5 },
    ];
    await testBed.ingest('ingest-math-neq', docs, processors);
    const ingestResult = await testBed.getDocsOrdered('ingest-math-neq');

    await testBed.ingest('esql-math-neq', docs);
    const esqlResult = await esql.queryOnIndex('esql-math-neq', query);

    expect(ingestResult[0]?.not_equal).toBe(true);
    expect(esqlResult.documentsOrdered[0]).toStrictEqual(
      expect.objectContaining({ not_equal: true })
    );
    expect(ingestResult[1]?.not_equal).toBe(false);
    expect(esqlResult.documentsOrdered[1]).toStrictEqual(
      expect.objectContaining({ not_equal: false })
    );
  });

  apiTest('should compute gt (greater than) consistently', async ({ testBed, esql }) => {
    const streamlangDSL: StreamlangDSL = {
      steps: [
        {
          action: 'math',
          expression: 'gt(a, b)',
          to: 'a_greater',
        } as MathProcessor,
      ],
    };

    const { processors } = transpileIngestPipeline(streamlangDSL);
    const { query } = transpileEsql(streamlangDSL);

    const docs = [
      { order_id: 1, a: 10, b: 5 },
      { order_id: 2, a: 3, b: 7 },
    ];
    await testBed.ingest('ingest-math-gt', docs, processors);
    const ingestResult = await testBed.getDocsOrdered('ingest-math-gt');

    await testBed.ingest('esql-math-gt', docs);
    const esqlResult = await esql.queryOnIndex('esql-math-gt', query);

    expect(ingestResult[0]?.a_greater).toBe(true);
    expect(esqlResult.documentsOrdered[0]).toStrictEqual(
      expect.objectContaining({ a_greater: true })
    );
    expect(ingestResult[1]?.a_greater).toBe(false);
    expect(esqlResult.documentsOrdered[1]).toStrictEqual(
      expect.objectContaining({ a_greater: false })
    );
  });

  apiTest('should compute eq (equality) consistently', async ({ testBed, esql }) => {
    const streamlangDSL: StreamlangDSL = {
      steps: [
        {
          action: 'math',
          expression: 'eq(a, b)',
          to: 'equal',
        } as MathProcessor,
      ],
    };

    const { processors } = transpileIngestPipeline(streamlangDSL);
    const { query } = transpileEsql(streamlangDSL);

    const docs = [
      { order_id: 1, a: 5, b: 5.0 },
      { order_id: 2, a: 5, b: 3.0 },
    ];
    await testBed.ingest('ingest-math-eq', docs, processors);
    const ingestResult = await testBed.getDocsOrdered('ingest-math-eq');

    await testBed.ingest('esql-math-eq', docs);
    const esqlResult = await esql.queryOnIndex('esql-math-eq', query);

    expect(ingestResult[0]?.equal).toBe(true);
    expect(esqlResult.documentsOrdered[0]).toStrictEqual(expect.objectContaining({ equal: true }));
    expect(ingestResult[1]?.equal).toBe(false);
    expect(esqlResult.documentsOrdered[1]).toStrictEqual(expect.objectContaining({ equal: false }));
  });

  // === Function Availability ===
  // This test validates that ALL supported math functions are available in both
  // ES|QL and Painless. It serves as a smoke test to catch typos or non-existent functions.
  apiTest(
    'should validate all supported functions are available in both transpilers',
    async ({ testBed, esql }) => {
      // We test each function with valid inputs to ensure:
      // 1. The function name is correctly mapped (no typos)
      // 2. The function exists in both ES|QL and Painless (Math.xyz)
      //
      // Note: The math processor has a minimal function set for OTTL compatibility:
      // - Arithmetic: +, -, *, /
      // - Logarithmic: log (natural log only)
      // - Comparison: eq, neq, lt, lte, gt, gte
      const streamlangDSL: StreamlangDSL = {
        steps: [
          // Logarithmic function
          { action: 'math', expression: 'log(val)', to: 'r_log' } as MathProcessor,

          // Comparison operators (return boolean)
          { action: 'math', expression: 'eq(small, small)', to: 'r_eq' } as MathProcessor,
          { action: 'math', expression: 'neq(small, val)', to: 'r_neq' } as MathProcessor,
          { action: 'math', expression: 'lt(small, val)', to: 'r_lt' } as MathProcessor,
          { action: 'math', expression: 'lte(small, val)', to: 'r_lte' } as MathProcessor,
          { action: 'math', expression: 'gt(val, small)', to: 'r_gt' } as MathProcessor,
          { action: 'math', expression: 'gte(val, small)', to: 'r_gte' } as MathProcessor,

          // Arithmetic operators
          { action: 'math', expression: 'val + small', to: 'r_add' } as MathProcessor,
          { action: 'math', expression: 'val - small', to: 'r_sub' } as MathProcessor,
          { action: 'math', expression: 'val * small', to: 'r_mul' } as MathProcessor,
          { action: 'math', expression: 'val / small', to: 'r_div' } as MathProcessor,
        ],
      };

      const { processors } = transpileIngestPipeline(streamlangDSL);
      const { query } = transpileEsql(streamlangDSL);

      // Use values that work for all functions:
      // - val: 4 (positive, good for log)
      // - small: 1 (small positive)
      const docs = [{ val: 4, small: 1 }];

      // Test Ingest Pipeline (Painless) - all functions should work
      await testBed.ingest('ingest-all-functions', docs, processors);
      const ingestResult = await testBed.getDocsOrdered('ingest-all-functions');
      expect(ingestResult).toHaveLength(1);

      // Verify a sample of results to confirm functions executed
      const ingestDoc = ingestResult[0] as Record<string, unknown>;
      expect(ingestDoc.r_log).toBeCloseTo(Math.log(4), 5);
      expect(ingestDoc.r_eq).toBe(true);
      expect(ingestDoc.r_neq).toBe(true);
      expect(ingestDoc.r_lt).toBe(true);
      expect(ingestDoc.r_gt).toBe(true);
      expect(ingestDoc.r_add).toBe(5);
      expect(ingestDoc.r_mul).toBe(4);

      // Test ES|QL - all functions should work
      await testBed.ingest('esql-all-functions', docs);
      const esqlResult = await esql.queryOnIndex('esql-all-functions', query);
      expect(esqlResult.documentsOrdered).toHaveLength(1);

      // Verify same sample of results
      const esqlDoc = esqlResult.documentsOrdered[0];
      expect(esqlDoc.r_log).toBeCloseTo(Math.log(4), 5);
      expect(esqlDoc.r_eq).toBe(true);
      expect(esqlDoc.r_neq).toBe(true);
      expect(esqlDoc.r_lt).toBe(true);
      expect(esqlDoc.r_gt).toBe(true);
      expect(esqlDoc.r_add).toBe(5);
      expect(esqlDoc.r_mul).toBe(4);
    }
  );

  // === Validation Errors (consistent rejection) ===
  apiTest(
    'should consistently reject unsupported functions and invalid syntax in both transpilers',
    async ({ testBed }) => {
      const rejectedCases = [
        { expression: 'abs(value)', pattern: /abs.*not supported/i, doc: { value: -42 } },
        { expression: 'mean(values)', pattern: /mean.*not supported/i, doc: { values: 10 } },
        { expression: 'price * * quantity', pattern: /parse/i, doc: { price: 10, quantity: 5 } },
      ];

      for (let i = 0; i < rejectedCases.length; i++) {
        const { expression, pattern, doc } = rejectedCases[i];
        const streamlangDSL: StreamlangDSL = {
          steps: [{ action: 'math', expression, to: 'result' } as MathProcessor],
        };

        // Ingest pipeline: generates error-throwing script, error at runtime
        const { processors } = transpileIngestPipeline(streamlangDSL);
        const { errors } = await testBed.ingest(`cross-reject-${i}`, [doc], processors);
        expect(errors.length).toBeGreaterThan(0);
        expect(errors[0].caused_by?.reason).toMatch(pattern);

        // ES|QL: throws during transpilation
        expect(() => transpileEsql(streamlangDSL)).toThrow(pattern);
      }
    }
  );

  // *** Incompatible / Partially Compatible Cases ***
  // Note that the Incompatible test suite doesn't necessarily mean the features are functionally incompatible,
  // rather it highlights the nuanced behavioral differences in certain edge cases among transpilers.

  apiTest(
    'INCOMPATIBLE: division by zero - Painless throws error, ES|QL returns null (Infinity)',
    async ({ testBed, esql }) => {
      /**
       * INCOMPATIBILITY: Division by zero behavior
       *
       * - Painless (Ingest Pipeline): Throws ArithmeticException "/ by zero"
       *   The script processor fails and the document is not indexed.
       *
       * - ES|QL: Returns Infinity (IEEE 754 floating-point standard)
       *   The query completes successfully. When materializing to typed columns,
       *   Infinity becomes null.
       *
       * This is a fundamental difference in how each engine handles arithmetic errors.
       * Painless follows Java's integer division semantics (throws on /0),
       * while ES|QL follows IEEE 754 floating-point semantics (returns Infinity → null).
       */
      const streamlangDSL: StreamlangDSL = {
        steps: [
          {
            action: 'math',
            expression: 'numerator / denominator',
            to: 'result',
          } as MathProcessor,
        ],
      };

      const { processors } = transpileIngestPipeline(streamlangDSL);
      const { query } = transpileEsql(streamlangDSL);

      const docs = [{ numerator: 10, denominator: 0 }];

      // Ingest Pipeline (Painless): Throws ArithmeticException
      const { errors } = await testBed.ingest('ingest-math-div-zero', docs, processors);
      expect(errors).toHaveLength(1);
      expect(errors[0].type).toBe('script_exception');
      expect(errors[0].caused_by?.reason).toContain('/ by zero');

      // Document should not be ingested due to script error
      const ingestResult = await testBed.getDocsOrdered('ingest-math-div-zero');
      expect(ingestResult).toHaveLength(0);

      // ES|QL follows IEEE 754: 10/0 = Infinity, which becomes null in typed columns
      await testBed.ingest('esql-math-div-zero', docs);
      const esqlResult = await esql.queryOnIndex('esql-math-div-zero', query);
      const esqlValue = esqlResult.documentsOrdered[0].result;
      expect(esqlValue).toBeNull();
    }
  );

  apiTest(
    'INCOMPATIBLE: log of zero - Painless returns "-Infinity" string, ES|QL returns null',
    async ({ testBed, esql }) => {
      /**
       * INCOMPATIBILITY: log of zero behavior
       *
       * - Painless (Ingest Pipeline): Returns the string "-Infinity"
       *   Math.log(0) in Java returns Double.NEGATIVE_INFINITY, which gets serialized.
       *
       * - ES|QL: Returns null
       *   ES|QL's LOG function returns null for invalid inputs (zero).
       */
      const streamlangDSL: StreamlangDSL = {
        steps: [
          {
            action: 'math',
            expression: 'log(value)',
            to: 'result',
          } as MathProcessor,
        ],
      };

      const { processors } = transpileIngestPipeline(streamlangDSL);
      const { query } = transpileEsql(streamlangDSL);

      const docs = [{ value: 0 }];

      // Test Ingest Pipeline (Painless)
      await testBed.ingest('ingest-math-log-zero', docs, processors);
      const ingestResult = await testBed.getDocsOrdered('ingest-math-log-zero');
      const ingestValue = (ingestResult[0] as Record<string, unknown>).result;

      // Test ES|QL
      await testBed.ingest('esql-math-log-zero', docs);
      const esqlResult = await esql.queryOnIndex('esql-math-log-zero', query);
      const esqlValue = esqlResult.documentsOrdered[0].result;

      // Painless: log(0) returns "-Infinity" as a string
      expect(ingestValue).toBe('-Infinity');

      // ES|QL: log(0) returns null
      expect(esqlValue).toBeNull();
    }
  );
});
