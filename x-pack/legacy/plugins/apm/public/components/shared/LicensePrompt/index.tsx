/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButton, EuiEmptyPrompt } from '@elastic/eui';
import React from 'react';
import { i18n } from '@kbn/i18n';
import { useKibanaUrl } from '../../../hooks/useKibanaUrl';

interface Props {
  text: string;
}

export const LicensePrompt = ({ text }: Props) => {
  const licensePageUrl = useKibanaUrl(
    '/app/kibana',
    '/management/elasticsearch/license_management/home'
  );
  return (
    <EuiEmptyPrompt
      iconType="iInCircle"
      iconColor="subdued"
      title={
        <h2>
          {i18n.translate('xpack.apm.license.title', {
            defaultMessage: 'Start free 30-day trial'
          })}
        </h2>
      }
      body={<p>{text}</p>}
      actions={
        <EuiButton fill={true} href={licensePageUrl}>
          {i18n.translate('xpack.apm.license.button', {
            defaultMessage: 'Start trial'
          })}
        </EuiButton>
      }
    />
  );
};
