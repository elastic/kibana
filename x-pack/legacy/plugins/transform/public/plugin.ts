/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { unmountComponentAtNode } from 'react-dom';

import { SavedSearchLoader } from '../../../../../src/legacy/core_plugins/kibana/public/discover/types';

import { PLUGIN } from '../common/constants';
import { CLIENT_BASE_PATH } from './app/constants';
import { renderReact } from './app/app';
import { AppCore, AppPlugins } from './app/types';
import { Core, Plugins } from './shim';

import { breadcrumbService, docTitleService } from './app/services/navigation';
import { documentationLinksService } from './app/services/documentation';
import { httpService } from './app/services/http';
import { textService } from './app/services/text';
import { uiMetricService } from './app/services/ui_metric';

const REACT_ROOT_ID = 'transformReactRoot';

const template = `<kbn-management-app section="elasticsearch/transform"><div id="transformReactRoot"/></kbn-management-app>`;

export class Plugin {
  public start(core: Core, plugins: Plugins): void {
    const {
      i18n,
      routing,
      http,
      chrome,
      notification,
      documentation,
      docTitle,
      savedSearches: coreSavedSearches,
    } = core;
    const { management, uiMetric } = plugins;

    // Register management section
    const esSection = management.sections.getSection('elasticsearch');
    esSection.register(PLUGIN.ID, {
      visible: true,
      display: i18n.translate('xpack.transform.appName', {
        defaultMessage: 'Transforms',
      }),
      order: 3,
      url: `#${CLIENT_BASE_PATH}`,
    });

    // Initialize services
    textService.init(i18n);
    breadcrumbService.init(chrome, management.constants.BREADCRUMB);
    uiMetricService.init(uiMetric.createUiStatsReporter);
    documentationLinksService.init(
      documentation.esDocBasePath,
      documentation.esPluginDocBasePath,
      documentation.esStackOverviewDocBasePath
    );
    docTitleService.init(docTitle.change);

    const unmountReactApp = (): void => {
      const elem = document.getElementById(REACT_ROOT_ID);
      if (elem) {
        unmountComponentAtNode(elem);
      }
    };

    // Register react root
    routing.registerAngularRoute(`${CLIENT_BASE_PATH}/:section?/:subsection?/:view?/:id?`, {
      template,
      controllerAs: 'transformController',
      controller: (
        $scope: any,
        $route: any,
        $http: ng.IHttpService,
        $q: any,
        savedSearches: SavedSearchLoader
      ) => {
        // NOTE: We depend upon Angular's $http service because it's decorated with interceptors,
        // e.g. to check license status per request.
        http.setClient($http);
        httpService.init(http.getClient(), chrome);
        coreSavedSearches.setClient(savedSearches);

        // Angular Lifecycle
        const appRoute = $route.current;
        const stopListeningForLocationChange = $scope.$on('$locationChangeSuccess', () => {
          const currentRoute = $route.current;
          const isNavigationInApp = currentRoute.$$route.template === appRoute.$$route.template;

          // When we navigate within Transform, prevent Angular from re-matching the route and rebuild the app
          if (isNavigationInApp) {
            $route.current = appRoute;
          } else {
            // Any clean up when user leaves Transform
          }

          $scope.$on('$destroy', () => {
            if (stopListeningForLocationChange) {
              stopListeningForLocationChange();
            }
            unmountReactApp();
          });
        });

        $scope.$$postDigest(() => {
          unmountReactApp();
          const elem = document.getElementById(REACT_ROOT_ID);
          if (elem) {
            renderReact(
              elem,
              { i18n, notification, savedSearches: coreSavedSearches } as AppCore,
              { management: { sections: management.sections } } as AppPlugins
            );
          }
        });
      },
    });
  }
}
