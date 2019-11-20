/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import { I18nContext } from 'ui/i18n';

// @ts-ignore
import { uiModules } from 'ui/modules';
const module = uiModules.get('apps/ml', ['react']);

import uiRoutes from 'ui/routes';
import { getDataVisualizerBreadcrumbs } from './breadcrumbs';
import { checkBasicLicense } from '../license/check_license';
import { checkFindFileStructurePrivilege } from '../privilege/check_privilege';

const template = `
  <div class="euiSpacer euiSpacer--s" />
  <datavisualizer-selector data-test-subj="mlPageDataVisualizerSelector" />
`;

uiRoutes.when('/datavisualizer', {
  template,
  k7Breadcrumbs: getDataVisualizerBreadcrumbs,
  resolve: {
    CheckLicense: checkBasicLicense,
    privileges: checkFindFileStructurePrivilege,
  },
});

import { DatavisualizerSelector } from './datavisualizer_selector';

module.directive('datavisualizerSelector', function() {
  return {
    scope: {},
    restrict: 'E',
    link: (scope: ng.IScope, element: ng.IAugmentedJQuery) => {
      ReactDOM.render(
        <I18nContext>
          <DatavisualizerSelector />
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
