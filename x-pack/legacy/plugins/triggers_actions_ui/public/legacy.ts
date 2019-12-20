/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CoreSetup, App, AppUnmount } from 'src/core/public';
import { capabilities } from 'ui/capabilities';
import { i18n } from '@kbn/i18n';

/* Legacy UI imports */
import { npSetup, npStart } from 'ui/new_platform';
import routes from 'ui/routes';
import { management, MANAGEMENT_BREADCRUMB } from 'ui/management';
// @ts-ignore
import { xpackInfo } from 'plugins/xpack_main/services/xpack_info';
/* Legacy UI imports */

import { plugin } from '../np_ready/public';
import { manageAngularLifecycle } from './manage_angular_lifecycle';
import { BASE_PATH } from '../np_ready/public/application/constants';

const REACT_ROOT_ID = 'triggersActionsRoot';

const template = `<kbn-management-app section="kibana/triggersActions">
<div id="triggersActionsRoot"></div>
</kbn-management-app>`;

let elem: HTMLElement;
let mountApp: () => AppUnmount | Promise<AppUnmount>;
let unmountApp: AppUnmount | Promise<AppUnmount>;
routes.when(`${BASE_PATH}:section?/:subsection?/:view?/:id?`, {
  template,
  controller: (() => {
    return ($route: any, $scope: any) => {
      const shimCore: CoreSetup = {
        ...npSetup.core,
        application: {
          ...npSetup.core.application,
          register(app: App): void {
            mountApp = () =>
              app.mount(npStart as any, {
                element: elem,
                appBasePath: BASE_PATH,
              });
          },
        },
      };

      // clean up previously rendered React app if one exists
      // this happens because of React Router redirects
      if (elem) {
        ((unmountApp as unknown) as AppUnmount)();
      }

      $scope.$$postDigest(() => {
        elem = document.getElementById(REACT_ROOT_ID)!;
        const instance = plugin({} as any);
        instance.setup(shimCore, {
          ...(npSetup.plugins as typeof npSetup.plugins),
          __LEGACY: {
            MANAGEMENT_BREADCRUMB,
            capabilities,
          },
        });

        instance.start(npStart.core, {
          ...(npSetup.plugins as typeof npSetup.plugins),
          __LEGACY: {
            MANAGEMENT_BREADCRUMB,
            capabilities,
          },
        });

        (mountApp() as Promise<AppUnmount>).then(fn => (unmountApp = fn));

        manageAngularLifecycle($scope, $route, elem);
      });
    };
  })(),
});

management.getSection('kibana').register('triggersActions', {
  display: i18n.translate('xpack.triggersActionsUI.managementSection.displayName', {
    defaultMessage: 'Alerts and actions',
  }),
  order: 7,
  url: `#${BASE_PATH}`,
});
