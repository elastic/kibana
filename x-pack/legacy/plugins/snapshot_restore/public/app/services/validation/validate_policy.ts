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

export const validatePolicy = (
  policy: SlmPolicyPayload,
  validationHelperData: {
    managedRepository?: {
      name: string;
      policy: string;
    };
    isEditing?: boolean;
    policyName?: string;
  }
): PolicyValidation => {
  const i18n = textService.i18n;

  const { name, snapshotName, schedule, repository, config, retention } = policy;
  const { managedRepository, isEditing, policyName } = validationHelperData;

  const validation: PolicyValidation = {
    isValid: true,
    errors: {
      name: [],
      snapshotName: [],
      schedule: [],
      repository: [],
      indices: [],
      expireAfterValue: [],
      minCount: [],
      maxCount: [],
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
        defaultMessage: 'Minimum count cannot be greater than maximum count.',
      })
    );
  }

  if (
    managedRepository &&
    managedRepository.name === repository &&
    managedRepository.policy &&
    !(isEditing && managedRepository.policy === policyName)
  ) {
    validation.errors.repository.push(
      i18n.translate('xpack.snapshotRestore.policyValidation.invalidRepoErrorMessage', {
        defaultMessage: 'Policy "{policyName}" is already associated with this repository.',
        values: {
          policyName: managedRepository.policy,
        },
      })
    );
  }

  if (retention && retention.expireAfterValue && retention.expireAfterValue < 0) {
    validation.errors.expireAfterValue.push(
      i18n.translate(
        'xpack.snapshotRestore.policyValidation.invalidNegativeDeleteAfterErrorMessage',
        {
          defaultMessage: 'Delete after cannot be negative.',
        }
      )
    );
  }

  if (retention && retention.minCount && retention.minCount < 0) {
    validation.errors.minCount.push(
      i18n.translate('xpack.snapshotRestore.policyValidation.invalidNegativeMinCountErrorMessage', {
        defaultMessage: 'Minimum count cannot be negative.',
      })
    );
  }

  if (retention && retention.maxCount && retention.maxCount < 0) {
    validation.errors.maxCount.push(
      i18n.translate('xpack.snapshotRestore.policyValidation.invalidNegativeMaxCountErrorMessage', {
        defaultMessage: 'Maximum count cannot be negative.',
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
