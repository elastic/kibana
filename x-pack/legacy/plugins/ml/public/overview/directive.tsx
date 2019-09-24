/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import ReactDOM from 'react-dom';
import React from 'react';
import { I18nContext } from 'ui/i18n';
import { timefilter } from 'ui/timefilter';
// @ts-ignore
import { uiModules } from 'ui/modules';
const module = uiModules.get('apps/ml', ['react']);

import { OverviewPage } from './overview_page';

module.directive('mlOverview', function() {
  return {
    scope: {},
    restrict: 'E',
    link: async (scope: ng.IScope, element: ng.IAugmentedJQuery) => {
      timefilter.disableTimeRangeSelector();
      timefilter.disableAutoRefreshSelector();

      ReactDOM.render(
        <I18nContext>
          <OverviewPage />
        </I18nContext>,
        element[0]
      );

      element.on('$destroy', () => {
        ReactDOM.unmountComponentAtNode(element[0]);
        scope.$destroy();
      });
    },
  };
});
