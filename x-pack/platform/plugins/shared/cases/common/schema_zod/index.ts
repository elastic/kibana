/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { ALLOWED_MIME_TYPES } from '../constants/mime_types';

export interface LimitedSchemaType {
  fieldName: string;
  min: number;
  max: number;
}

export const NonEmptyString = z.string().min(1);

export const limitedStringSchema = ({ fieldName, min, max }: LimitedSchemaType) =>
  z.string().superRefine((s, ctx) => {
    const trimmed = s.trim();

    if (trimmed.length === 0) {
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
  const pageCoerce = z.union([z.number(), z.string().transform((s) => Number(s))]);
  return z.object({
    page: pageCoerce.optional(),
    perPage: pageCoerce.optional(),
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

export const mimeTypeString = z.string().superRefine((s, ctx) => {
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
    z.string(),
    z.number(),
    z.boolean(),
    z.null(),
    z.array(jsonValueSchema),
    z.record(z.string(), jsonValueSchema),
  ])
);

/**
 * Returns true when `value` nests arrays or objects deeper than `maxDepth`. Iterative, so a
 * deeply nested input can't overflow the stack.
 */
const exceedsJsonDepth = (value: unknown, maxDepth: number): boolean => {
  const stack: Array<{ node: unknown; depth: number }> = [{ node: value, depth: 0 }];

  for (let entry = stack.pop(); entry; entry = stack.pop()) {
    const { node, depth } = entry;

    if (typeof node === 'object' && node !== null) {
      if (depth + 1 > maxDepth) {
        return true;
      }

      for (const child of Object.values(node)) {
        stack.push({ node: child, depth: depth + 1 });
      }
    }
  }

  return false;
};

/**
 * Bounded JSON object for request input: caps nesting depth, every nested string and array, and
 * the serialized size.
 */
export const limitedJsonObjectSchema = ({
  fieldName,
  max,
  maxDepth,
}: Omit<LimitedSchemaType, 'min'> & { maxDepth: number }) => {
  const limitedJsonValueSchema: z.ZodType<JsonValue> = z.lazy(() =>
    z.union([
      z.string().max(max),
      z.number(),
      z.boolean(),
      z.null(),
      z.array(limitedJsonValueSchema).max(max),
      z.record(z.string().max(max), limitedJsonValueSchema),
    ])
  );

  // The depth check runs before the recursive parse, which would otherwise overflow the stack.
  return z
    .unknown()
    .superRefine((value, ctx) => {
      if (exceedsJsonDepth(value, maxDepth)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `The ${fieldName} field is nested too deeply. The maximum depth is ${maxDepth}.`,
        });
      }
    })
    .pipe(
      z.record(z.string().max(max), limitedJsonValueSchema).superRefine((value, ctx) => {
        if (JSON.stringify(value).length > max) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `The ${fieldName} field is too large. The maximum serialized length is ${max}.`,
          });
        }
      })
    );
};
