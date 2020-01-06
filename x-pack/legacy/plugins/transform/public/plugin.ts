/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { unmountComponentAtNode } from 'react-dom';

import { i18n } from '@kbn/i18n';

import { SavedSearchLoader } from '../../../../../src/legacy/core_plugins/kibana/public/discover/np_ready/types';

import { PLUGIN } from '../common/constants';
import { CLIENT_BASE_PATH } from './app/constants';
import { renderReact } from './app/app';
import { Core, Plugins } from './shim';

import { breadcrumbService, docTitleService } from './app/services/navigation';
import { documentationLinksService } from './app/services/documentation';
import { httpService } from './app/services/http';
import { textService } from './app/services/text';
import { uiMetricService } from './app/services/ui_metric';

const REACT_ROOT_ID = 'transformReactRoot';
const KBN_MANAGEMENT_SECTION = 'elasticsearch/transform';

const template = `<kbn-management-app section="${KBN_MANAGEMENT_SECTION}"><div id="${REACT_ROOT_ID}"/></kbn-management-app>`;

export class Plugin {
  public start(core: Core, plugins: Plugins): void {
    const {
      http,
      routing,
      legacyHttp,
      chrome,
      documentation,
      docTitle,
      uiSettings,
      savedObjects,
    } = core;
    const { management, savedSearches: coreSavedSearches, uiMetric } = plugins;

    // AppCore/AppPlugins to be passed on as React context
    const AppDependencies = {
      core: { chrome, http, i18n: core.i18n, uiSettings, savedObjects },
      plugins: {
        management: { sections: management.sections },
        savedSearches: coreSavedSearches,
      },
    };

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
    textService.init();
    breadcrumbService.init(chrome, management.constants.BREADCRUMB);
    uiMetricService.init(uiMetric.createUiStatsReporter);
    documentationLinksService.init(documentation.esDocBasePath);
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
        savedSearches: SavedSearchLoader
      ) => {
        // NOTE: We depend upon Angular's $http service because it's decorated with interceptors,
        // e.g. to check license status per request.
        legacyHttp.setClient($http);
        httpService.init(legacyHttp.getClient());
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
            renderReact(elem, AppDependencies);
          }
        });
      },
    });
  }
}
