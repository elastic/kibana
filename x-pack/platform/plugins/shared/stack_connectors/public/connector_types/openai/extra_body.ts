/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ValidationFunc } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { EXTRA_BODY_PROTECTED_KEYS } from '@kbn/connector-schemas/openai/constants';
import * as i18n from './translations';

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export const extraBodyDeserializer = (value?: Record<string, unknown>): string =>
  value && Object.keys(value).length > 0 ? JSON.stringify(value, null, 2) : '';

export const extraBodySerializer = (value?: string): Record<string, unknown> | undefined => {
  if (!value || value.trim() === '') {
    return undefined;
  }
  try {
    const parsed = JSON.parse(value);
    return isPlainObject(parsed) && Object.keys(parsed).length > 0 ? parsed : undefined;
  } catch (e) {
    return undefined;
  }
};

export const extraBodyValidator: ValidationFunc<any, string, string> = ({ value }) => {
  if (typeof value !== 'string' || value.trim() === '') {
    return;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch (e) {
    return { message: i18n.EXTRA_BODY_INVALID_JSON };
  }
  if (!isPlainObject(parsed)) {
    return { message: i18n.EXTRA_BODY_INVALID_JSON };
  }
  const protectedKeys = Object.keys(parsed).filter((key) =>
    (EXTRA_BODY_PROTECTED_KEYS as readonly string[]).includes(key)
  );
  if (protectedKeys.length > 0) {
    return { message: i18n.getExtraBodyProtectedKeysError(protectedKeys) };
  }
};
