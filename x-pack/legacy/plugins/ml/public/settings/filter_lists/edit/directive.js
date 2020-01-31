/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import 'ngreact';
import React from 'react';
import ReactDOM from 'react-dom';

import { uiModules } from 'ui/modules';
const module = uiModules.get('apps/ml', ['react']);

import { getCreateFilterListBreadcrumbs, getEditFilterListBreadcrumbs } from '../../breadcrumbs';
import { checkFullLicense } from 'plugins/ml/license/check_license';
import { checkGetJobsPrivilege, checkPermission } from 'plugins/ml/privilege/check_privilege';
import { getMlNodeCount } from 'plugins/ml/ml_nodes_check/check_ml_nodes';
import { EditFilterList } from './edit_filter_list';

import uiRoutes from 'ui/routes';
import { I18nContext } from 'ui/i18n';

const template = `
  <div class="euiSpacer euiSpacer--s" />
  <ml-edit-filter-list />
`;

uiRoutes
  .when('/settings/filter_lists/new_filter_list', {
    template,
    k7Breadcrumbs: getCreateFilterListBreadcrumbs,
    resolve: {
      CheckLicense: checkFullLicense,
      privileges: checkGetJobsPrivilege,
      mlNodeCount: getMlNodeCount,
    },
  })
  .when('/settings/filter_lists/edit_filter_list/:filterId', {
    template,
    k7Breadcrumbs: getEditFilterListBreadcrumbs,
    resolve: {
      CheckLicense: checkFullLicense,
      privileges: checkGetJobsPrivilege,
      mlNodeCount: getMlNodeCount,
    },
  });

module.directive('mlEditFilterList', function($route) {
  return {
    restrict: 'E',
    replace: false,
    scope: {},
    link: function(scope, element) {
      const props = {
        filterId: $route.current.params.filterId,
        canCreateFilter: checkPermission('canCreateFilter'),
        canDeleteFilter: checkPermission('canDeleteFilter'),
      };

      ReactDOM.render(
        <I18nContext>
          <EditFilterList {...props} />
        </I18nContext>,
        element[0]
      );
    },
  };
});
