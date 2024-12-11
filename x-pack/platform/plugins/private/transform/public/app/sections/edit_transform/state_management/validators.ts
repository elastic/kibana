/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  frequencyValidator,
  integerAboveZeroValidator,
  transformSettingsNumberOfRetriesValidator,
  transformSettingsPageSearchSizeValidator,
  retentionPolicyMaxAgeValidator,
  stringValidator,
} from '../../../common/validators';

export const validators = {
  frequencyValidator,
  integerAboveZeroValidator,
  transformSettingsNumberOfRetriesValidator,
  transformSettingsPageSearchSizeValidator,
  retentionPolicyMaxAgeValidator,
  stringValidator,
};
export type ValidatorName = keyof typeof validators;
