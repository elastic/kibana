/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import {
  FeatureCatalogueRegistryProvider,
  FeatureCatalogueCategory,
} from 'ui/registry/feature_catalogue';
import { render, unmountComponentAtNode } from 'react-dom';
import { Provider } from 'react-redux';
import { i18n } from '@kbn/i18n';
import { I18nContext } from 'ui/i18n';
import { npStart } from 'ui/new_platform';
import routes from 'ui/routes';

import { CRUD_APP_BASE_PATH } from './constants';
import { setHttp, setUserHasLeftApp } from './services';
import { App } from './app';
import template from './main.html';
import { rollupJobsStore } from './store';

const esSection = npStart.plugins.management.legacy.getSection('elasticsearch');

esSection.register('rollup_jobs', {
  visible: true,
  display: i18n.translate('xpack.rollupJobs.appTitle', { defaultMessage: 'Rollup Jobs' }),
  order: 3,
  url: `#${CRUD_APP_BASE_PATH}/job_list`,
});

const renderReact = async elem => {
  render(
    <I18nContext>
      <Provider store={rollupJobsStore}>
        <App />
      </Provider>
    </I18nContext>,
    elem
  );
};

routes.when(`${CRUD_APP_BASE_PATH}/:view?`, {
  template: template,
  controllerAs: 'rollupJobs',
  controller: class IndexRollupJobsController {
    constructor($scope, $route, $injector) {
      // NOTE: We depend upon Angular's $http service because it's decorated with interceptors,
      // e.g. to check license status per request.
      setHttp($injector.get('$http'));

      // If returning to the app, we'll need to reset this state.
      setUserHasLeftApp(false);

      $scope.$$postDigest(() => {
        const appElement = document.getElementById('rollupJobsReactRoot');
        renderReact(appElement);

        const appRoute = $route.current;
        const stopListeningForLocationChange = $scope.$on('$locationChangeSuccess', () => {
          const currentRoute = $route.current;

          const isNavigationInApp = currentRoute.$$route.template === appRoute.$$route.template;

          // When we navigate within rollups, prevent Angular from re-matching the route and
          // rebuilding the app.
          if (isNavigationInApp) {
            $route.current = appRoute;
          } else {
            // Set internal flag so we can prevent reacting to the route change internally.
            setUserHasLeftApp(true);
          }
        });

        $scope.$on('$destroy', () => {
          stopListeningForLocationChange();
          unmountComponentAtNode(appElement);
        });
      });
    }
  },
});

FeatureCatalogueRegistryProvider.register(() => {
  return {
    id: 'rollup_jobs',
    title: 'Rollups',
    description: i18n.translate('xpack.rollupJobs.featureCatalogueDescription', {
      defaultMessage: 'Summarize and store historical data in a smaller index for future analysis.',
    }),
    icon: 'indexRollupApp',
    path: `#${CRUD_APP_BASE_PATH}/job_list`,
    showOnHomePage: true,
    category: FeatureCatalogueCategory.ADMIN,
  };
});
