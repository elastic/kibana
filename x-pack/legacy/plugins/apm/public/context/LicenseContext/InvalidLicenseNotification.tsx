/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { EuiButton, EuiEmptyPrompt } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { useApmPluginContext } from '../../hooks/useApmPluginContext';

export function InvalidLicenseNotification() {
  const { core } = useApmPluginContext();
  const manageLicenseURL = core.http.basePath.prepend(
    '/app/kibana#/management/elasticsearch/license_management'
  );

  return (
    <EuiEmptyPrompt
      iconType="alert"
      iconColor="warning"
      title={
        <h1>
          {i18n.translate('xpack.apm.invalidLicense.title', {
            defaultMessage: 'Invalid License'
          })}
        </h1>
      }
      body={
        <p>
          {i18n.translate('xpack.apm.invalidLicense.message', {
            defaultMessage:
              'The APM UI is not available because your current license has expired or is no longer valid.'
          })}
        </p>
      }
      actions={[
        <EuiButton href={manageLicenseURL}>
          {i18n.translate('xpack.apm.invalidLicense.licenseManagementLink', {
            defaultMessage: 'Manage your license'
          })}
        </EuiButton>
      ]}
    />
  );
}
