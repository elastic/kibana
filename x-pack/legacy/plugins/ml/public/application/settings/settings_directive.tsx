/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import 'ngreact';
import React from 'react';
import ReactDOM from 'react-dom';

// @ts-ignore
import { uiModules } from 'ui/modules';
const module = uiModules.get('apps/ml', ['react']);

import { I18nContext } from 'ui/i18n';
import uiRoutes from 'ui/routes';
import { timefilter } from 'ui/timefilter';
import { checkFullLicense } from '../license/check_license';
import { checkGetJobsPrivilege, checkPermission } from '../privilege/check_privilege';
import { getMlNodeCount } from '../ml_nodes_check/check_ml_nodes';
import { getSettingsBreadcrumbs } from './breadcrumbs';

const template = `
  <div class="euiSpacer euiSpacer--s" />
  <ml-settings />
`;

uiRoutes.when('/settings', {
  template,
  k7Breadcrumbs: getSettingsBreadcrumbs,
  resolve: {
    CheckLicense: checkFullLicense,
    privileges: checkGetJobsPrivilege,
    mlNodeCount: getMlNodeCount,
  },
});

import { Settings } from './settings';

module.directive('mlSettings', function() {
  const canGetFilters = checkPermission('canGetFilters');
  const canGetCalendars = checkPermission('canGetCalendars');

  return {
    restrict: 'E',
    replace: false,
    scope: {},
    link(scope: ng.IScope, element: ng.IAugmentedJQuery) {
      timefilter.disableTimeRangeSelector();
      timefilter.disableAutoRefreshSelector();

      ReactDOM.render(
        <I18nContext>
          <Settings canGetCalendars={canGetCalendars} canGetFilters={canGetFilters} />
        </I18nContext>,
        element[0]
      );
    },
  };
});
