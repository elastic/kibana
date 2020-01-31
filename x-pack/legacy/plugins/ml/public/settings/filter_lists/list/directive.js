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

import { getFilterListsBreadcrumbs } from '../../breadcrumbs';
import { checkFullLicense } from 'plugins/ml/license/check_license';
import { checkGetJobsPrivilege, checkPermission } from 'plugins/ml/privilege/check_privilege';
import { getMlNodeCount } from 'plugins/ml/ml_nodes_check/check_ml_nodes';
import { FilterLists } from './filter_lists';

import uiRoutes from 'ui/routes';
import { I18nContext } from 'ui/i18n';

const template = `
  <div class="euiSpacer euiSpacer--s" />
  <ml-filter-lists />
`;

uiRoutes.when('/settings/filter_lists', {
  template,
  k7Breadcrumbs: getFilterListsBreadcrumbs,
  resolve: {
    CheckLicense: checkFullLicense,
    privileges: checkGetJobsPrivilege,
    mlNodeCount: getMlNodeCount,
  },
});

module.directive('mlFilterLists', function() {
  return {
    restrict: 'E',
    replace: false,
    scope: {},
    link: function(scope, element) {
      const props = {
        canCreateFilter: checkPermission('canCreateFilter'),
        canDeleteFilter: checkPermission('canDeleteFilter'),
      };

      ReactDOM.render(
        <I18nContext>
          <FilterLists {...props} />
        </I18nContext>,
        element[0]
      );
    },
  };
});
