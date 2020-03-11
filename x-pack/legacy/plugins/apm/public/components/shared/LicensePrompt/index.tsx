/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButton, EuiEmptyPrompt } from '@elastic/eui';
import React from 'react';
import { useKibanaUrl } from '../../../hooks/useKibanaUrl';

interface Props {
  title: string;
  text: string;
  buttonText: string;
}

export const LicensePrompt = ({ title, text, buttonText }: Props) => {
  const licensePageUrl = useKibanaUrl(
    '/app/kibana',
    '/management/elasticsearch/license_management/home'
  );
  return (
    <EuiEmptyPrompt
      iconType="iInCircle"
      iconColor=""
      title={<h2>{title}</h2>}
      body={<p>{text}</p>}
      actions={
        <EuiButton fill={true} href={licensePageUrl}>
          {buttonText}
        </EuiButton>
      }
    />
  );
};
