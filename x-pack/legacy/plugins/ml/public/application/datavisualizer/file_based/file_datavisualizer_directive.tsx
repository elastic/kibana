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
import { IndexPatterns } from 'ui/index_patterns';
import { KibanaConfigTypeFix } from '../../contexts/kibana';
import { getFileDataVisualizerBreadcrumbs } from './breadcrumbs';
import { InjectorService } from '../../../common/types/angular';
import { checkBasicLicense } from '../../license/check_license';
import { checkFindFileStructurePrivilege } from '../../privilege/check_privilege';
import { getMlNodeCount } from '../../ml_nodes_check/check_ml_nodes';
import { loadMlServerInfo } from '../../services/ml_server_info';
import { loadIndexPatterns } from '../../util/index_utils';
import { FileDataVisualizerPage, FileDataVisualizerPageProps } from './file_datavisualizer';

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

module.directive('fileDatavisualizerPage', function($injector: InjectorService) {
  return {
    scope: {},
    restrict: 'E',
    link: (scope: ng.IScope, element: ng.IAugmentedJQuery) => {
      const indexPatterns = $injector.get<IndexPatterns>('indexPatterns');
      const kibanaConfig = $injector.get<KibanaConfigTypeFix>('config');

      const props: FileDataVisualizerPageProps = {
        indexPatterns,
        kibanaConfig,
      };
      ReactDOM.render(
        <I18nContext>{React.createElement(FileDataVisualizerPage, props)}</I18nContext>,
        element[0]
      );

      element.on('$destroy', () => {
        ReactDOM.unmountComponentAtNode(element[0]);
        scope.$destroy();
      });
    },
  };
});
