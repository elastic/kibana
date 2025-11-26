/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import type { EuiStepsProps } from '@elastic/eui';
import {
  EuiSteps,
  EuiText,
  EuiSpacer,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButton,
  EuiFieldText,
  EuiCallOut,
} from '@elastic/eui';
import { useCloudConnectedAppContext } from '../../../app_context';
import { apiService } from '../../../../lib/api';
import {
  STEP_1_TITLE,
  STEP_1_DESCRIPTION_1,
  STEP_1_DESCRIPTION_2,
  STEP_2_TITLE,
  getStep2Description,
  STEP_3_TITLE,
  getStep3Description,
  SIGN_UP_BUTTON,
  LOGIN_BUTTON,
  CONNECT_BUTTON,
  API_KEY_PLACEHOLDER,
} from './translations';

interface ConnectionWizardProps {
  onConnect: () => void;
}

export const ConnectionWizard: React.FC<ConnectionWizardProps> = ({ onConnect }) => {
  const { docLinks, hasEncryptedSOEnabled } = useCloudConnectedAppContext();
  const [apiKey, setApiKey] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConnect = async () => {
    if (!apiKey.trim()) {
      return;
    }

    setIsLoading(true);
    setError(null);

    const { data, error: apiError } = await apiService.authenticate(apiKey.trim());

    if (apiError) {
      setError(apiError.message || 'Failed to authenticate with Cloud Connect');
      setIsLoading(false);
      return;
    }

    if (data?.success) {
      onConnect();
    }

    setIsLoading(false);
  };

  const step1 = {
    title: STEP_1_TITLE,
    titleSize: 'xs' as const,
    status: 'incomplete' as const,
    children: (
      <>
        <EuiText size="s">
          <p>{STEP_1_DESCRIPTION_1}</p>
          <p>{STEP_1_DESCRIPTION_2}</p>
        </EuiText>
        <EuiSpacer size="m" />
        <EuiFlexGroup gutterSize="s" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiButton
              fill
              href="https://cloud.elastic.co/registration?onboarding_service_type=ccm"
              target="_blank"
              iconType="popout"
              iconSide="right"
            >
              {SIGN_UP_BUTTON}
            </EuiButton>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              href="https://cloud.elastic.co/login?redirectTo=%2Fconnect-cluster-services"
              target="_blank"
              iconType="popout"
              iconSide="right"
            >
              {LOGIN_BUTTON}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </>
    ),
  };

  const step2 = {
    title: STEP_2_TITLE,
    titleSize: 'xs' as const,
    status: 'incomplete' as const,
    children: (
      <EuiText size="s">
        <p>{getStep2Description(docLinks.links.kibana.secureSavedObject)}</p>
      </EuiText>
    ),
  };

  const stepApiKey = {
    title: STEP_3_TITLE,
    titleSize: 'xs' as const,
    status: 'incomplete' as const,
    children: (
      <>
        <EuiText size="s">
          <p>{getStep3Description()}</p>
        </EuiText>
        <EuiSpacer size="m" />
        <EuiFlexGroup gutterSize="s">
          <EuiFlexItem>
            <EuiFieldText
              placeholder={API_KEY_PLACEHOLDER}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              fullWidth
              disabled={isLoading || !hasEncryptedSOEnabled}
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              onClick={handleConnect}
              disabled={!apiKey.trim() || isLoading || !hasEncryptedSOEnabled}
              isLoading={isLoading}
            >
              {CONNECT_BUTTON}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
        {error && (
          <>
            <EuiSpacer size="m" />
            <EuiCallOut title="Authentication failed" color="danger" iconType="error">
              <p>{error}</p>
            </EuiCallOut>
          </>
        )}
      </>
    ),
  };

  // Only show step 2 (encryption warning) if encrypted saved objects is not enabled
  const steps: EuiStepsProps['steps'] = hasEncryptedSOEnabled
    ? [step1, stepApiKey]
    : [step1, step2, stepApiKey];

  return <EuiSteps steps={steps} />;
};
