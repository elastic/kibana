/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import routes from 'ui/routes';
import template from 'plugins/security/views/management/roles_grid/roles.html';
import { ROLES_PATH } from '../management_urls';
import { getRolesBreadcrumbs } from '../breadcrumbs';
import { I18nContext } from 'ui/i18n';
import { RolesGridPage } from './components';

routes.when(ROLES_PATH, {
  template,
  k7Breadcrumbs: getRolesBreadcrumbs,
  controller($scope) {
    $scope.$$postDigest(() => {
      const domNode = document.getElementById('rolesGridReactRoot');

      render(
        <I18nContext>
          <RolesGridPage />
        </I18nContext>, domNode);

      // unmount react on controller destroy
      $scope.$on('$destroy', () => {
        unmountComponentAtNode(domNode);
      });
    });
  },
});
