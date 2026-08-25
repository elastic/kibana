/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getNewJobLimits } from '../../../services/ml_server_info';
import { populateValidationMessages } from '../../new_job/common/job_validator/util';

import {
  validateModelMemoryLimit as validateModelMemoryLimitUtils,
  validateGroupNames as validateGroupNamesUtils,
  validateModelMemoryLimitUnits as validateModelMemoryLimitUnitsUtils,
} from '../../../../../common/util/job_utils';

export function validateModelMemoryLimit(mml) {
  const limits = getNewJobLimits();
  const tempJob = {
    analysis_limits: {
      model_memory_limit: mml,
    },
  };

  let validationResults = validateModelMemoryLimitUnitsUtils(mml);
  let { valid } = validationResults;

  if (valid) {
    validationResults = validateModelMemoryLimitUtils(tempJob, limits);
    valid = validationResults.valid;
  }

  const modelMemoryLimit = {
    valid,
    message: '',
  };

  populateValidationMessages(validationResults, { modelMemoryLimit });

  return modelMemoryLimit;
}

export function validateGroupNames(groups) {
  const tempJob = {
    groups,
  };

  const validationResults = validateGroupNamesUtils(tempJob);
  const { valid } = validationResults;

  const groupIds = {
    valid,
    message: '',
  };

  populateValidationMessages(validationResults, { groupIds });

  return groupIds;
}
