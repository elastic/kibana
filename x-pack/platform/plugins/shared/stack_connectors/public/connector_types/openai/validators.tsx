/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ValidationError,
  ValidationFunc,
} from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { ERROR_CODE } from '@kbn/es-ui-shared-plugin/static/forms/helpers/field_validators/types';

const safeURL = /^[^\s\/:?#]+$/;

export const validateURL =
  (message: string) =>
  (...args: Parameters<ValidationFunc>): ValidationError<ERROR_CODE> | undefined => {
    const [{ value }] = args;

    const error: ValidationError<ERROR_CODE> = {
      code: 'ERR_FIELD_FORMAT',
      formatType: 'URL',
      message,
    };

    if (typeof value !== 'string') {
      return error;
    }

    try {
      const url = new URL(value);
      const hostname = url.hostname;

      const isValid = hostname && !hostname.endsWith('.') && safeURL.test(hostname);
      if (isValid) return;
      // eslint-disable-next-line no-empty
    } catch {}

    return error;
  };
