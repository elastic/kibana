/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import uiRoutes from 'ui/routes';
import { I18nContext } from 'ui/i18n';
// @ts-ignore
import { uiModules } from 'ui/modules';
import { AccessDeniedPage } from './page';

const module = uiModules.get('apps/ml', ['react']);

const template = `<access-denied />`;

uiRoutes.when('/access-denied', {
  template,
});

module.directive('accessDenied', function() {
  return {
    scope: {},
    restrict: 'E',
    link: async (scope: ng.IScope, element: ng.IAugmentedJQuery) => {
      ReactDOM.render(
        <I18nContext>{React.createElement(AccessDeniedPage)}</I18nContext>,
        element[0]
      );

      element.on('$destroy', () => {
        ReactDOM.unmountComponentAtNode(element[0]);
        scope.$destroy();
      });
    },
  };
});
