/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Boom, isBoom } from '@hapi/boom';
import type { CasesApiErrorAttributes } from '../../common/constants/error_codes';
import { isCasesApiErrorAttributes } from '../../common/constants/error_codes';

/**
 * Boom `data` carrier key for typed error attributes. `CaseError.boomify()`
 * preserves Boom `data` end-to-end, and `wrapError` (routes/api/utils.ts) lifts
 * this payload into the HTTP response body's `attributes` so machine-readable
 * codes survive to clients instead of being flattened into a message string.
 */
const API_ERROR_ATTRIBUTES_KEY = 'casesApiErrorAttributes' as const;

interface TypedApiErrorData {
  [API_ERROR_ATTRIBUTES_KEY]: CasesApiErrorAttributes;
}

/**
 * Creates a Boom whose typed attributes survive route error wrapping and are
 * serialized as `attributes` in the HTTP error body. Use for every error that
 * carries a machine-readable `code`; plain Boom errors stay message-only.
 */
export const createTypedApiError = ({
  statusCode,
  message,
  attributes,
}: {
  statusCode: number;
  message: string;
  attributes: CasesApiErrorAttributes;
}): Boom<TypedApiErrorData> =>
  new Boom(message, {
    statusCode,
    data: { [API_ERROR_ATTRIBUTES_KEY]: attributes },
  });

/**
 * Extracts typed attributes from an error produced by `createTypedApiError`
 * (possibly re-wrapped by `CaseError.boomify()`). Returns undefined for every
 * other error shape.
 */
export const getTypedApiErrorAttributes = (error: unknown): CasesApiErrorAttributes | undefined => {
  if (!isBoom(error)) {
    return undefined;
  }

  const attributes = (error.data as Partial<TypedApiErrorData> | null | undefined)?.[
    API_ERROR_ATTRIBUTES_KEY
  ];

  return isCasesApiErrorAttributes(attributes) ? attributes : undefined;
};
