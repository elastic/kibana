/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import routes from 'ui/routes';

import template from './index.html';
import { PLUGIN } from '../common/constants';
import { Core, Plugins } from './legacy';
import { mountReactApp, unmountReactApp, BASE_PATH, REACT_ROOT_ID } from './app';

import { documentationService } from './app/services/documentation';
import { uiMetricService } from './app/services/ui_metric';
import { httpService } from './app/services/http';
import { breadcrumbService } from './app/services/navigation';

export class PainlessIdePlugin {
  public start(core: Core, plugins: Plugins): void {
    const {
      __LEGACY: { management, uiMetric },
    } = plugins;

    const {
      docLinks,
      http,
      chrome,
      __LEGACY: { i18n },
    } = core;

    // Register Management section
    const esSection = management.getSection('elasticsearch');
    esSection.register(PLUGIN.ID, {
      visible: true,
      display: i18n.translate('xpack.painlessIde.appName', {
        defaultMessage: 'Painless IDE',
      }),
      order: 11,
      url: `#${BASE_PATH}`,
    });

    // Initialize services
    documentationService.init(docLinks);
    uiMetricService.init(uiMetric.createUiStatsReporter);
    httpService.init(http);
    breadcrumbService.init(chrome, i18n, management.constants.BREADCRUMB);

    // Register Angular route
    routes.when(`${BASE_PATH}/:section?/:subsection?`, {
      template,
      controller: ($scope: any, $route: any) => {
        // Angular lifecycle
        const appRoute = $route.current;
        const onLocationChangeSuccess = () => {
          const currentRoute = $route.current;
          const isInAppNavigation = currentRoute.$$route.template === appRoute.$$route.template;

          // When we navigate within the app, prevent Angular from re-matching the route and rebuild the app
          if (isInAppNavigation) {
            $route.current = appRoute;
          } else {
            // Any clean up when the user leaves the app
          }

          // Unmount React app when leaving the Angular route controller
          $scope.$on('$destroy', () => {
            unmountReactApp(document.getElementById(REACT_ROOT_ID));
          });
          $scope.$$postDigest(() => {
            const elem = document.getElementById(REACT_ROOT_ID);
            unmountReactApp(elem);
            mountReactApp(elem, { core });
          });
        };

        // This app currently does not have a React router, so no location change success occurs
        // For now, we will call it directly when the Angular controller is initialized.
        onLocationChangeSuccess();
      },
    });
  }
}
