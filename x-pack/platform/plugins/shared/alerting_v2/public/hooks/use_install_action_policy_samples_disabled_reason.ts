/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreStart, useService } from '@kbn/core-di-browser';
import { i18n } from '@kbn/i18n';
import { getWorkflowsCapabilities } from '@kbn/workflows-ui';
import { UserCapabilities } from '../services/user_capabilities';
import { useIsActionPoliciesLicenseValid } from './use_is_action_policies_license_valid';

const MISSING_ACTION_POLICIES_PRIVILEGES_REASON = i18n.translate(
  'xpack.alertingV2.actionPolicy.installSamples.missingActionPoliciesPrivilegesTooltip',
  { defaultMessage: 'You do not have permission to create action policies' }
);

const MISSING_WORKFLOWS_PRIVILEGES_REASON = i18n.translate(
  'xpack.alertingV2.actionPolicy.installSamples.missingWorkflowsPrivilegesTooltip',
  {
    defaultMessage: 'Adding sample policies requires permission to create and read workflows.',
  }
);

const LICENSE_REQUIRED_REASON = i18n.translate(
  'xpack.alertingV2.actionPolicy.installSamples.licenseRequiredTooltip',
  { defaultMessage: 'An active Enterprise license is required to add sample policies.' }
);

/**
 * Returns why installing the sample action policies is not allowed for the current user, or
 * `undefined` when it is. UI gating only: the server enforces the same requirements.
 */
export const useInstallActionPolicySamplesDisabledReason = (): string | undefined => {
  const canWriteActionPolicies = useService(UserCapabilities).canWrite('actionPolicies');
  const { capabilities } = useService(CoreStart('application'));
  const isLicenseValid = useIsActionPoliciesLicenseValid();
  const { canCreateWorkflow, canReadWorkflow } = getWorkflowsCapabilities(capabilities);

  if (!canWriteActionPolicies) {
    return MISSING_ACTION_POLICIES_PRIVILEGES_REASON;
  }

  if (!canCreateWorkflow || !canReadWorkflow) {
    return MISSING_WORKFLOWS_PRIVILEGES_REASON;
  }

  return isLicenseValid ? undefined : LICENSE_REQUIRED_REASON;
};
