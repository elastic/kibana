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

import { IndexPatterns } from 'ui/index_patterns';
import { I18nContext } from 'ui/i18n';

import { InjectorService } from '../../../../common/types/angular';
import { createSearchItems } from '../../../jobs/new_job/utils/new_job_utils';

import { KibanaConfigTypeFix, KibanaContext } from '../../../contexts/kibana';

import { Page } from './page';

module.directive('mlDataFrameAnalyticsExploration', ($injector: InjectorService) => {
  return {
    scope: {},
    restrict: 'E',
    link: (scope: ng.IScope, element: ng.IAugmentedJQuery) => {
      const globalState = $injector.get<any>('globalState');
      globalState.fetch();

      const indexPatterns = $injector.get<IndexPatterns>('indexPatterns');
      const kibanaConfig = $injector.get<KibanaConfigTypeFix>('config');
      const $route = $injector.get<any>('$route');

      const { indexPattern, savedSearch, combinedQuery } = createSearchItems(
        kibanaConfig,
        $route.current.locals.indexPattern,
        $route.current.locals.savedSearch
      );

      const kibanaContext = {
        combinedQuery,
        currentIndexPattern: indexPattern,
        currentSavedSearch: savedSearch,
        indexPatterns,
        kibanaConfig,
      };

      ReactDOM.render(
        <I18nContext>
          <KibanaContext.Provider value={kibanaContext}>
            <Page
              jobId={globalState.ml.jobId}
              analysisType={globalState.ml.analysisType}
              jobStatus={globalState.ml.jobStatus}
            />
          </KibanaContext.Provider>
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
