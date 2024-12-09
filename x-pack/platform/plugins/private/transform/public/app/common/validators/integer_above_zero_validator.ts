/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { numberValidator } from '@kbn/ml-agg-utils';

import type { Validator } from './types';

const numberAboveZeroNotValidErrorMessage = i18n.translate(
  'xpack.transform.transformList.editFlyoutFormNumberAboveZeroNotValidErrorMessage',
  {
    defaultMessage: 'Value needs to be an integer above zero.',
  }
);

// memoize validator
const validator = numberValidator({ min: 1, integerOnly: true });

export const integerAboveZeroValidator: Validator = (value) =>
  validator(+value) === null ? [] : [numberAboveZeroNotValidErrorMessage];
