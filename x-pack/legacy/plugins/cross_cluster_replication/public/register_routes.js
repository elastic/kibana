/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { unmountComponentAtNode } from 'react-dom';
import chrome from 'ui/chrome';
import { management, MANAGEMENT_BREADCRUMB } from 'ui/management';
import { npSetup, npStart } from 'ui/new_platform';
import routes from 'ui/routes';
import { xpackInfo } from 'plugins/xpack_main/services/xpack_info';
import { i18n } from '@kbn/i18n';

import template from './main.html';
import { BASE_PATH } from '../common/constants';

import { plugin } from './np_ready';

/**
 * TODO: When this file is deleted, use the management section for rendering
 */
import { renderReact } from './np_ready/app';

const isAvailable = xpackInfo.get('features.crossClusterReplication.isAvailable');
const isActive = xpackInfo.get('features.crossClusterReplication.isActive');
const isLicenseOK = isAvailable && isActive;
const isCcrUiEnabled = chrome.getInjected('ccrUiEnabled');

if (isLicenseOK && isCcrUiEnabled) {
  const esSection = management.getSection('elasticsearch');

  esSection.register('ccr', {
    visible: true,
    display: i18n.translate('xpack.crossClusterReplication.appTitle', {
      defaultMessage: 'Cross-Cluster Replication',
    }),
    order: 4,
    url: `#${BASE_PATH}`,
  });

  let elem;

  const CCR_REACT_ROOT = 'ccrReactRoot';

  plugin({}).setup(npSetup.core, {
    ...npSetup.plugins,
    __LEGACY: {
      chrome,
      docLinks: npStart.core.docLinks,
      MANAGEMENT_BREADCRUMB,
    },
  });

  const unmountReactApp = () => elem && unmountComponentAtNode(elem);

  routes.when(`${BASE_PATH}/:section?/:subsection?/:view?/:id?`, {
    template,
    controllerAs: 'ccr',
    controller: class CrossClusterReplicationController {
      constructor($scope, $route) {
        // React-router's <Redirect> does not play well with the angular router. It will cause this controller
        // to re-execute without the $destroy handler being called. This means that the app will be mounted twice
        // creating a memory leak when leaving (only 1 app will be unmounted).
        // To avoid this, we unmount the React app each time we enter the controller.
        unmountReactApp();

        $scope.$$postDigest(() => {
          elem = document.getElementById(CCR_REACT_ROOT);
          renderReact(elem, npStart.core.i18n.Context);

          // Angular Lifecycle
          const appRoute = $route.current;
          const stopListeningForLocationChange = $scope.$on('$locationChangeSuccess', () => {
            const currentRoute = $route.current;
            const isNavigationInApp = currentRoute.$$route.template === appRoute.$$route.template;

            // When we navigate within CCR, prevent Angular from re-matching the route and rebuild the app
            if (isNavigationInApp) {
              $route.current = appRoute;
            } else {
              // Any clean up when User leaves the CCR
            }

            $scope.$on('$destroy', () => {
              stopListeningForLocationChange && stopListeningForLocationChange();
              unmountReactApp();
            });
          });
        });
      }
    },
  });
}
