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

import uiRoutes from 'ui/routes';
import { I18nContext } from 'ui/i18n';
import { checkFullLicense } from '../../../license/check_license';
import { checkGetJobsPrivilege, checkPermission } from '../../../privilege/check_privilege';
import { getMlNodeCount } from '../../../ml_nodes_check/check_ml_nodes';
import { getFilterListsBreadcrumbs } from '../../breadcrumbs';

import { FilterLists } from './filter_lists';

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
    link(scope: ng.IScope, element: ng.IAugmentedJQuery) {
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
