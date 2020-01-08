/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { FormattedMessage } from '@kbn/i18n/react';
import { EuiButton } from '@elastic/eui';
import React from 'react';
import { render } from 'react-dom';
import chrome from 'ui/chrome';
import { I18nContext } from 'ui/i18n';
import { npSetup } from 'ui/new_platform';
import { SecurityPluginSetup } from '../../../../../../plugins/security/public';
import { AuthenticatedUser } from '../../../common/model';
import { AuthenticationStatePage } from '../../components/authentication_state_page';

chrome
  .setVisible(false)
  .setRootTemplate('<div id="reactOverwrittenSessionRoot" />')
  .setRootController('overwritten_session', ($scope: any) => {
    $scope.$$postDigest(() => {
      ((npSetup.plugins as unknown) as { security: SecurityPluginSetup }).security.authc
        .getCurrentUser()
        .then((user: AuthenticatedUser) => {
          const overwrittenSessionPage = (
            <I18nContext>
              <AuthenticationStatePage
                title={
                  <FormattedMessage
                    id="xpack.security.overwrittenSession.title"
                    defaultMessage="You previously logged in as a different user."
                  />
                }
              >
                <EuiButton href={chrome.addBasePath('/')}>
                  <FormattedMessage
                    id="xpack.security.overwrittenSession.continueAsUserText"
                    defaultMessage="Continue as {username}"
                    values={{ username: user.username }}
                  />
                </EuiButton>
              </AuthenticationStatePage>
            </I18nContext>
          );
          render(overwrittenSessionPage, document.getElementById('reactOverwrittenSessionRoot'));
        });
    });
  });
