/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { App } from 'src/core/public';

/* Legacy Imports */
import { npSetup, npStart } from 'ui/new_platform';
import { MANAGEMENT_BREADCRUMB } from 'ui/management';
import chrome from 'ui/chrome';
import routes from 'ui/routes';
// @ts-ignore
import { xpackInfo } from 'plugins/xpack_main/services/xpack_info';

import { plugin } from './np_ready';
import { BASE_PATH } from '../common/constants';

const licenseManagementUiEnabled = chrome.getInjected('licenseManagementUiEnabled');

if (licenseManagementUiEnabled) {
  /*
    This method handles the cleanup needed when route is scope is destroyed.  It also prevents Angular
    from destroying scope when route changes and both old route and new route are this same route.
  */
  const manageAngularLifecycle = ($scope: any, $route: any, unmount: () => void) => {
    const lastRoute = $route.current;
    const deregister = $scope.$on('$locationChangeSuccess', () => {
      const currentRoute = $route.current;
      // if templates are the same we are on the same route
      if (lastRoute.$$route.template === currentRoute.$$route.template) {
        // this prevents angular from destroying scope
        $route.current = lastRoute;
      }
    });
    $scope.$on('$destroy', () => {
      if (deregister) {
        deregister();
      }
      unmount();
    });
  };

  const template = `<kbn-management-app section="elasticsearch/license_management">
    <div id="licenseReactRoot"></div>
  </kbn-management-app>`;

  routes.when(`${BASE_PATH}:view?`, {
    template,
    controllerAs: 'licenseManagement',
    controller: class LicenseManagementController {
      constructor($injector: any, $rootScope: any, $scope: any, $route: any) {
        $scope.$$postDigest(() => {
          const element = document.getElementById('licenseReactRoot')!;

          const refreshXpack = async () => {
            await xpackInfo.refresh($injector);
          };

          plugin({} as any).setup(
            {
              ...npSetup.core,
              application: {
                ...npSetup.core.application,
                async register(app: App) {
                  const unmountApp = await app.mount({ ...npStart } as any, {
                    element,
                    appBasePath: '',
                    onAppLeave: () => undefined,
                  });
                  manageAngularLifecycle($scope, $route, unmountApp as any);
                },
              },
            },
            {
              telemetry: (npSetup.plugins as any).telemetry,
              __LEGACY: { xpackInfo, refreshXpack, MANAGEMENT_BREADCRUMB },
            }
          );
        });
      }
    } as any,
  } as any);
}
