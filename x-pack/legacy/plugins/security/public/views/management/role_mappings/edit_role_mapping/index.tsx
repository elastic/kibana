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
import template from './edit_role_mapping.html';
import { CREATE_ROLE_MAPPING_PATH } from '../../management_urls';
import { getEditRoleMappingBreadcrumbs } from '../../breadcrumbs';
import { EditRoleMappingPage } from './components';

routes.when(`${CREATE_ROLE_MAPPING_PATH}/:name?`, {
  template,
  k7Breadcrumbs: getEditRoleMappingBreadcrumbs,
  controller($scope, $route) {
    $scope.$$postDigest(() => {
      const domNode = document.getElementById('editRoleMappingReactRoot');

      const { name } = $route.current.params;

      render(
        <I18nContext>
          <EditRoleMappingPage
            name={name}
            roleMappingsAPI={new RoleMappingsAPI(npSetup.core.http)}
          />
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
