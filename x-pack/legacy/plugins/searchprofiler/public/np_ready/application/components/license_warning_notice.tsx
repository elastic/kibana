/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiCallOut, EuiText, EuiLink, EuiCode } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';

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
    <div className="prfDevTool__licenseWarning__container">
      <EuiCallOut
        title={i18n.translate('xpack.searchProfiler.licenseErrorMessageTitle', {
          defaultMessage: 'License error',
        })}
        color="warning"
        iconType="alert"
        style={{ padding: '16px' }}
      >
        <EuiText size="s">
          <p>
            <FormattedMessage
              id="xpack.searchProfiler.licenseErrorMessageDescription"
              defaultMessage="The Profiler Visualization requires an active license ({licenseTypeList} or {platinumLicenseType}), but none were found in your cluster."
              values={{
                licenseTypeList: (
                  <>
                    <EuiCode>{trialLicense}</EuiCode>, <EuiCode>{basicLicense}</EuiCode>,{' '}
                    <EuiCode>{goldLicense}</EuiCode>
                  </>
                ),
                platinumLicenseType: <EuiCode>{platinumLicense}</EuiCode>,
              }}
            />
          </p>
          <p>
            <FormattedMessage
              id="xpack.searchProfiler.registerLicenseDescription"
              defaultMessage="Please {registerLicenseLink} to continue using the Search Profiler"
              values={{
                registerLicenseLink: (
                  <EuiLink href="https://www.elastic.co/subscriptions" rel="noopener">
                    {registerLicenseLinkLabel}
                  </EuiLink>
                ),
              }}
            />
          </p>
        </EuiText>
      </EuiCallOut>
    </div>
  );
};
