/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiButton,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { invalidLicenseMessage } from '../../../../../../../plugins/apm/common/service_map';
import { useKibanaUrl } from '../../../hooks/useKibanaUrl';

export function PlatinumLicensePrompt() {
  // Set the height to give it some top margin
  const style = { height: '60vh' };

  const licensePageUrl = useKibanaUrl(
    '/app/kibana',
    '/management/elasticsearch/license_management/home'
  );

  return (
    <EuiFlexGroup
      alignItems="center"
      justifyContent="spaceAround"
      style={style}
    >
      <EuiFlexItem grow={false}>
        <EuiPanel grow={false} hasShadow={true}>
          <EuiEmptyPrompt
            actions={[
              <EuiButton fill={true} href={licensePageUrl}>
                {i18n.translate(
                  'xpack.apm.serviceMap.licensePromptButtonText',
                  {
                    defaultMessage: 'Start 30-day Platinum trial'
                  }
                )}
              </EuiButton>
            ]}
            body={<p>{invalidLicenseMessage}</p>}
            title={
              <h2>
                {i18n.translate('xpack.apm.serviceMap.licensePromptTitle', {
                  defaultMessage: 'Service maps is available in Platinum.'
                })}
              </h2>
            }
          />
        </EuiPanel>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
