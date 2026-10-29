/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';
import { either } from 'fp-ts/Either';

import { MAX_DOCS_PER_PAGE } from '../constants';
import type { PartialPaginationType } from './types';
import { PaginationSchemaRt } from './types';
import { ALLOWED_MIME_TYPES } from '../constants/mime_types';

export interface LimitedSchemaType {
  fieldName: string;
  min: number;
  max: number;
}

export const NonEmptyString = new rt.Type<string, string, unknown>(
  'NonEmptyString',
  rt.string.is,
  (input, context) =>
    either.chain(rt.string.validate(input, context), (s) => {
      if (s.trim() !== '') {
        return rt.success(s);
      } else {
        return rt.failure(input, context, 'string must have length >= 1');
      }
    }),
  rt.identity
);

export const limitedStringSchema = ({ fieldName, min, max }: LimitedSchemaType) =>
  new rt.Type<string, string, unknown>(
    'LimitedString',
    rt.string.is,
    (input, context) =>
      either.chain(rt.string.validate(input, context), (s) => {
        const trimmedString = s.trim();

        if (trimmedString.length === 0 && trimmedString.length < min) {
          return rt.failure(input, context, `The ${fieldName} field cannot be an empty string.`);
        }

        if (trimmedString.length < min) {
          return rt.failure(
            input,
            context,
            `The length of the ${fieldName} is too short. The minimum length is ${min}.`
          );
        }

        if (trimmedString.length > max) {
          return rt.failure(
            input,
            context,
            `The length of the ${fieldName} is too long. The maximum length is ${max}.`
          );
        }

        return rt.success(s);
      }),
    rt.identity
  );

export const limitedArraySchema = <T extends rt.Mixed>({
  codec,
  fieldName,
  min,
  max,
}: { codec: T } & LimitedSchemaType) =>
  new rt.Type<Array<rt.TypeOf<typeof codec>>, Array<rt.TypeOf<typeof codec>>, unknown>(
    'LimitedArray',
    (input): input is T[] => rt.array(codec).is(input),
    (input, context) =>
      either.chain(rt.array(codec).validate(input, context), (s) => {
        if (s.length < min) {
          return rt.failure(
            input,
            context,
            `The length of the field ${fieldName} is too short. Array must be of length >= ${min}.`
          );
        }

        if (s.length > max) {
          return rt.failure(
            input,
            context,
            `The length of the field ${fieldName} is too long. Array must be of length <= ${max}.`
          );
        }

        return rt.success(s);
      }),
    rt.identity
  );

export const paginationSchema = ({ maxPerPage }: { maxPerPage: number }) =>
  new rt.PartialType<undefined, PartialPaginationType, PartialPaginationType, unknown>(
    'Pagination',
    PaginationSchemaRt.is,
    (u, c) =>
      either.chain(PaginationSchemaRt.validate(u, c), (params) => {
        if (params.page == null && params.perPage == null) {
          return rt.success(params);
        }

        const pageAsNumber = params.page ?? 0;
        const perPageAsNumber = params.perPage ?? 0;

        if (perPageAsNumber > maxPerPage) {
          return rt.failure(
            u,
            c,
            `The provided perPage value is too high. The maximum allowed perPage value is ${maxPerPage}.`
          );
        }

        if (Math.max(pageAsNumber, pageAsNumber * perPageAsNumber) > MAX_DOCS_PER_PAGE) {
          return rt.failure(
            u,
            c,
            `The number of documents is too high. Paginating through more than ${MAX_DOCS_PER_PAGE} documents is not possible.`
          );
        }

        return rt.success({
          ...(params.page != null && { page: pageAsNumber }),
          ...(params.perPage != null && { perPage: perPageAsNumber }),
        });
      }),
    rt.identity,
    undefined
  );

export const limitedNumberSchema = ({ fieldName, min, max }: LimitedSchemaType) =>
  new rt.Type<number, number, unknown>(
    'LimitedNumber',
    rt.number.is,
    (input, context) =>
      either.chain(rt.number.validate(input, context), (s) => {
        if (s < min) {
          return rt.failure(input, context, `The ${fieldName} field cannot be less than ${min}.`);
        }

        if (s > max) {
          return rt.failure(input, context, `The ${fieldName} field cannot be more than ${max}.`);
        }

        return rt.success(s);
      }),
    rt.identity
  );

export const limitedNumberAsIntegerSchema = ({ fieldName }: { fieldName: string }) =>
  new rt.Type<number, number, unknown>(
    'LimitedNumberAsInteger',
    rt.number.is,
    (input, context) =>
      either.chain(rt.number.validate(input, context), (s) => {
        if (!Number.isSafeInteger(s)) {
          return rt.failure(
            input,
            context,
            `The ${fieldName} field should be an integer between -(2^53 - 1) and 2^53 - 1, inclusive.`
          );
        }
        return rt.success(s);
      }),
    rt.identity
  );

export interface RegexStringSchemaType {
  codec: rt.Type<string, string, unknown>;
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
 * Recursive JSON value type.
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
