/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import routes from 'ui/routes';
import template from './api_keys.html';
import { API_KEYS_PATH } from '../management_urls';
import { getApiKeysBreadcrumbs } from '../breadcrumbs';
import { I18nContext } from 'ui/i18n';
import { ApiKeysGridPage } from './components';

routes.when(API_KEYS_PATH, {
  template,
  k7Breadcrumbs: getApiKeysBreadcrumbs,
  controller($scope) {
    $scope.$$postDigest(() => {
      const domNode = document.getElementById('apiKeysGridReactRoot');

      render(
        <I18nContext>
          <ApiKeysGridPage />
        </I18nContext>,
        domNode
      );

      // unmount react on controller destroy
      $scope.$on('$destroy', () => {
        unmountComponentAtNode(domNode);
      });
    });
  },
});
