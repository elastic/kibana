/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LENS_ERROR_CODES, type LensErrorCode } from '@kbn/lens-embeddable-utils';

const lensErrorCodes: readonly string[] = Object.values(LENS_ERROR_CODES);

/**
 * Reads the Lens error code from an http error response, if any.
 */
export const getLensErrorCode = (error: unknown): LensErrorCode | undefined => {
  if (typeof error !== 'object' || error === null || !('body' in error)) return undefined;
  const { body } = error;
  if (typeof body !== 'object' || body === null || !('attributes' in body)) return undefined;
  const { attributes } = body;
  if (typeof attributes !== 'object' || attributes === null || !('code' in attributes)) {
    return undefined;
  }
  const { code } = attributes;
  return typeof code === 'string' && lensErrorCodes.includes(code)
    ? (code as LensErrorCode)
    : undefined;
};
