/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { get } from 'lodash';
import { parseNext } from 'plugins/security/lib/parse_next';
import { LoginPage } from 'plugins/security/views/login/components';
// @ts-ignore
import template from 'plugins/security/views/login/login.html';
import React from 'react';
import { render } from 'react-dom';
import 'ui/autoload/styles';
import chrome from 'ui/chrome';
import { I18nContext } from 'ui/i18n';
import { parse } from 'url';
import { LoginState } from '../../../common/login_state';
const messageMap = {
  SESSION_EXPIRED: i18n.translate('xpack.security.login.sessionExpiredDescription', {
    defaultMessage: 'Your session has timed out. Please log in again.',
  }),
  LOGGED_OUT: i18n.translate('xpack.security.login.loggedOutDescription', {
    defaultMessage: 'You have logged out of Kibana.',
  }),
};

interface AnyObject {
  [key: string]: any;
}

(chrome as AnyObject)
  .setVisible(false)
  .setRootTemplate(template)
  .setRootController(
    'login',
    (
      $scope: AnyObject,
      $http: AnyObject,
      $window: AnyObject,
      secureCookies: boolean,
      loginState: LoginState
    ) => {
      const basePath = chrome.getBasePath();
      const next = parseNext($window.location.href, basePath);
      const isSecure = !!$window.location.protocol.match(/^https/);

      $scope.$$postDigest(() => {
        const domNode = document.getElementById('reactLoginRoot');

        const msgQueryParam = parse($window.location.href, true).query.msg || '';

        render(
          <I18nContext>
            <LoginPage
              http={$http}
              window={$window}
              infoMessage={get(messageMap, msgQueryParam)}
              loginState={loginState}
              isSecureConnection={isSecure}
              requiresSecureConnection={secureCookies}
              next={next}
            />
          </I18nContext>,
          domNode
        );
      });
    }
  );
