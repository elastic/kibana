/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { ALLOWED_MIME_TYPES } from '../constants/mime_types';
import { MAX_COMMENT_LENGTH, MAX_DOCS_PER_PAGE } from '../constants';

export interface LimitedSchemaType {
  fieldName: string;
  min: number;
  max: number;
}

// Matches io-ts parity: rejects strings whose `.trim()` is empty (e.g. "   ", "\t\n").
// Preserves the original (untrimmed) string on success.
export const NonEmptyString = z
  .string()
  .max(1000)
  .refine((s) => s.trim().length >= 1, 'string must have length >= 1');

export const limitedStringSchema = ({ fieldName, min, max }: LimitedSchemaType) =>
  z
    .string()
    .max(max)
    .superRefine((s, ctx) => {
      const trimmed = s.trim();

      // io-ts parity: an empty / whitespace-only string is only rejected when
      // `min > 0`; with `min === 0` it should pass through.
      if (trimmed.length === 0 && min > 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `The ${fieldName} field cannot be an empty string.`,
        });
        return;
      }

      if (trimmed.length < min) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `The length of the ${fieldName} is too short. The minimum length is ${min}.`,
        });
        return;
      }

      if (trimmed.length > max) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `The length of the ${fieldName} is too long. The maximum length is ${max}.`,
        });
      }
    });

export const limitedArraySchema = <T extends z.ZodTypeAny>({
  codec,
  fieldName,
  min,
  max,
}: { codec: T } & LimitedSchemaType) =>
  z.array(codec).superRefine((s, ctx) => {
    if (s.length < min) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `The length of the field ${fieldName} is too short. Array must be of length >= ${min}.`,
      });
      return;
    }

    if (s.length > max) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `The length of the field ${fieldName} is too long. Array must be of length <= ${max}.`,
      });
    }
  });

export const limitedNumberSchema = ({ fieldName, min, max }: LimitedSchemaType) =>
  z.number().superRefine((s, ctx) => {
    if (s < min) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `The ${fieldName} field cannot be less than ${min}.`,
      });
      return;
    }

    if (s > max) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `The ${fieldName} field cannot be more than ${max}.`,
      });
    }
  });

export const paginationSchema = ({ maxPerPage }: { maxPerPage: number }) => {
  // Matches io-ts `NumberFromString` parity: a string input must parse to a finite
  // number. `Number('abc')` returns `NaN`, which previously failed validation —
  // a plain `transform((s) => Number(s))` would let `NaN` through silently and
  // bypass the downstream `> maxPerPage` / `MAX_DOCS_PER_PAGE` guards.
  // The transform is on the union (rather than only on the string variant) so
  // the custom error message survives instead of being swallowed by the
  // union's "no variant matched" error.
  const pageCoerce = z.union([z.number(), z.string().max(20)]).transform((value, ctx) => {
    if (typeof value === 'number') return value;
    const n = Number(value);
    if (!Number.isFinite(n)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'cannot parse to a number' });
      return z.NEVER;
    }
    return n;
  });
  return z
    .object({
      page: pageCoerce.optional(),
      perPage: pageCoerce.optional(),
    })
    .superRefine((params, ctx) => {
      if (params.page == null && params.perPage == null) return;

      const pageAsNumber = params.page ?? 0;
      const perPageAsNumber = params.perPage ?? 0;

      if (perPageAsNumber > maxPerPage) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `The provided perPage value is too high. The maximum allowed perPage value is ${maxPerPage}.`,
        });
        return;
      }

      if (Math.max(pageAsNumber, pageAsNumber * perPageAsNumber) > MAX_DOCS_PER_PAGE) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `The number of documents is too high. Paginating through more than ${MAX_DOCS_PER_PAGE} documents is not possible.`,
        });
      }
    });
};

export const limitedNumberAsIntegerSchema = ({ fieldName }: { fieldName: string }) =>
  z.number().superRefine((s, ctx) => {
    if (!Number.isSafeInteger(s)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `The ${fieldName} field should be an integer between -(2^53 - 1) and 2^53 - 1, inclusive.`,
      });
    }
  });

export const regexStringSchema = ({
  codec,
  pattern,
  message,
}: {
  codec: z.ZodType<string>;
  pattern: string;
  message: string;
}) =>
  codec.superRefine((value, ctx) => {
    if (!new RegExp(pattern).test(value)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message });
    }
  });

export const mimeTypeString = z
  .string()
  .max(255)
  .superRefine((s, ctx) => {
    if (!ALLOWED_MIME_TYPES.includes(s)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `The mime type field value ${s} is not allowed.`,
      });
    }
  });

/**
 * Zod equivalent of jsonValueRt — a recursive JSON value type.
 */
export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

export const jsonValueSchema: z.ZodType<JsonValue> = z.lazy(() =>
  z.union([
    z.string().max(MAX_COMMENT_LENGTH),
    z.number(),
    z.boolean(),
    z.null(),
    z.array(jsonValueSchema),
    z.record(z.string().max(1000), jsonValueSchema),
  ])
);
