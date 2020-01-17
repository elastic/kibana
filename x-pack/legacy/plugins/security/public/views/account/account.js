/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import routes from 'ui/routes';
import template from './account.html';
import { i18n } from '@kbn/i18n';
import { I18nContext } from 'ui/i18n';
import { npSetup } from 'ui/new_platform';
import { AccountManagementPage } from './components';
import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';

routes.when('/account', {
  template,
  k7Breadcrumbs: () => [
    {
      text: i18n.translate('xpack.security.account.breadcrumb', {
        defaultMessage: 'Account Management',
      }),
    },
  ],
  controllerAs: 'accountController',
  controller($scope) {
    $scope.$on('$destroy', () => {
      const elem = document.getElementById('userProfileReactRoot');
      if (elem) {
        unmountComponentAtNode(elem);
      }
    });
    $scope.$$postDigest(() => {
      render(
        <I18nContext>
          <AccountManagementPage securitySetup={npSetup.plugins.security} />
        </I18nContext>,
        document.getElementById('userProfileReactRoot')
      );
    });
  },
});
