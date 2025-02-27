/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { numberValidator } from '@kbn/ml-agg-utils';

import type { Validator } from './types';

const numberOfRetriesInvalidErrorMessage = i18n.translate(
  'xpack.transform.transformSettingsValidations.numberOfRetriesInvalidErrorMessage',
  {
    defaultMessage: 'Number of retries needs to be between 0 and 100, or -1 for infinite retries.',
  }
);

// memoize validator
const validator = numberValidator({ min: -1, max: 100, integerOnly: true });

export const transformSettingsNumberOfRetriesValidator: Validator = (value) =>
  validator(+value) === null ? [] : [numberOfRetriesInvalidErrorMessage];
