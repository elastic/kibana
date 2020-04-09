/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { App } from 'src/core/public';

/* Legacy Imports */
import { npSetup, npStart } from 'ui/new_platform';
import chrome from 'ui/chrome';
import routes from 'ui/routes';
import { management } from 'ui/management';
import { createUiStatsReporter } from '../../../../../src/legacy/core_plugins/ui_metric/public';

import { PLUGIN, BASE_PATH } from '../common/constants';
import { createPlugin } from './np_ready';
import { addAllExtensions } from './np_ready/extend_index_management';

if (chrome.getInjected('ilmUiEnabled')) {
  // We have to initialize this outside of the NP lifecycle, otherwise these extensions won't
  // be available in Index Management unless the user visits ILM first.
  if ((npSetup.plugins as any).indexManagement) {
    addAllExtensions((npSetup.plugins as any).indexManagement.extensionsService);
  }

  // This method handles the cleanup needed when route is scope is destroyed.  It also prevents Angular
  // from destroying scope when route changes and both old route and new route are this same route.
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

  // Once this app no longer depends upon Angular's routing (e.g. for the "redirect" service), we can
  // use the Management plugin's API to register this app within the Elasticsearch section.
  const esSection = management.getSection('elasticsearch');
  esSection.register('index_lifecycle_policies', {
    visible: true,
    display: PLUGIN.TITLE,
    order: 2,
    url: `#${BASE_PATH}policies`,
  });

  const REACT_ROOT_ID = 'indexLifecycleManagementReactRoot';

  const template = `<kbn-management-app section="elasticsearch/index_lifecycle_policies">
    <div id="${REACT_ROOT_ID}" class="policyTable__horizontalScrollContainer"/>
  </kbn-management-app>
  `;

  routes.when(`${BASE_PATH}:view?/:action?/:id?`, {
    template,
    controllerAs: 'indexLifecycleManagement',
    controller: class IndexLifecycleManagementController {
      constructor($scope: any, $route: any, kbnUrl: any, $rootScope: any) {
        $scope.$$postDigest(() => {
          const element = document.getElementById(REACT_ROOT_ID)!;
          const { core } = npSetup;

          const coreDependencies = {
            ...core,
            application: {
              ...core.application,
              async register(app: App<any>) {
                const unmountApp = await app.mount({ ...npStart } as any, {
                  element,
                  appBasePath: '',
                  onAppLeave: () => undefined,
                  // TODO: adapt to use Core's ScopedHistory
                  history: {} as any,
                });
                manageAngularLifecycle($scope, $route, unmountApp as any);
              },
            },
          };

          // The Plugin interface won't allow us to pass __LEGACY as a third argument, so we'll just
          // sneak it inside of the plugins argument for now.
          const pluginDependencies = {
            __LEGACY: {
              redirect: (path: string) => {
                $scope.$evalAsync(() => {
                  kbnUrl.redirect(path);
                });
              },
              createUiStatsReporter,
            },
          };

          const plugin = createPlugin({} as any);
          plugin.setup(coreDependencies, pluginDependencies);
        });
      }
    } as any,
  } as any);
}
