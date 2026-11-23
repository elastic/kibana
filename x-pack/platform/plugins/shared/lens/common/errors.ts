/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LENS_ERROR_TYPE, isLensErrorCode, type LensErrorCode } from '@kbn/lens-embeddable-utils';

/**
 * Reads the Lens error code from an http error response, if any.
 */
export const getLensErrorCode = (error: unknown): LensErrorCode | undefined => {
  if (typeof error !== 'object' || error === null || !('body' in error)) return undefined;
  const { body } = error;
  if (typeof body !== 'object' || body === null || !('attributes' in body)) return undefined;
  const { attributes } = body;
  if (!isLensErrorAttributes(attributes)) return undefined;
  const { code } = attributes;
  return isLensErrorCode(code) ? code : undefined;
};

const isLensErrorAttributes = (
  attributes: unknown
): attributes is { type: typeof LENS_ERROR_TYPE; code: string } =>
  typeof attributes === 'object' &&
  attributes !== null &&
  'type' in attributes &&
  attributes.type === LENS_ERROR_TYPE &&
  'code' in attributes &&
  typeof attributes.code === 'string';
