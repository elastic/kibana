/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiImage,
  EuiPanel,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/css';
import { i18n } from '@kbn/i18n';
import { elasticAiAssistantImage } from '@kbn/observability-ai-assistant-plugin/public';
import { UPGRADE_LICENSE_TITLE } from '../i18n';
import { useLicenseManagementLocator } from '../hooks/use_license_management_locator';

export function IncorrectLicensePanel() {
  const handleNavigateToLicenseManagement = useLicenseManagementLocator();
  const { euiTheme } = useEuiTheme();

  const incorrectLicenseContainer = css`
    height: 100%;
    padding: ${euiTheme.size.base};
  `;

  return (
    <EuiPanel hasBorder hasShadow={false}>
      <EuiFlexGroup
        direction="column"
        alignItems="center"
        justifyContent="center"
        className={incorrectLicenseContainer}
      >
        <EuiImage src={elasticAiAssistantImage} alt="Elastic AI Assistant" size="m" />
        <EuiTitle>
          <h2>{UPGRADE_LICENSE_TITLE}</h2>
        </EuiTitle>
        <EuiText color="subdued">
          {i18n.translate('xpack.aiAssistant.incorrectLicense.body', {
            defaultMessage: 'You need an Enterprise license to use the Elastic AI Assistant.',
          })}
        </EuiText>
        <EuiFlexItem>
          <EuiFlexGroup>
            <EuiFlexItem>
              <EuiButton
                data-test-subj="observabilityAiAssistantIncorrectLicensePanelSubscriptionPlansButton"
                fill
                href="https://www.elastic.co/subscriptions"
                target="_blank"
              >
                {i18n.translate('xpack.aiAssistant.incorrectLicense.subscriptionPlansButton', {
                  defaultMessage: 'Subscription plans',
                })}
              </EuiButton>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiButtonEmpty
                data-test-subj="observabilityAiAssistantIncorrectLicensePanelManageLicenseButton"
                onClick={handleNavigateToLicenseManagement}
              >
                {i18n.translate('xpack.aiAssistant.incorrectLicense.manageLicense', {
                  defaultMessage: 'Manage license',
                })}
              </EuiButtonEmpty>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
}
