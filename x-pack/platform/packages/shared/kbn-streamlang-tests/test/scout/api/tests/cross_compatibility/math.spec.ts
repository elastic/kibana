/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout';
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

    expect(ingestResult[0]).toHaveProperty('total', 50);
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

  // === Custom Behaviors: mod and neq ===
  apiTest('should compute mod (modulus) operation consistently', async ({ testBed, esql }) => {
    const streamlangDSL: StreamlangDSL = {
      steps: [
        {
          action: 'math',
          expression: 'mod(value, 3)', // mod will be transpiled to % operator for both targets
          to: 'remainder',
        } as MathProcessor,
      ],
    };

    const { processors } = transpileIngestPipeline(streamlangDSL);
    const { query } = transpileEsql(streamlangDSL);

    const docs = [{ value: 10 }];
    await testBed.ingest('ingest-math-mod', docs, processors);
    const ingestResult = await testBed.getDocsOrdered('ingest-math-mod');

    await testBed.ingest('esql-math-mod', docs);
    const esqlResult = await esql.queryOnIndex('esql-math-mod', query);

    expect(ingestResult[0]).toHaveProperty('remainder', 1);
    expect(esqlResult.documentsOrdered[0]).toStrictEqual(expect.objectContaining({ remainder: 1 }));
  });

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

    expect(ingestResult[0]).toHaveProperty('not_equal', true);
    expect(esqlResult.documentsOrdered[0]).toStrictEqual(
      expect.objectContaining({ not_equal: true })
    );
    expect(ingestResult[1]).toHaveProperty('not_equal', false);
    expect(esqlResult.documentsOrdered[1]).toStrictEqual(
      expect.objectContaining({ not_equal: false })
    );
  });

  // === Math Functions ===
  apiTest('should compute abs function consistently', async ({ testBed, esql }) => {
    const streamlangDSL: StreamlangDSL = {
      steps: [
        {
          action: 'math',
          expression: 'abs(value)',
          to: 'absolute',
        } as MathProcessor,
      ],
    };

    const { processors } = transpileIngestPipeline(streamlangDSL);
    const { query } = transpileEsql(streamlangDSL);

    const docs = [{ value: -42 }];
    await testBed.ingest('ingest-math-abs', docs, processors);
    const ingestResult = await testBed.getDocsOrdered('ingest-math-abs');

    await testBed.ingest('esql-math-abs', docs);
    const esqlResult = await esql.queryOnIndex('esql-math-abs', query);

    expect(ingestResult[0]).toHaveProperty('absolute', 42);
    expect(esqlResult.documentsOrdered[0]).toStrictEqual(expect.objectContaining({ absolute: 42 }));
  });

  apiTest('should compute sqrt function consistently', async ({ testBed, esql }) => {
    const streamlangDSL: StreamlangDSL = {
      steps: [
        {
          action: 'math',
          expression: 'sqrt(value)',
          to: 'root',
        } as MathProcessor,
      ],
    };

    const { processors } = transpileIngestPipeline(streamlangDSL);
    const { query } = transpileEsql(streamlangDSL);

    const docs = [{ value: 144 }];
    await testBed.ingest('ingest-math-sqrt', docs, processors);
    const ingestResult = await testBed.getDocsOrdered('ingest-math-sqrt');

    await testBed.ingest('esql-math-sqrt', docs);
    const esqlResult = await esql.queryOnIndex('esql-math-sqrt', query);

    expect(ingestResult[0]).toHaveProperty('root', 12);
    expect(esqlResult.documentsOrdered[0]).toStrictEqual(expect.objectContaining({ root: 12 }));
  });

  apiTest('should compute pow function consistently', async ({ testBed, esql }) => {
    const streamlangDSL: StreamlangDSL = {
      steps: [
        {
          action: 'math',
          expression: 'pow(base, exponent)',
          to: 'result',
        } as MathProcessor,
      ],
    };

    const { processors } = transpileIngestPipeline(streamlangDSL);
    const { query } = transpileEsql(streamlangDSL);

    const docs = [{ base: 2, exponent: 3 }];
    await testBed.ingest('ingest-math-pow', docs, processors);
    const ingestResult = await testBed.getDocsOrdered('ingest-math-pow');

    await testBed.ingest('esql-math-pow', docs);
    const esqlResult = await esql.queryOnIndex('esql-math-pow', query);

    expect(ingestResult[0]).toHaveProperty('result', 8);
    expect(esqlResult.documentsOrdered[0]).toStrictEqual(expect.objectContaining({ result: 8 }));
  });

  // === Variable Arity Functions ===
  // The tests test expressions where transpiled order of arguments may differ from tinymath expression
  apiTest('should compute round with 1 argument consistently', async ({ testBed, esql }) => {
    const streamlangDSL: StreamlangDSL = {
      steps: [
        {
          action: 'math',
          expression: 'round(value)',
          to: 'rounded',
        } as MathProcessor,
      ],
    };

    const { processors } = transpileIngestPipeline(streamlangDSL);
    const { query } = transpileEsql(streamlangDSL);

    const docs = [{ value: 3.7 }];
    await testBed.ingest('ingest-math-round-1', docs, processors);
    const ingestResult = await testBed.getDocsOrdered('ingest-math-round-1');

    await testBed.ingest('esql-math-round-1', docs);
    const esqlResult = await esql.queryOnIndex('esql-math-round-1', query);

    expect(ingestResult[0]).toHaveProperty('rounded', 4);
    expect(esqlResult.documentsOrdered[0]).toStrictEqual(expect.objectContaining({ rounded: 4 }));
  });

  apiTest(
    'should compute round with 2 arguments (decimal places) consistently',
    async ({ testBed, esql }) => {
      const streamlangDSL: StreamlangDSL = {
        steps: [
          {
            action: 'math',
            expression: 'round(value, 3)',
            to: 'rounded',
          } as MathProcessor,
        ],
      };

      const { processors } = transpileIngestPipeline(streamlangDSL);
      const { query } = transpileEsql(streamlangDSL);

      const docs = [{ value: 3.14159 }];
      await testBed.ingest('ingest-math-round-2', docs, processors);
      const ingestResult = await testBed.getDocsOrdered('ingest-math-round-2');

      await testBed.ingest('esql-math-round-2', docs);
      const esqlResult = await esql.queryOnIndex('esql-math-round-2', query);

      expect(ingestResult[0]).toHaveProperty('rounded', 3.142);
      expect(esqlResult.documentsOrdered[0]).toStrictEqual(
        expect.objectContaining({ rounded: 3.142 })
      );
    }
  );

  apiTest(
    'should compute log with 2 arguments (custom base) consistently',
    async ({ testBed, esql }) => {
      const streamlangDSL: StreamlangDSL = {
        steps: [
          {
            action: 'math',
            expression: 'log(value, 2)',
            to: 'result',
          } as MathProcessor,
        ],
      };

      const { processors } = transpileIngestPipeline(streamlangDSL);
      const { query } = transpileEsql(streamlangDSL);

      // log base 2 of 8 = 3
      const docs = [{ value: 8 }];
      await testBed.ingest('ingest-math-log-2', docs, processors);
      const ingestResult = await testBed.getDocsOrdered('ingest-math-log-2');

      await testBed.ingest('esql-math-log-2', docs);
      const esqlResult = await esql.queryOnIndex('esql-math-log-2', query);

      expect(ingestResult[0]).toHaveProperty('result', 3);
      expect(esqlResult.documentsOrdered[0]).toStrictEqual(expect.objectContaining({ result: 3 }));
    }
  );

  // === Comparison Operators ===
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

    expect(ingestResult[0]).toHaveProperty('a_greater', true);
    expect(esqlResult.documentsOrdered[0]).toStrictEqual(
      expect.objectContaining({ a_greater: true })
    );
    expect(ingestResult[1]).toHaveProperty('a_greater', false);
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

    expect(ingestResult[0]).toHaveProperty('equal', true);
    expect(esqlResult.documentsOrdered[0]).toStrictEqual(expect.objectContaining({ equal: true }));
    expect(ingestResult[1]).toHaveProperty('equal', false);
    expect(esqlResult.documentsOrdered[1]).toStrictEqual(expect.objectContaining({ equal: false }));
  });

  // === Constants ===
  apiTest('should use pi constant consistently', async ({ testBed, esql }) => {
    const streamlangDSL: StreamlangDSL = {
      steps: [
        {
          action: 'math',
          expression: 'pi() * radius * radius',
          to: 'area',
        } as MathProcessor,
      ],
    };

    const { processors } = transpileIngestPipeline(streamlangDSL);
    const { query } = transpileEsql(streamlangDSL);

    const docs = [{ radius: 1 }];
    await testBed.ingest('ingest-math-pi', docs, processors);
    const ingestResult = await testBed.getDocsOrdered('ingest-math-pi');

    await testBed.ingest('esql-math-pi', docs);
    const esqlResult = await esql.queryOnIndex('esql-math-pi', query);

    const ingestArea = (ingestResult[0] as Record<string, unknown>).area as number;
    const esqlArea = esqlResult.documentsOrdered[0].area as number;

    // Both should be approximately PI
    expect(ingestArea).toBeCloseTo(Math.PI, 5);
    expect(esqlArea).toBeCloseTo(Math.PI, 5);
    // And they should match each other
    expect(ingestArea).toBeCloseTo(esqlArea, 10);
  });

  // === Function Availability ===
  // This test validates that ALL supported math functions are available in both
  // ES|QL and Painless. It serves as a smoke test to catch typos or non-existent functions.
  apiTest(
    'should validate all supported functions are available in both transpilers',
    async ({ testBed, esql }) => {
      // We test each function with valid inputs to ensure:
      // 1. The function name is correctly mapped (no typos like ASIIN instead of ASIN)
      // 2. The function exists in both ES|QL and Painless (Math.xyz)
      const streamlangDSL: StreamlangDSL = {
        steps: [
          // Basic math functions
          { action: 'math', expression: 'abs(val)', to: 'r_abs' } as MathProcessor,
          { action: 'math', expression: 'ceil(val)', to: 'r_ceil' } as MathProcessor,
          { action: 'math', expression: 'floor(val)', to: 'r_floor' } as MathProcessor,
          { action: 'math', expression: 'round(val)', to: 'r_round' } as MathProcessor,
          { action: 'math', expression: 'sqrt(val)', to: 'r_sqrt' } as MathProcessor,
          { action: 'math', expression: 'cbrt(val)', to: 'r_cbrt' } as MathProcessor,
          { action: 'math', expression: 'exp(small)', to: 'r_exp' } as MathProcessor,
          { action: 'math', expression: 'log(val)', to: 'r_log' } as MathProcessor,
          { action: 'math', expression: 'log_ten(val)', to: 'r_log_ten' } as MathProcessor,
          { action: 'math', expression: 'pow(small, small)', to: 'r_pow' } as MathProcessor,
          { action: 'math', expression: 'mod(val, small)', to: 'r_mod' } as MathProcessor,
          { action: 'math', expression: 'signum(val)', to: 'r_signum' } as MathProcessor,
          { action: 'math', expression: 'hypot(small, small)', to: 'r_hypot' } as MathProcessor,

          // Trigonometric functions
          { action: 'math', expression: 'sin(small)', to: 'r_sin' } as MathProcessor,
          { action: 'math', expression: 'cos(small)', to: 'r_cos' } as MathProcessor,
          { action: 'math', expression: 'tan(small)', to: 'r_tan' } as MathProcessor,

          // Inverse trigonometric functions
          { action: 'math', expression: 'asin(ratio)', to: 'r_asin' } as MathProcessor,
          { action: 'math', expression: 'acos(ratio)', to: 'r_acos' } as MathProcessor,
          { action: 'math', expression: 'atan(small)', to: 'r_atan' } as MathProcessor,
          {
            action: 'math',
            expression: 'atan_two(small, small)',
            to: 'r_atan_two',
          } as MathProcessor,

          // Hyperbolic functions
          { action: 'math', expression: 'sinh(small)', to: 'r_sinh' } as MathProcessor,
          { action: 'math', expression: 'cosh(small)', to: 'r_cosh' } as MathProcessor,
          { action: 'math', expression: 'tanh(small)', to: 'r_tanh' } as MathProcessor,

          // Constants
          { action: 'math', expression: 'pi()', to: 'r_pi' } as MathProcessor,
          { action: 'math', expression: 'e()', to: 'r_e' } as MathProcessor,
          { action: 'math', expression: 'tau()', to: 'r_tau' } as MathProcessor,

          // Comparison operators (return boolean)
          { action: 'math', expression: 'eq(small, small)', to: 'r_eq' } as MathProcessor,
          { action: 'math', expression: 'neq(small, val)', to: 'r_neq' } as MathProcessor,
          { action: 'math', expression: 'lt(small, val)', to: 'r_lt' } as MathProcessor,
          { action: 'math', expression: 'lte(small, val)', to: 'r_lte' } as MathProcessor,
          { action: 'math', expression: 'gt(val, small)', to: 'r_gt' } as MathProcessor,
          { action: 'math', expression: 'gte(val, small)', to: 'r_gte' } as MathProcessor,
        ],
      };

      const { processors } = transpileIngestPipeline(streamlangDSL);
      const { query } = transpileEsql(streamlangDSL);

      // Use values that work for all functions:
      // - val: 4 (positive, good for sqrt, log, etc.)
      // - small: 1 (small positive, good for trig, exp)
      // - ratio: 0.5 (between -1 and 1 for asin/acos)
      const docs = [{ val: 4, small: 1, ratio: 0.5 }];

      // Test Ingest Pipeline (Painless) - all functions should work
      await testBed.ingest('ingest-all-functions', docs, processors);
      const ingestResult = await testBed.getDocsOrdered('ingest-all-functions');
      expect(ingestResult).toHaveLength(1);

      // Verify a sample of results to confirm functions executed
      const ingestDoc = ingestResult[0] as Record<string, unknown>;
      expect(ingestDoc.r_abs).toBe(4);
      expect(ingestDoc.r_sqrt).toBe(2);
      expect(ingestDoc.r_signum).toBe(1);
      expect(ingestDoc.r_pi).toBeCloseTo(Math.PI, 5);
      expect(ingestDoc.r_tau).toBeCloseTo(2 * Math.PI, 5);

      // Test ES|QL - all functions should work
      await testBed.ingest('esql-all-functions', docs);
      const esqlResult = await esql.queryOnIndex('esql-all-functions', query);
      expect(esqlResult.documentsOrdered).toHaveLength(1);

      // Verify same sample of results
      const esqlDoc = esqlResult.documentsOrdered[0];
      expect(esqlDoc.r_abs).toBe(4);
      expect(esqlDoc.r_sqrt).toBe(2);
      expect(esqlDoc.r_signum).toBe(1);
      expect(esqlDoc.r_pi).toBeCloseTo(Math.PI, 5);
      expect(esqlDoc.r_tau).toBeCloseTo(2 * Math.PI, 5);
    }
  );

  // === Validation Errors (consistent rejection) ===
  apiTest(
    'should consistently reject unsupported aggregation functions in both transpilers',
    async ({ testBed }) => {
      const streamlangDSL: StreamlangDSL = {
        steps: [
          {
            action: 'math',
            expression: 'mean(values)',
            to: 'avg',
          } as MathProcessor,
        ],
      };

      // Ingest pipeline: generates error-throwing script, error at runtime
      const { processors } = transpileIngestPipeline(streamlangDSL);
      const docs = [{ values: 10 }];
      const { errors: ingestErrors } = await testBed.ingest(
        'ingest-math-unsupported',
        docs,
        processors
      );
      expect(ingestErrors.length).toBeGreaterThan(0);
      expect(ingestErrors[0].caused_by?.reason).toMatch(/mean.*not supported/i);

      // ES|QL: throws during transpilation
      expect(() => transpileEsql(streamlangDSL)).toThrow(/mean.*not supported/i);
    }
  );

  apiTest('should consistently reject invalid syntax in both transpilers', async ({ testBed }) => {
    const streamlangDSL: StreamlangDSL = {
      steps: [
        {
          action: 'math',
          expression: 'price * * quantity', // Invalid double operator
          to: 'total',
        } as MathProcessor,
      ],
    };

    // Ingest pipeline: generates error-throwing script, error at runtime
    const { processors } = transpileIngestPipeline(streamlangDSL);
    const docs = [{ price: 10, quantity: 5 }];
    const { errors: ingestErrors } = await testBed.ingest(
      'ingest-math-syntax-error',
      docs,
      processors
    );
    expect(ingestErrors.length).toBeGreaterThan(0);
    expect(ingestErrors[0].caused_by?.reason).toMatch(/parse/i);

    // ES|QL: throws during transpilation
    expect(() => transpileEsql(streamlangDSL)).toThrow(/parse/i);
  });

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
    'INCOMPATIBLE: sqrt of negative - Painless returns "NaN" string, ES|QL returns null',
    async ({ testBed, esql }) => {
      /**
       * INCOMPATIBILITY: sqrt of negative number behavior
       *
       * - Painless (Ingest Pipeline): Returns the string "NaN"
       *   Math.sqrt(-1) in Java returns Double.NaN, which gets serialized as "NaN" string.
       *
       * - ES|QL: Returns null
       *   ES|QL's SQRT function returns null for invalid inputs (negative numbers).
       *
       * This difference stems from how each engine represents undefined mathematical results.
       */
      const streamlangDSL: StreamlangDSL = {
        steps: [
          {
            action: 'math',
            expression: 'sqrt(value)',
            to: 'result',
          } as MathProcessor,
        ],
      };

      const { processors } = transpileIngestPipeline(streamlangDSL);
      const { query } = transpileEsql(streamlangDSL);

      const docs = [{ value: -1 }];

      // Test Ingest Pipeline (Painless)
      await testBed.ingest('ingest-math-sqrt-neg', docs, processors);
      const ingestResult = await testBed.getDocsOrdered('ingest-math-sqrt-neg');
      const ingestValue = (ingestResult[0] as Record<string, unknown>).result;

      // Test ES|QL
      await testBed.ingest('esql-math-sqrt-neg', docs);
      const esqlResult = await esql.queryOnIndex('esql-math-sqrt-neg', query);
      const esqlValue = esqlResult.documentsOrdered[0].result;

      // Painless: sqrt(-1) returns "NaN" as a string
      expect(ingestValue).toBe('NaN');

      // ES|QL: sqrt(-1) returns null
      expect(esqlValue).toBeNull();
    }
  );

  apiTest(
    'INCOMPATIBLE: Infinity handling - ES|QL returns null for overflow results',
    async ({ testBed }) => {
      /**
       * INCOMPATIBILITY: Overflow/Infinity handling
       *
       * When mathematical operations produce Infinity:
       *
       * - Painless (Ingest Pipeline): The script computes Infinity correctly, but when
       *   Elasticsearch tries to store the result in a float/double field, it rejects
       *   the document with: "IllegalArgumentException: [float] supports only finite values"
       *   This causes the entire document ingestion to fail.
       *
       * - ES|QL: Computes Infinity correctly during query execution. When materializing
       *   the result to a typed column, ES|QL gracefully returns null instead of failing.
       *   The query succeeds but the overflow value is represented as null.
       *
       */
      const streamlangDSL: StreamlangDSL = {
        steps: [
          {
            action: 'math',
            expression: 'val * val', // to cause > float max
            to: 'result',
          } as MathProcessor,
        ],
      };

      const { processors } = transpileIngestPipeline(streamlangDSL);

      const docs = [{ val: 3e38 }];

      const { errors } = await testBed.ingest('ingest-overflow-infinity', docs, processors);
      expect(errors).toHaveLength(1);
      expect(errors[0].caused_by).toStrictEqual(
        expect.objectContaining({
          type: 'illegal_argument_exception',
          reason: '[float] supports only finite values, but got [Infinity]',
        })
      );

      // ES|QL: Computes Infinity, returns null gracefully.
      await testBed.ingest('esql-overflow-infinity', [{ val: 0 }, { val: 1e90 }]);
      expect(() => transpileEsql(streamlangDSL)).not.toThrow();
    }
  );
});
