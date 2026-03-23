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
  EuiPageTemplate,
  EuiSpacer,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useKibana } from '@kbn/reporting-public';

const title = (
  <h2 data-test-subj="license-prompt-title">
    {i18n.translate('xpack.reporting.schedules.licenseCheck.title', {
      defaultMessage: `Upgrade your license to use Scheduled Exports`,
    })}
  </h2>
);

export const LicensePrompt = React.memo(() => {
  const { application } = useKibana().services;

  return (
    <EuiPageTemplate.EmptyPrompt
      data-test-subj="schedules-license-prompt"
      title={title}
      body={
        <EuiFlexGroup direction="column">
          <EuiFlexItem>
            <EuiFlexGroup justifyContent="center">
              <EuiFlexItem grow={false}>
                <EuiButton
                  fill
                  data-test-subj="license-prompt-upgrade"
                  key="upgrade-subscription-button"
                  target="_blank"
                  href="https://www.elastic.co/subscriptions"
                >
                  {i18n.translate('xpack.reporting.schedules.licenseCheck.upgrade', {
                    defaultMessage: `Upgrade`,
                  })}
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
            <EuiSpacer size="s" />
            <EuiFlexGroup justifyContent="center">
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty
                  data-test-subj="license-prompt-trial"
                  key="start-trial-button"
                  target="_blank"
                  href={application.getUrlForApp('management', {
                    path: 'stack/license_management/home',
                  })}
                >
                  {i18n.translate('xpack.reporting.schedules.licenseCheck.startTrial', {
                    defaultMessage: `Start a trial`,
                  })}
                </EuiButtonEmpty>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      }
    />
  );
});
LicensePrompt.displayName = 'LicensePrompt';
