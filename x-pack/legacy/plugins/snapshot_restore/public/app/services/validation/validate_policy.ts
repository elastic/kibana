/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { SlmPolicyPayload } from '../../../../common/types';
import { textService } from '../text';

export interface PolicyValidation {
  isValid: boolean;
  errors: { [key: string]: React.ReactNode[] };
}

const isStringEmpty = (str: string | null): boolean => {
  return str ? !Boolean(str.trim()) : true;
};

export const validatePolicy = (policy: SlmPolicyPayload): PolicyValidation => {
  const i18n = textService.i18n;

  const { name, snapshotName, schedule, repository, config, retention } = policy;

  const validation: PolicyValidation = {
    isValid: true,
    errors: {
      name: [],
      snapshotName: [],
      schedule: [],
      repository: [],
      indices: [],
      minCount: [],
    },
  };

  if (isStringEmpty(name)) {
    validation.errors.name.push(
      i18n.translate('xpack.snapshotRestore.policyValidation.nameRequiredErroMessage', {
        defaultMessage: 'Policy name is required.',
      })
    );
  }

  if (isStringEmpty(snapshotName)) {
    validation.errors.snapshotName.push(
      i18n.translate('xpack.snapshotRestore.policyValidation.snapshotNameRequiredErrorMessage', {
        defaultMessage: 'Snapshot name is required.',
      })
    );
  }

  if (isStringEmpty(schedule)) {
    validation.errors.schedule.push(
      i18n.translate('xpack.snapshotRestore.policyValidation.scheduleRequiredErrorMessage', {
        defaultMessage: 'Schedule is required.',
      })
    );
  }

  if (isStringEmpty(repository)) {
    validation.errors.repository.push(
      i18n.translate('xpack.snapshotRestore.policyValidation.repositoryRequiredErrorMessage', {
        defaultMessage: 'Repository is required.',
      })
    );
  }

  if (config && typeof config.indices === 'string' && config.indices.trim().length === 0) {
    validation.errors.indices.push(
      i18n.translate('xpack.snapshotRestore.policyValidation.indexPatternRequiredErrorMessage', {
        defaultMessage: 'At least one index pattern is required.',
      })
    );
  }

  if (config && Array.isArray(config.indices) && config.indices.length === 0) {
    validation.errors.indices.push(
      i18n.translate('xpack.snapshotRestore.policyValidation.indicesRequiredErrorMessage', {
        defaultMessage: 'You must select at least one index.',
      })
    );
  }

  if (
    retention &&
    retention.minCount &&
    retention.maxCount &&
    retention.minCount > retention.maxCount
  ) {
    validation.errors.minCount.push(
      i18n.translate('xpack.snapshotRestore.policyValidation.invalidMinCountErrorMessage', {
        defaultMessage: 'Min count cannot be greater than max count.',
      })
    );
  }
  // Remove fields with no errors
  validation.errors = Object.entries(validation.errors)
    .filter(([key, value]) => value.length > 0)
    .reduce((errs: PolicyValidation['errors'], [key, value]) => {
      errs[key] = value;
      return errs;
    }, {});

  // Set overall validations status
  if (Object.keys(validation.errors).length > 0) {
    validation.isValid = false;
  }

  return validation;
};
