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
import { timefilter } from 'ui/timefilter';
import { IndexPatterns } from 'ui/index_patterns';

import { I18nContext } from 'ui/i18n';
import { IPrivate } from 'ui/private';
import { InjectorService } from '../../../../../common/types/angular';

import { SearchItemsProvider } from '../../../new_job/utils/new_job_utils';
import { Page } from './page';

import { KibanaContext, KibanaConfigTypeFix } from '../../../../contexts/kibana';

module.directive('mlJobTypePage', ($injector: InjectorService) => {
  return {
    scope: {},
    restrict: 'E',
    link: async (scope: ng.IScope, element: ng.IAugmentedJQuery) => {
      // remove time picker from top of page
      timefilter.disableTimeRangeSelector();
      timefilter.disableAutoRefreshSelector();

      const indexPatterns = $injector.get<IndexPatterns>('indexPatterns');
      const kbnBaseUrl = $injector.get<string>('kbnBaseUrl');
      const kibanaConfig = $injector.get<KibanaConfigTypeFix>('config');
      const Private = $injector.get<IPrivate>('Private');

      const createSearchItems = Private(SearchItemsProvider);
      const { indexPattern, savedSearch, combinedQuery } = createSearchItems();
      const kibanaContext = {
        combinedQuery,
        currentIndexPattern: indexPattern,
        currentSavedSearch: savedSearch,
        indexPatterns,
        kbnBaseUrl,
        kibanaConfig,
      };

      ReactDOM.render(
        <I18nContext>
          <KibanaContext.Provider value={kibanaContext}>
            {React.createElement(Page)}
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
