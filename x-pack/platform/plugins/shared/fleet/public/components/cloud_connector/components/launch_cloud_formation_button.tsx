/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButton, EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { KbnDangerCallout } from '@kbn/ui-callout';

import type { CloudConnectorLaunchButtonProps } from '../hooks/use_cloud_connector_template';

export interface LaunchCloudFormationButtonProps {
  /** `href`/`target` for the static template or `onClick` for a live render; spread onto the button. */
  launchButtonProps: CloudConnectorLaunchButtonProps;
  isLoading: boolean;
  isDisabled: boolean;
  /** Shown in a danger callout under the button when the template render failed. */
  templateGenerationError?: string;
  'data-test-subj': string;
  errorCalloutTestSubj: string;
}

/** "Launch CloudFormation" button plus its render-error callout, shared by the wizard's connector form and the AWS onboarding setup. */
export const LaunchCloudFormationButton: React.FC<LaunchCloudFormationButtonProps> = ({
  launchButtonProps,
  isLoading,
  isDisabled,
  templateGenerationError,
  'data-test-subj': dataTestSubj,
  errorCalloutTestSubj,
}) => (
  <>
    <EuiButton
      data-test-subj={dataTestSubj}
      iconSide="left"
      iconType="rocket"
      isLoading={isLoading}
      isDisabled={isDisabled}
      {...launchButtonProps}
    >
      {/* Keeps the id the label had before it moved into this shared button, so the existing
          translations still apply. */}
      <FormattedMessage
        id="xpack.fleet.awsIdentityFederationSetup.launchCloudFormation"
        defaultMessage="Launch CloudFormation"
      />
    </EuiButton>
    {templateGenerationError && (
      <>
        <EuiSpacer size="m" />
        <KbnDangerCallout
          announceOnMount
          data-test-subj={errorCalloutTestSubj}
          title={templateGenerationError}
          size="s"
        />
      </>
    )}
  </>
);
