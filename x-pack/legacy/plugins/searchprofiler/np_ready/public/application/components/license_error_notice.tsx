/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiCallOut, EuiText, EuiIcon } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

export const LicenseWarningNotice = () => {
  const registerLicenseLinkLabel = i18n.translate('xpack.searchProfiler.registerLicenseLinkLabel', {
    defaultMessage: 'register a license',
  });
  const trialLicense = i18n.translate('xpack.searchProfiler.trialLicenseTitle', {
    defaultMessage: 'Trial',
  });
  const basicLicense = i18n.translate('xpack.searchProfiler.basicLicenseTitle', {
    defaultMessage: 'Basic',
  });
  const goldLicense = i18n.translate('xpack.searchProfiler.goldLicenseTitle', {
    defaultMessage: 'Gold',
  });
  const platinumLicense = i18n.translate('xpack.searchProfiler.platinumLicenseTitle', {
    defaultMessage: 'Platinum',
  });

  return (
    <EuiCallOut color="warning" style={{ padding: '16px' }}>
      <EuiText>
        <h2>
          <EuiIcon type="alert" />
          {i18n.translate('xpack.searchProfiler.licenseErrorMessageTitle', {
            defaultMessage: 'License error',
          })}
        </h2>
      </EuiText>

      <EuiText>
        <p>
          {i18n.translate('xpack.searchProfiler.licenseErrorMessageDescription', {
            defaultMessage:
              'The Profiler Visualization requires an active license ({licenseTypeList} or {platinumLicenseType}), but none were found in your cluster.',
            values: {
              html_licenseTypeList: `<code>${trialLicense}</code>, <code>${basicLicense}</code>, <code>${goldLicense}</code>`,
              html_platinumLicenseType: `<code>${platinumLicense}</code>`,
            },
          })}
        </p>
      </EuiText>

      <p>
        {i18n.translate('xpack.searchProfiler.registerLicenseDescription', {
          defaultMessage: 'Please {registerLicenseLink} to continue using the Search Profiler',
          values: {
            html_registerLicenseLink: `<a class='kuiLink' href='https://www.elastic.co/subscriptions' rel='noopener'>${registerLicenseLinkLabel}</a>`,
          },
        })}
      </p>
    </EuiCallOut>
  );
};
