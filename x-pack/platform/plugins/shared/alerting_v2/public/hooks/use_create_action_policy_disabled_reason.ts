/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useService } from '@kbn/core-di-browser';
import { i18n } from '@kbn/i18n';
import { UserCapabilities } from '../services/user_capabilities';
import { useIsActionPoliciesLicenseValid } from './use_is_action_policies_license_valid';

const MISSING_PRIVILEGES_REASON = i18n.translate(
  'xpack.alertingV2.actionPolicy.create.missingPrivilegesTooltip',
  { defaultMessage: 'You do not have permission to create action policies' }
);

const LICENSE_REQUIRED_REASON = i18n.translate(
  'xpack.alertingV2.actionPolicy.create.licenseRequiredTooltip',
  { defaultMessage: 'An active Enterprise license is required to create action policies.' }
);

/** Returns why the current user cannot create action policies, or `undefined` when they can. */
export const useCreateActionPolicyDisabledReason = (): string | undefined => {
  const canWriteActionPolicies = useService(UserCapabilities).canWrite('actionPolicies');
  const isLicenseValid = useIsActionPoliciesLicenseValid();

  if (!canWriteActionPolicies) {
    return MISSING_PRIVILEGES_REASON;
  }

  return isLicenseValid ? undefined : LICENSE_REQUIRED_REASON;
};
