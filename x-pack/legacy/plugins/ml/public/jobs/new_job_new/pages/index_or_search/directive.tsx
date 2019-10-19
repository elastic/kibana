/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import ReactDOM from 'react-dom';

// @ts-ignore
import { uiModules } from 'ui/modules';
const module = uiModules.get('apps/ml', ['react']);
import { timefilter } from 'ui/timefilter';

import { I18nContext } from 'ui/i18n';
import { InjectorService } from '../../../../../common/types/angular';
import { Page } from './page';

module.directive('mlIndexOrSearch', ($injector: InjectorService) => {
  return {
    scope: {},
    restrict: 'E',
    link: async (scope: ng.IScope, element: ng.IAugmentedJQuery) => {
      // remove time picker from top of page
      timefilter.disableTimeRangeSelector();
      timefilter.disableAutoRefreshSelector();

      const $route = $injector.get<any>('$route');
      const { nextStepPath } = $route.current.locals;

      ReactDOM.render(
        <I18nContext>{React.createElement(Page, { nextStepPath })}</I18nContext>,
        element[0]
      );

      element.on('$destroy', () => {
        ReactDOM.unmountComponentAtNode(element[0]);
        scope.$destroy();
      });
    },
  };
});
