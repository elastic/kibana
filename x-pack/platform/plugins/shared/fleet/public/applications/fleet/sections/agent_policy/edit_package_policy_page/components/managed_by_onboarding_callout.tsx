/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButton, EuiCallOut } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

import { useStartServices } from '../../../../hooks';
import {
  ONBOARDING_APP_ID,
  getOnboardingInstancePath,
} from '../../../../../../services/aws_onboarding_override';

/**
 * Shown instead of the edit form for a package policy managed by a cloud onboarding instance,
 * which can only be changed from the onboarding flow.
 */
export const ManagedByOnboardingCallout: React.FunctionComponent<{
  onboardingDeploymentId: string;
}> = ({ onboardingDeploymentId }) => {
  const { application } = useStartServices();

  return (
    <EuiCallOut
      data-test-subj="editPackagePolicyManagedByOnboardingCallout"
      iconType="lock"
      title={
        <FormattedMessage
          id="xpack.fleet.editPackagePolicy.managedByOnboardingTitle"
          defaultMessage="This integration policy is managed by AWS onboarding"
        />
      }
    >
      <p>
        <FormattedMessage
          id="xpack.fleet.editPackagePolicy.managedByOnboardingDescription"
          defaultMessage="It was created by an AWS onboarding instance and can only be changed or deleted from there."
        />
      </p>
      <EuiButton
        data-test-subj="editPackagePolicyManageInOnboardingButton"
        iconType="popout"
        href={application.getUrlForApp(ONBOARDING_APP_ID, {
          path: getOnboardingInstancePath(onboardingDeploymentId),
        })}
      >
        <FormattedMessage
          id="xpack.fleet.editPackagePolicy.manageInOnboardingButton"
          defaultMessage="Manage in AWS onboarding"
        />
      </EuiButton>
    </EuiCallOut>
  );
};
