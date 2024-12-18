/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButton, EuiSpacer, EuiCallOut, EuiSkeletonText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';

import type { AgentPolicy } from '../../../common';

import type { CloudSecurityIntegration } from '../agent_enrollment_flyout/types';

import { useCreateAzureArmTemplateUrl } from './hooks';

import { AzureArmTemplateGuide } from './azure_arm_template_guide';

interface Props {
  enrollmentAPIKey?: string;
  cloudSecurityIntegration: CloudSecurityIntegration;
  agentPolicy?: AgentPolicy;
}
export const AzureArmTemplateInstructions: React.FunctionComponent<Props> = ({
  enrollmentAPIKey,
  cloudSecurityIntegration,
  agentPolicy,
}) => {
  const { isLoading, azureArmTemplateUrl, error, isError } = useCreateAzureArmTemplateUrl({
    enrollmentAPIKey,
    azureArmTemplateProps: cloudSecurityIntegration?.azureArmTemplateProps,
  });

  if (error && isError) {
    return (
      <>
        <EuiSpacer size="m" />
        <EuiCallOut title={error} color="danger" iconType="error" />
      </>
    );
  }

  return (
    <EuiSkeletonText
      lines={3}
      size="m"
      isLoading={isLoading || cloudSecurityIntegration?.isLoading}
      contentAriaLabel={i18n.translate(
        'xpack.fleet.agentEnrollment.azureArmTemplate.loadingAriaLabel',
        {
          defaultMessage: 'Loading ARM Template instructions',
        }
      )}
    >
      <AzureArmTemplateGuide
        azureAccountType={cloudSecurityIntegration?.azureArmTemplateProps?.azureAccountType}
        agentPolicy={agentPolicy}
        enrollmentToken={enrollmentAPIKey}
      />
      <EuiSpacer size="m" />
      <EuiButton
        color="primary"
        fill
        target="_blank"
        iconSide="left"
        iconType="launch"
        fullWidth
        href={azureArmTemplateUrl}
      >
        <FormattedMessage
          id="xpack.fleet.agentEnrollment.azureArmTemplate.launchButton"
          defaultMessage="Launch ARM Template"
        />
      </EuiButton>
    </EuiSkeletonText>
  );
};
