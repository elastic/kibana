/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  MAX_ARTIFACT_ARRAY_ITEMS,
  MAX_ARTIFACT_DATA_BYTES,
  MAX_ARTIFACT_STRING_LENGTH,
  RUNBOOK_CONTENT_LIMIT,
} from '@kbn/alerting-v2-constants';
import { z } from '@kbn/zod/v4';
import { assertBoundedSchema } from './assert_bounded_schema';

describe('assertBoundedSchema', () => {
  const assert = (dataSchema: z.ZodType) => assertBoundedSchema(dataSchema, 'test.type');

  describe('accepts bounded schemas', () => {
    it('accepts the runbook shape at its content limit', () => {
      expect(() =>
        assert(z.object({ content: z.string().max(RUNBOOK_CONTENT_LIMIT) }).strict())
      ).not.toThrow();
    });

    it('accepts a single string at the framework ceiling, so the ceiling is reachable', () => {
      expect(() =>
        assert(z.object({ blob: z.string().max(MAX_ARTIFACT_STRING_LENGTH) }).strict())
      ).not.toThrow();
    });

    it('accepts a bounded array of bounded objects', () => {
      expect(() =>
        assert(
          z
            .object({
              links: z.array(z.object({ id: z.string().max(64) }).strict()).max(10),
            })
            .strict()
        )
      ).not.toThrow();
    });

    it('accepts optional and non-string scalar fields', () => {
      expect(() =>
        assert(
          z
            .object({
              title: z.string().max(64).optional(),
              count: z.number(),
              enabled: z.boolean(),
            })
            .strict()
        )
      ).not.toThrow();
    });

    it('accepts enums and literals, which need no maxLength', () => {
      expect(() =>
        assert(
          z
            .object({
              severity: z.enum(['low', 'medium', 'high']),
              kind: z.literal('static'),
            })
            .strict()
        )
      ).not.toThrow();
    });

    it('accepts nullable fields and unions of bounded branches', () => {
      expect(() =>
        assert(
          z
            .object({
              notes: z.string().max(100).nullable(),
              value: z.union([z.string().max(64), z.number()]),
            })
            .strict()
        )
      ).not.toThrow();
    });
  });

  describe('per-node caps', () => {
    it('rejects a string with no maxLength', () => {
      expect(() => assert(z.object({ title: z.string() }).strict())).toThrow(
        /data\.title: string is missing maxLength/
      );
    });

    it('rejects a maxLength above the framework ceiling', () => {
      expect(() =>
        assert(z.object({ title: z.string().max(MAX_ARTIFACT_STRING_LENGTH + 1) }).strict())
      ).toThrow(
        new RegExp(
          `data\\.title: maxLength ${
            MAX_ARTIFACT_STRING_LENGTH + 1
          } exceeds framework cap ${MAX_ARTIFACT_STRING_LENGTH}`
        )
      );
    });

    it('rejects an array with no maxItems', () => {
      expect(() => assert(z.object({ tags: z.array(z.string().max(8)) }).strict())).toThrow(
        /data\.tags: array is missing maxItems/
      );
    });

    it('rejects a maxItems above the framework ceiling', () => {
      expect(() =>
        assert(
          z.object({ tags: z.array(z.string().max(8)).max(MAX_ARTIFACT_ARRAY_ITEMS + 1) }).strict()
        )
      ).toThrow(
        new RegExp(
          `data\\.tags: maxItems ${
            MAX_ARTIFACT_ARRAY_ITEMS + 1
          } exceeds framework cap ${MAX_ARTIFACT_ARRAY_ITEMS}`
        )
      );
    });

    it('reports the full path of a nested offender', () => {
      expect(() =>
        assert(z.object({ links: z.array(z.object({ id: z.string() }).strict()).max(2) }).strict())
      ).toThrow(/data\.links\[\]\.id: string is missing maxLength/);
    });
  });

  describe('accumulated worst-case total', () => {
    it('rejects multiplicative blow-up even when every node is within its cap', () => {
      // Each node is individually legal (string ≤ MAX_ARTIFACT_STRING_LENGTH,
      // maxItems ≤ MAX_ARTIFACT_ARRAY_ITEMS) but the product exceeds the budget.
      const dataSchema = z
        .object({
          items: z
            .array(z.object({ note: z.string().max(MAX_ARTIFACT_STRING_LENGTH) }).strict())
            .max(MAX_ARTIFACT_ARRAY_ITEMS),
        })
        .strict();

      expect(() => assert(dataSchema)).toThrow(
        new RegExp(`worst-case size \\d+ exceeds framework cap ${MAX_ARTIFACT_DATA_BYTES}`)
      );
    });

    it('rejects many individually-legal strings that add up', () => {
      const dataSchema = z
        .object({
          first: z.string().max(MAX_ARTIFACT_STRING_LENGTH),
          second: z.string().max(MAX_ARTIFACT_STRING_LENGTH),
          third: z.string().max(MAX_ARTIFACT_STRING_LENGTH),
        })
        .strict();

      expect(() => assert(dataSchema)).toThrow(/worst-case size \d+ exceeds framework cap/);
    });
  });

  describe('open and unconstrained shapes', () => {
    it('rejects an object that is not closed', () => {
      expect(() => assert(z.object({ title: z.string().max(8) }))).toThrow(/must be closed/);
    });

    it('rejects an unbounded record', () => {
      expect(() =>
        assert(z.object({ meta: z.record(z.string().max(32), z.string().max(32)) }).strict())
      ).toThrow(/data\.meta: object must be closed/);
    });

    it('rejects z.unknown', () => {
      expect(() => assert(z.object({ payload: z.unknown() }).strict())).toThrow(
        /unconstrained|unsupported/
      );
    });

    it('rejects a union with an unbounded branch', () => {
      expect(() =>
        assert(z.object({ value: z.union([z.string().max(8), z.string()]) }).strict())
      ).toThrow(/string is missing maxLength/);
    });

    it('rejects intersections, naming the supported subset', () => {
      expect(() =>
        assert(
          z
            .object({
              value: z.intersection(
                z.object({ a: z.string().max(8) }).strict(),
                z.object({ b: z.string().max(8) }).strict()
              ),
            })
            .strict()
        )
      ).toThrow(/allOf\/not; supported constructs/);
    });
  });
});
