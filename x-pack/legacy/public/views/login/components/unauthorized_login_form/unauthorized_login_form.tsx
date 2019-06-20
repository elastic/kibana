/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import chrome from 'ui/chrome';
import { EuiButton, EuiEmptyPrompt, EuiPanel } from '@elastic/eui';
import { FormattedMessage, InjectedIntl, injectI18n } from '@kbn/i18n/react';
import React from 'react';

interface Props {
  window: any;
  intl: InjectedIntl;
}

export const UnauthorizedLoginForm = injectI18n((props: Props) => {
  function handleLogoutClick() {
    props.window.location = chrome.addBasePath('/logout');
  }

  return (
    <EuiPanel data-test-subj="unauthorized-login-form">
      <EuiEmptyPrompt
        iconType="lock"
        title={
          <h2>
            <FormattedMessage
              id="xpack.security.login.unauthorizedLoginForm.noAccessTitle"
              defaultMessage="No access to Kibana"
            />
          </h2>
        }
        body={
          <p>
            <FormattedMessage
              id="xpack.security.login.unauthorizedLoginForm.noAccessMessage"
              defaultMessage="Your account does not allow access to Kibana. Please contact your administrator."
            />
          </p>
        }
        actions={
          <EuiButton color="primary" fill onClick={handleLogoutClick}>
            Logout
          </EuiButton>
        }
      />
    </EuiPanel>
  );
});
