/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import { i18n } from '@kbn/i18n';
import { npStart } from 'ui/new_platform';
import routes from 'ui/routes';

routes.when('/account', {
  template: '<div id="userProfileReactRoot" />',
  k7Breadcrumbs: () => [
    {
      text: i18n.translate('xpack.security.account.breadcrumb', {
        defaultMessage: 'Account Management',
      }),
    },
  ],
  controllerAs: 'accountController',
  controller($scope) {
    $scope.$$postDigest(() => {
      const domNode = document.getElementById('userProfileReactRoot');

      render(
        <npStart.plugins.security.__legacyCompat.account_management.AccountManagementPage />,
        domNode
      );

      $scope.$on('$destroy', () => unmountComponentAtNode(domNode));
    });
  },
});
