/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiCallOut, EuiLink } from '@elastic/eui';
import { LICENSE_STATUS_VALID } from '../../../common/constants';

interface AppProps {
  licenseStatus: { status: string; message: string };
}

export const App = ({ licenseStatus }: AppProps) => {
  const { status, message } = licenseStatus;

  if (status !== LICENSE_STATUS_VALID) {
    return (
      <EuiCallOut
        title={
          <FormattedMessage
            id="xpack.alerting.app.licenseErrorTitle"
            defaultMessage="License error"
          />
        }
        color="warning"
        iconType="help"
      >
        {message}{' '}
        <EuiLink href="#/management/elasticsearch/license_management/home">
          <FormattedMessage
            id="xpack.alerting.app.licenseErrorLinkText"
            defaultMessage="Manage your license."
          />
        </EuiLink>
      </EuiCallOut>
    );
  }

  return <AppWithoutRouter />;
};

// Export this so we can test it with a different router.
export const AppWithoutRouter = () => <div>hi</div>;
