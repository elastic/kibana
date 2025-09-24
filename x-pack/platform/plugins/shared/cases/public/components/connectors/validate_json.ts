/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ValidationFunc } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { isEmpty, isObject } from 'lodash';
import * as i18n from './translations';

const MAX_ADDITIONAL_FIELDS_LENGTH = 10;

export const generateJSONValidator =
  (options?: { maxAdditionalFields?: number }) =>
  (...args: Parameters<ValidationFunc>): ReturnType<ValidationFunc> => {
    const [{ value }] = args;
    const maxAdditionalFields = options?.maxAdditionalFields ?? MAX_ADDITIONAL_FIELDS_LENGTH;

    try {
      if (typeof value === 'string' && !isEmpty(value)) {
        const parsedJSON = JSON.parse(value);

        if (!isObject(parsedJSON)) {
          return {
            code: 'ERR_JSON_FORMAT',
            message: i18n.INVALID_JSON_FORMAT,
          };
        }

        if (Object.keys(parsedJSON).length > maxAdditionalFields) {
          return {
            code: 'ERR_JSON_FORMAT',
            message: i18n.MAX_ATTRIBUTES_ERROR(maxAdditionalFields),
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
