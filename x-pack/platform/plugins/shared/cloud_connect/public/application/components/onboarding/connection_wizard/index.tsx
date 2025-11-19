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
import {
  STEP_1_TITLE,
  STEP_1_DESCRIPTION_1,
  STEP_1_DESCRIPTION_2,
  STEP_2_TITLE,
  STEP_3_TITLE,
  STEP_3_DESCRIPTION,
  SIGN_UP_BUTTON,
  LOGIN_BUTTON,
  CONNECT_BUTTON,
  API_KEY_PLACEHOLDER,
  getStep2Description,
} from './translations';

interface ConnectionWizardProps {
  onConnect: () => void;
}

export const ConnectionWizard: React.FC<ConnectionWizardProps> = ({ onConnect }) => {
  const { docLinks, http } = useCloudConnectedAppContext();
  const [apiKey, setApiKey] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleConnect = async () => {
    if (!apiKey.trim()) {
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const response = await http.post('/internal/cloud_connect/authenticate', {
        body: JSON.stringify({ apiKey: apiKey.trim() }),
      });

      setSuccess(true);
      onConnect();
      // eslint-disable-next-line no-console
      console.log('Authentication successful:', response);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to authenticate with Cloud Connect';
      setError(errorMessage);
      // eslint-disable-next-line no-console
      console.error('Authentication failed:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const steps: EuiStepsProps['steps'] = [
    {
      title: STEP_1_TITLE,
      titleSize: 'xs',
      status: 'incomplete',
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
    },
    {
      // @ts-expect-error - title can also be a ReactNode but types don't reflect this
      title: (
        <>
          {STEP_2_TITLE}
        </>
      ),
      titleSize: 'xs',
      status: 'incomplete',
      children: (
        <EuiText size="s">
          <p>{getStep2Description(docLinks.links.kibana.secureSavedObject)}</p>
        </EuiText>
      ),
    },
    {
      title: STEP_3_TITLE,
      titleSize: 'xs',
      status: 'incomplete',
      children: (
        <>
          <EuiText size="s">
            <p>{STEP_3_DESCRIPTION}</p>
          </EuiText>
          <EuiSpacer size="m" />
          <EuiFlexGroup gutterSize="s">
            <EuiFlexItem>
              <EuiFieldText
                placeholder={API_KEY_PLACEHOLDER}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                fullWidth
                disabled={isLoading}
              />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton
                onClick={handleConnect}
                disabled={!apiKey.trim() || isLoading}
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
          {success && (
            <>
              <EuiSpacer size="m" />
              <EuiCallOut title="Successfully connected!" color="success" iconType="check">
                <p>Your cluster has been authenticated and onboarded to Cloud Connect.</p>
              </EuiCallOut>
            </>
          )}
        </>
      ),
    },
  ];

  return <EuiSteps steps={steps} />;
};
