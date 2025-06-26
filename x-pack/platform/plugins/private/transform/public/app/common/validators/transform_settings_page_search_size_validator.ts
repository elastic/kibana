/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { numberValidator } from '@kbn/ml-agg-utils';

import type { Validator } from './types';

const pageSearchSizeInvalidErrorMessage = i18n.translate(
  'xpack.transform.transformSettingValidations.maxPageSearchSizeInvalidMessage',
  {
    defaultMessage: 'Maximum page search size needs to be an integer between 10 and 65536.',
  }
);

// memoize validator
const validator = numberValidator({ min: 10, max: 65536, integerOnly: true });

/**
 * Validates transform max_page_search_size input.
 * Must be a number between 10 and 65536.
 * @param value User input value.
 */
export const transformSettingsPageSearchSizeValidator: Validator = (value) =>
  validator(+value) === null ? [] : [pageSearchSizeInvalidErrorMessage];
