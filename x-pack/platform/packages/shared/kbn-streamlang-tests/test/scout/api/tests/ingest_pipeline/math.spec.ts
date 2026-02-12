/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout/api';
import { tags } from '@kbn/scout';
import type { MathProcessor, StreamlangDSL } from '@kbn/streamlang';
import { transpile } from '@kbn/streamlang/src/transpilers/ingest_pipeline';
import { streamlangApiTest as apiTest } from '../..';

apiTest.describe(
  'Streamlang to Ingest Pipeline - Math Processor',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    // === Basic Arithmetic ===
    apiTest('should compute multiplication of fields', async ({ testBed }) => {
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

      const { processors } = transpile(streamlangDSL);

      const docs = [{ price: 10, quantity: 5 }];
      await testBed.ingest(indexName, docs, processors);

      const ingestedDocs = await testBed.getDocs(indexName);
      expect(ingestedDocs[0]?.total).toBe(50);
    });

    apiTest('should compute addition of fields', async ({ testBed }) => {
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

      const { processors } = transpile(streamlangDSL);

      const docs = [{ a: 15, b: 25 }];
      await testBed.ingest(indexName, docs, processors);

      const ingestedDocs = await testBed.getDocs(indexName);
      expect(ingestedDocs[0]?.sum).toBe(40);
    });

    apiTest('should compute subtraction of fields', async ({ testBed }) => {
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

      const { processors } = transpile(streamlangDSL);

      const docs = [{ a: 100, b: 30 }];
      await testBed.ingest(indexName, docs, processors);

      const ingestedDocs = await testBed.getDocs(indexName);
      expect(ingestedDocs[0]?.difference).toBe(70);
    });

    apiTest('should compute division of fields', async ({ testBed }) => {
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

      const { processors } = transpile(streamlangDSL);

      const docs = [{ total: 100, count: 4 }];
      await testBed.ingest(indexName, docs, processors);

      const ingestedDocs = await testBed.getDocs(indexName);
      expect(ingestedDocs[0]?.average).toBe(25);
    });

    // === Nested Field Paths ===
    apiTest('should compute with nested field paths', async ({ testBed }) => {
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

      const { processors } = transpile(streamlangDSL);

      const docs = [{ attributes: { price: 25, quantity: 4 } }];
      await testBed.ingest(indexName, docs, processors);

      const ingestedDocs = await testBed.getDocs(indexName);
      const doc = (ingestedDocs as Array<Record<string, unknown>>)[0];
      expect(doc['attributes.total']).toBe(100);
    });

    // === Log Function ===
    apiTest('should compute log (natural log)', async ({ testBed }) => {
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

      const { processors } = transpile(streamlangDSL);

      // log(e) = 1
      const docs = [{ value: 2.718281828459045 }];
      await testBed.ingest(indexName, docs, processors);

      const ingestedDocs = await testBed.getDocs(indexName);
      const result = (ingestedDocs as Array<Record<string, unknown>>)[0].result as number;
      expect(result).toBeCloseTo(1, 5);
    });

    // === Comparison Operators ===
    apiTest('should compute neq (not equal) comparison', async ({ testBed }) => {
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

      const { processors } = transpile(streamlangDSL);

      const docs = [
        { order_id: 1, a: 5, b: 3 },
        { order_id: 2, a: 5, b: 5 },
      ];
      await testBed.ingest(indexName, docs, processors);

      const ingestedDocs = await testBed.getDocsOrdered(indexName);
      expect(ingestedDocs[0]?.not_equal).toBe(true);
      expect(ingestedDocs[1]?.not_equal).toBe(false);
    });

    apiTest('should compute gt (greater than) comparison', async ({ testBed }) => {
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

      const { processors } = transpile(streamlangDSL);

      const docs = [
        { order_id: 1, a: 10, b: 5 },
        { order_id: 2, a: 3, b: 7 },
      ];
      await testBed.ingest(indexName, docs, processors);

      const ingestedDocs = await testBed.getDocsOrdered(indexName);
      expect(ingestedDocs[0]?.a_greater).toBe(true);
      expect(ingestedDocs[1]?.a_greater).toBe(false);
    });

    apiTest('should compute lt (less than) comparison', async ({ testBed }) => {
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

      const { processors } = transpile(streamlangDSL);

      const docs = [
        { order_id: 1, a: 3, b: 7 },
        { order_id: 2, a: 10, b: 5 },
      ];
      await testBed.ingest(indexName, docs, processors);

      const ingestedDocs = await testBed.getDocsOrdered(indexName);
      expect(ingestedDocs[0]?.a_less).toBe(true);
      expect(ingestedDocs[1]?.a_less).toBe(false);
    });

    apiTest('should compute eq (equality) comparison', async ({ testBed }) => {
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

      const { processors } = transpile(streamlangDSL);

      const docs = [
        { order_id: 1, a: 5, b: 5 },
        { order_id: 2, a: 5, b: 3 },
      ];
      await testBed.ingest(indexName, docs, processors);

      const ingestedDocs = await testBed.getDocsOrdered(indexName);
      expect(ingestedDocs[0]?.equal).toBe(true);
      expect(ingestedDocs[1]?.equal).toBe(false);
    });

    // === Where Condition ===
    apiTest('should only apply math when where condition is met', async ({ testBed }) => {
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

      const { processors } = transpile(streamlangDSL);

      const docs = [
        { order_id: 1, price: 10, quantity: 5, active: true },
        { order_id: 2, price: 20, quantity: 3, active: false },
      ];
      await testBed.ingest(indexName, docs, processors);

      const ingestedDocs = await testBed.getDocsOrdered(indexName);
      // Active doc should have total calculated
      expect(ingestedDocs[0]?.total).toBe(50);
      // Inactive doc should not have total field
      expect(ingestedDocs[1]?.total).toBeUndefined();
    });

    // === Ignore Missing ===
    apiTest(
      'should skip calculation when ignore_missing is true and field is missing',
      async ({ testBed }) => {
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

        const { processors } = transpile(streamlangDSL);

        const docs = [
          { order_id: 1, price: 10, quantity: 5 },
          { order_id: 2, price: 20 }, // quantity missing
        ];
        await testBed.ingest(indexName, docs, processors);

        const ingestedDocs = await testBed.getDocsOrdered(indexName);
        // First doc should have total calculated
        expect(ingestedDocs[0]?.total).toBe(50);
        // Second doc should not have total field (skipped)
        expect(ingestedDocs[1]?.total).toBeUndefined();
      }
    );

    // === Validation Errors for Rejected Functions ===
    // Math processor generates error-throwing scripts for invalid expressions,
    // so errors are reported at runtime via simulation rather than during transpilation
    apiTest(
      'should report errors for unsupported functions via simulation',
      async ({ testBed }) => {
        const rejectedCases = [
          { expression: 'abs(value)', pattern: /abs.*not supported/i, doc: { value: -42 } },
          { expression: 'sqrt(value)', pattern: /sqrt.*not supported/i, doc: { value: 144 } },
          { expression: 'mod(value, 3)', pattern: /mod.*not supported/i, doc: { value: 10 } },
          { expression: 'pi()', pattern: /pi.*not supported/i, doc: { dummy: 1 } },
          { expression: 'mean(values)', pattern: /mean.*not supported/i, doc: { values: 10 } },
          { expression: 'price * * quantity', pattern: /parse/i, doc: { price: 10, quantity: 5 } },
        ];

        for (let i = 0; i < rejectedCases.length; i++) {
          const { expression, pattern, doc } = rejectedCases[i];
          const streamlangDSL: StreamlangDSL = {
            steps: [{ action: 'math', expression, to: 'result' } as MathProcessor],
          };
          const { processors } = transpile(streamlangDSL);
          const { errors } = await testBed.ingest(`math-reject-${i}`, [doc], processors);

          expect(errors.length).toBeGreaterThan(0);
          expect(errors[0].caused_by?.reason).toMatch(pattern);
        }
      }
    );
  }
);
