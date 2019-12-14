/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import 'ngreact';

import { wrapInI18nContext } from 'ui/i18n';
import { uiModules } from 'ui/modules';
const module = uiModules.get('apps/ml', ['react']);

import { getDataVisualizerBreadcrumbs } from './breadcrumbs';
import { checkBasicLicense } from '../license/check_license';
import { checkFindFileStructurePrivilege } from '../privilege/check_privilege';

import uiRoutes from 'ui/routes';

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

module.directive('datavisualizerSelector', function($injector) {
  const reactDirective = $injector.get('reactDirective');

  return reactDirective(
    wrapInI18nContext(DatavisualizerSelector),
    undefined,
    { restrict: 'E' },
    {}
  );
});
