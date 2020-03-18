/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiButton,
  EuiPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiTitle,
  EuiText,
  EuiSpacer
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { invalidLicenseMessage } from '../../../../../../../plugins/apm/common/service_map';
import { useKibanaUrl } from '../../../hooks/useKibanaUrl';

export function PlatinumLicensePrompt() {
  // Set the height to give it some top margin
  const flexGroupStyle = { height: '60vh' };
  const flexItemStyle = { width: 600, textAlign: 'center' as const };

  const licensePageUrl = useKibanaUrl(
    '/app/kibana',
    '/management/elasticsearch/license_management/home'
  );

  return (
    <EuiFlexGroup
      alignItems="center"
      justifyContent="spaceAround"
      style={flexGroupStyle}
    >
      <EuiFlexItem grow={false} style={flexItemStyle}>
        <EuiPanel grow={false} hasShadow={true} paddingSize="none">
          <EuiPanel
            betaBadgeLabel={i18n.translate('xpack.apm.serviceMap.betaBadge', {
              defaultMessage: 'Beta'
            })}
            betaBadgeTooltipContent={i18n.translate(
              'xpack.apm.serviceMap.betaTooltipMessage',
              {
                defaultMessage:
                  'This feature is currently in beta. If you encounter any bugs or have feedback, please open an issue or visit our discussion forum.'
              }
            )}
          >
            <EuiSpacer size="l" />
            <EuiTitle>
              <h2>
                {i18n.translate('xpack.apm.serviceMap.licensePromptTitle', {
                  defaultMessage: 'Service maps is available in Platinum.'
                })}
              </h2>
            </EuiTitle>
            <EuiSpacer size="m" />
            <EuiText grow={false}>
              <p>{invalidLicenseMessage}</p>
            </EuiText>
            <EuiSpacer size="l" />
            <EuiButton href={licensePageUrl} fill={true}>
              {i18n.translate('xpack.apm.serviceMap.licensePromptButtonText', {
                defaultMessage: 'Start 30-day Platinum trial'
              })}
            </EuiButton>
          </EuiPanel>
        </EuiPanel>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
