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
  EuiBadge,
} from '@elastic/eui';
import { useCloudConnectedAppContext } from '../../../application/app_context';
import {
  STEP_1_TITLE,
  STEP_1_DESCRIPTION,
  STEP_2_TITLE,
  STEP_3_TITLE,
  STEP_3_DESCRIPTION,
  SIGN_UP_BUTTON,
  LOGIN_BUTTON,
  CONNECT_BUTTON,
  API_KEY_PLACEHOLDER,
  OPTIONAL_STEP,
  getStep2Description,
} from './translations';

interface ConnectionWizardProps {
  onConnect: (apiKey: string) => void;
}

export const ConnectionWizard: React.FC<ConnectionWizardProps> = ({ onConnect }) => {
  const { docLinks } = useCloudConnectedAppContext();
  const [apiKey, setApiKey] = useState('');

  const handleConnect = () => {
    if (apiKey.trim()) {
      onConnect(apiKey);
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
            <p>{STEP_1_DESCRIPTION}</p>
          </EuiText>
          <EuiSpacer size="m" />
          <EuiFlexGroup gutterSize="s" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiButton fill>{SIGN_UP_BUTTON}</EuiButton>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton>{LOGIN_BUTTON}</EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </>
      ),
    },
    {
      // @ts-expect-error - title can also be a ReactNode but types don't reflect this
      title: (
        <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
          <EuiFlexItem grow={false}>{STEP_2_TITLE}</EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiBadge color="hollow">{OPTIONAL_STEP}</EuiBadge>
          </EuiFlexItem>
        </EuiFlexGroup>
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
              />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton onClick={handleConnect} disabled={!apiKey.trim()}>
                {CONNECT_BUTTON}
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </>
      ),
    },
  ];

  return <EuiSteps steps={steps} />;
};
