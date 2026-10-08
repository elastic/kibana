/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { KbnInfoCallout, KbnSuccessCallout } from '@kbn/ui-callout';

import type { AwsOnboardingCredentialsPublic } from '../../../../common/types/rest_spec/aws_onboarding';
import { useManagedOnboardingCredentials } from '../hooks/use_managed_onboarding_credentials';

import { ManagedOnboardingFlyout } from './managed_onboarding_flyout';

interface ManagedOnboardingPanelProps {
  credentials: AwsOnboardingCredentialsPublic;
}

/** Opt-in / status callout for Kibana-managed AWS onboarding, shown under the onboarding wizard steps. */
export const ManagedOnboardingPanel: React.FC<ManagedOnboardingPanelProps> = ({ credentials }) => {
  const [isFlyoutOpen, setIsFlyoutOpen] = useState(false);
  const { remove } = useManagedOnboardingCredentials();

  return (
    <>
      {credentials.configured ? (
        <KbnSuccessCallout
          size="s"
          data-test-subj="managedOnboardingPanel-configured"
          title={
            <FormattedMessage
              id="xpack.fleet.cloudConnector.managedOnboarding.configuredTitle"
              defaultMessage="Managed onboarding is on: Kibana creates and updates the CloudFormation stacks for you ({accessKeyId}, {region})."
              values={{ accessKeyId: credentials.accessKeyIdMasked, region: credentials.region }}
            />
          }
          actionProps={{
            primary: {
              isLoading: remove.isLoading,
              onClick: () => remove.mutate({}),
              'data-test-subj': 'managedOnboardingPanel-remove',
              children: credentials.bootstrapStackArn ? (
                <FormattedMessage
                  id="xpack.fleet.cloudConnector.managedOnboarding.removeWithStackButton"
                  defaultMessage="Delete bootstrap stack and remove credentials"
                />
              ) : (
                <FormattedMessage
                  id="xpack.fleet.cloudConnector.managedOnboarding.removeButton"
                  defaultMessage="Remove credentials"
                />
              ),
            },
            // Offered once the stack deletion failed (e.g. the stack was deleted by hand already).
            ...(remove.isError && credentials.bootstrapStackArn
              ? {
                  secondary: {
                    isLoading: remove.isLoading,
                    onClick: () => remove.mutate({ force: true }),
                    'data-test-subj': 'managedOnboardingPanel-removeOnly',
                    children: (
                      <FormattedMessage
                        id="xpack.fleet.cloudConnector.managedOnboarding.removeOnlyButton"
                        defaultMessage="Remove credentials only"
                      />
                    ),
                  },
                }
              : {}),
          }}
        />
      ) : (
        <KbnInfoCallout
          size="s"
          data-test-subj="managedOnboardingPanel-setup"
          title={
            <FormattedMessage
              id="xpack.fleet.cloudConnector.managedOnboarding.setupTitle"
              defaultMessage="Fully managed onboarding (preview): let Kibana create and update the CloudFormation stacks instead of copying values from the AWS console."
            />
          }
          actionProps={{
            primary: {
              onClick: () => setIsFlyoutOpen(true),
              'data-test-subj': 'managedOnboardingPanel-setupButton',
              children: (
                <FormattedMessage
                  id="xpack.fleet.cloudConnector.managedOnboarding.setupButton"
                  defaultMessage="Set up managed onboarding"
                />
              ),
            },
          }}
        />
      )}
      <EuiSpacer size="m" />
      {isFlyoutOpen && (
        <ManagedOnboardingFlyout
          onClose={() => setIsFlyoutOpen(false)}
          defaultRegion={credentials.region}
        />
      )}
    </>
  );
};
