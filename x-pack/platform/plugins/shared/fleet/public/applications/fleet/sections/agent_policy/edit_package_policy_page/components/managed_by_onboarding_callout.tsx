/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { KbnInfoCallout } from '@kbn/ui-callout';

import { useOnboardingInstanceUrl } from '../../../../hooks';
import { ONBOARDING_DISABLED_MANAGED_POLICY_MESSAGE } from '../../../../../../services/aws_onboarding_override';

/**
 * Shown instead of the edit form for a package policy managed by a cloud onboarding instance,
 * which can only be changed from the onboarding flow.
 */
export const ManagedByOnboardingCallout: React.FunctionComponent<{
  onboardingDeploymentId: string;
}> = ({ onboardingDeploymentId }) => {
  const onboardingInstanceUrl = useOnboardingInstanceUrl()(onboardingDeploymentId);

  return (
    <KbnInfoCallout
      data-test-subj="editPackagePolicyManagedByOnboardingCallout"
      title={
        <FormattedMessage
          id="xpack.fleet.editPackagePolicy.managedByOnboardingTitle"
          defaultMessage="This integration policy is managed by AWS onboarding"
        />
      }
      text={
        onboardingInstanceUrl ? (
          <FormattedMessage
            id="xpack.fleet.editPackagePolicy.managedByOnboardingDescription"
            defaultMessage="You can only change or delete this integration policy from the AWS onboarding instance that manages it."
          />
        ) : (
          ONBOARDING_DISABLED_MANAGED_POLICY_MESSAGE
        )
      }
      actionProps={
        onboardingInstanceUrl
          ? {
              primary: {
                'data-test-subj': 'editPackagePolicyManageInOnboardingButton',
                href: onboardingInstanceUrl,
                children: (
                  <FormattedMessage
                    id="xpack.fleet.editPackagePolicy.manageInOnboardingButton"
                    defaultMessage="Manage in AWS onboarding"
                  />
                ),
              },
            }
          : undefined
      }
    />
  );
};
