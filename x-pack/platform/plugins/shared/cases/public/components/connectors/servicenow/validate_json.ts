/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ValidationFunc } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { isEmpty } from 'lodash';
import * as i18n from './translations';

const MAX_ADDITIONAL_FIELDS_LENGTH = 10;

export const validateJSON = (...args: Parameters<ValidationFunc>): ReturnType<ValidationFunc> => {
  const [{ value }] = args;

  try {
    if (typeof value === 'string' && !isEmpty(value)) {
      const parsedOtherFields = JSON.parse(value);

      if (Object.keys(parsedOtherFields).length > MAX_ADDITIONAL_FIELDS_LENGTH) {
        return {
          code: 'ERR_JSON_FORMAT',
          message: i18n.MAX_ATTRIBUTES_ERROR(MAX_ADDITIONAL_FIELDS_LENGTH),
        };
      }
    }
  } catch (error) {
    return {
      code: 'ERR_JSON_FORMAT',
      message: i18n.INVALID_JSON_FORMAT,
    };
  }
};
