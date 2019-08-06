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

  const { name, snapshotName, schedule, repository } = policy;

  const validation: PolicyValidation = {
    isValid: true,
    errors: {
      name: [],
      snapshotName: [],
      schedule: [],
      repository: [],
    },
  };

  if (isStringEmpty(name)) {
    validation.errors.name.push(
      i18n.translate('xpack.snapshotRestore.policyValidation.nameRequiredError', {
        defaultMessage: 'Policy name is required.',
      })
    );
  }

  if (isStringEmpty(snapshotName)) {
    validation.errors.snapshotName.push(
      i18n.translate('xpack.snapshotRestore.policyValidation.snapshotNameRequiredError', {
        defaultMessage: 'Snapshot name is required.',
      })
    );
  }

  if (isStringEmpty(schedule)) {
    validation.errors.schedule.push(
      i18n.translate('xpack.snapshotRestore.policyValidation.scheduleRequiredError', {
        defaultMessage: 'Schedule is required.',
      })
    );
  }

  if (isStringEmpty(repository)) {
    validation.errors.repository.push(
      i18n.translate('xpack.snapshotRestore.policyValidation.repositoryRequiredError', {
        defaultMessage: 'Repository is required.',
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
