/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import 'ngreact';

import { wrapInI18nContext } from 'ui/i18n';
import { uiModules } from 'ui/modules';

const module = uiModules.get('apps/ml', ['react']);

import { getFileDataVisualizerBreadcrumbs } from './breadcrumbs';
import { checkBasicLicense } from '../../license/check_license';
import { checkFindFileStructurePrivilege } from '../../privilege/check_privilege';
import { getMlNodeCount } from '../../ml_nodes_check/check_ml_nodes';
import { loadMlServerInfo } from '../../services/ml_server_info';
import { loadIndexPatterns } from '../../util/index_utils';
import { FileDataVisualizerPage } from './file_datavisualizer';

import uiRoutes from 'ui/routes';

const template = `
  <div class="euiSpacer euiSpacer--s" />
  <file-datavisualizer-page />
`;

uiRoutes.when('/filedatavisualizer/?', {
  template,
  k7Breadcrumbs: getFileDataVisualizerBreadcrumbs,
  resolve: {
    CheckLicense: checkBasicLicense,
    privileges: checkFindFileStructurePrivilege,
    indexPatterns: loadIndexPatterns,
    mlNodeCount: getMlNodeCount,
    loadMlServerInfo,
  },
});

module.directive('fileDatavisualizerPage', function($injector) {
  const reactDirective = $injector.get('reactDirective');
  const indexPatterns = $injector.get('indexPatterns');
  const kibanaConfig = $injector.get('config');

  return reactDirective(
    wrapInI18nContext(FileDataVisualizerPage),
    undefined,
    { restrict: 'E' },
    { indexPatterns, kibanaConfig }
  );
});
