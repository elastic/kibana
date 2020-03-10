/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButton, EuiEmptyPrompt } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { useKibanaUrl } from '../../../../../hooks/useKibanaUrl';

export function LicensePrompt() {
  const licensePageUrl = useKibanaUrl(
    '/app/kibana',
    '/management/elasticsearch/license_management/home'
  );
  return (
    <EuiEmptyPrompt
      iconType="iInCircle"
      iconColor=""
      title={
        <h2>
          {i18n.translate(
            'xpack.apm.settings.customizeUI.customLink.license.title',
            {
              defaultMessage: 'Start free 14-day trial'
            }
          )}
        </h2>
      }
      body={
        <>
          <p>
            {i18n.translate(
              'xpack.apm.settings.customizeUI.customLink.license.text',
              {
                defaultMessage:
                  "To create custom links, you must be subscribed to an Elastic Gold license or above. With it, you'll have the ability to create custom links to improve your workflow when analyzing your services."
              }
            )}
          </p>
        </>
      }
      actions={
        <EuiButton fill={true} href={licensePageUrl}>
          {i18n.translate(
            'xpack.apm.settings.customizeUI.customLink.license.button',
            {
              defaultMessage: 'Start 14-day free trial'
            }
          )}
        </EuiButton>
      }
    />
  );
}
