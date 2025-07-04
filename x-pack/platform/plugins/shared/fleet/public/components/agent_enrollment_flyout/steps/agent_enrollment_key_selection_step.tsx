/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiText, EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';

import type { EuiContainedStepProps } from '@elastic/eui/src/components/steps/steps';

import type { AgentPolicy } from '../../../types';

import { AdvancedAgentAuthenticationSettings } from '../advanced_agent_authentication_settings';

export const AgentEnrollmentKeySelectionStep = ({
  selectedPolicy,
  selectedApiKeyId,
  setSelectedAPIKeyId,
}: {
  selectedPolicy?: AgentPolicy;
  selectedApiKeyId?: string;
  setSelectedAPIKeyId: (key?: string) => void;
}): EuiContainedStepProps => {
  return {
    title: i18n.translate('xpack.fleet.agentEnrollment.stepConfigurePolicyAuthenticationTitle', {
      defaultMessage: 'Select enrollment token',
    }),
    children: (
      <>
        <EuiText>
          <FormattedMessage
            id="xpack.fleet.agentEnrollment.agentAuthenticationSettings"
            defaultMessage="{agentPolicyName} has been selected. Select which enrollment token to use when enrolling agents."
            values={{
              agentPolicyName: <strong>{selectedPolicy?.name}</strong>,
            }}
          />
        </EuiText>
        <EuiSpacer size="l" />
        <AdvancedAgentAuthenticationSettings
          agentPolicyId={selectedPolicy?.id}
          selectedApiKeyId={selectedApiKeyId}
          initialAuthenticationSettingsOpen
          onKeyChange={setSelectedAPIKeyId}
        />
      </>
    ),
  };
};
