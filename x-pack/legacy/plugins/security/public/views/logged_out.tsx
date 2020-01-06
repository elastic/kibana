/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FormattedMessage } from '@kbn/i18n/react';
import { EuiButton } from '@elastic/eui';
import { AuthenticationStatePage } from 'plugins/security/components/authentication_state_page';
// @ts-ignore
import template from 'plugins/security/views/logged_out/logged_out.html';
import React from 'react';
import { render } from 'react-dom';
import chrome from 'ui/chrome';
import { I18nContext } from 'ui/i18n';

chrome
  .setVisible(false)
  .setRootTemplate(template)
  .setRootController('logout', ($scope: any) => {
    $scope.$$postDigest(() => {
      const domNode = document.getElementById('reactLoggedOutRoot');
      render(
        <I18nContext>
          <AuthenticationStatePage
            title={
              <FormattedMessage
                id="xpack.security.loggedOut.title"
                defaultMessage="Successfully logged out"
              />
            }
          >
            <EuiButton href={chrome.addBasePath('/')}>
              <FormattedMessage id="xpack.security.loggedOut.login" defaultMessage="Log in" />
            </EuiButton>
          </AuthenticationStatePage>
        </I18nContext>,
        domNode
      );
    });
  });
