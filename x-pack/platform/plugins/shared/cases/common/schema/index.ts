/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as rt from 'io-ts';
import { either } from 'fp-ts/lib/Either';

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
}

export const regexStringRt = ({ codec, pattern, message }: RegexStringSchemaType) =>
  new rt.Type<string, string, unknown>(
    'RegexString',
    codec.is,
    (input, context) =>
      either.chain(codec.validate(input, context), (value) => {
        const regex = new RegExp(pattern, 'g');

        if (!regex.test(value)) {
          return rt.failure(input, context, message);
        }

        return rt.success(value);
      }),
    rt.identity
  );

export const mimeTypeString = new rt.Type<string, string, unknown>(
  'mimeTypeString',
  rt.string.is,
  (input, context) =>
    either.chain(rt.string.validate(input, context), (s) => {
      if (!ALLOWED_MIME_TYPES.includes(s)) {
        return rt.failure(input, context, `The mime type field value ${s} is not allowed.`);
      }

      return rt.success(s);
    }),
  rt.identity
);
