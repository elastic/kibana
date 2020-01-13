/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import routes from 'ui/routes';
import { I18nContext } from 'ui/i18n';
import { npSetup } from 'ui/new_platform';
import { RoleMappingsAPI } from '../../../../lib/role_mappings_api';
// @ts-ignore
import template from './role_mappings.html';
import { ROLE_MAPPINGS_PATH } from '../../management_urls';
import { getRoleMappingBreadcrumbs } from '../../breadcrumbs';
import { RoleMappingsGridPage } from './components';

routes.when(ROLE_MAPPINGS_PATH, {
  template,
  k7Breadcrumbs: getRoleMappingBreadcrumbs,
  controller($scope) {
    $scope.$$postDigest(() => {
      const domNode = document.getElementById('roleMappingsGridReactRoot');

      render(
        <I18nContext>
          <RoleMappingsGridPage roleMappingsAPI={new RoleMappingsAPI(npSetup.core.http)} />
        </I18nContext>,
        domNode
      );

      // unmount react on controller destroy
      $scope.$on('$destroy', () => {
        if (domNode) {
          unmountComponentAtNode(domNode);
        }
      });
    });
  },
});
