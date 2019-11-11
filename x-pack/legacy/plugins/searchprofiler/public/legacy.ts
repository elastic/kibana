/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint-disable @kbn/eslint/no-restricted-paths */
import { npSetup } from 'ui/new_platform';
import { I18nContext } from 'ui/i18n';
import uiRoutes from 'ui/routes';
import 'ui/capabilities/route_setup';
// @ts-ignore
import { xpackInfo } from 'plugins/xpack_main/services/xpack_info';
// @ts-ignore
import { formatAngularHttpError } from 'ui/notify/lib';
import 'ui/autoload/all';
/* eslint-enable @kbn/eslint/no-restricted-paths */

import { ApplicationSetup } from 'src/core/public';
import { plugin } from './np_ready';

const pluginInstance = plugin({} as any);

const template = `<kbn-dev-tools-app class="prfDevTool" data-test-subj="searchProfiler">
  <div id="searchProfilerAppRoot" data-ng-init="startReactApp()" />
</kbn-dev-tools-app>`;

uiRoutes.when('/dev_tools/searchprofiler', {
  template,
  requireUICapability: 'dev_tools.show',
  controller: $scope => {
    $scope.startReactApp = () => {
      const el = document.querySelector<HTMLElement>('#searchProfilerAppRoot');
      if (!el) {
        const errorMessage = 'Could not mount Searchprofiler App!';
        npSetup.core.fatalErrors.add(errorMessage);
        throw new Error(errorMessage);
      }

      const coreApplicationSetupShim: ApplicationSetup = {
        register(app: any) {
          const unmount = app.mount();
          $scope.$on('$destroy', () => unmount());
        },
        registerAppStatusUpdater: {} as any,
        registerMountContext: {} as any,
      };

      pluginInstance.setup(
        {
          ...npSetup.core,
          application: coreApplicationSetupShim,
        },
        {
          __LEGACY: {
            I18nContext,
            licenseEnabled: xpackInfo.get('features.searchprofiler.enableAppLink'),
            notifications: npSetup.core.notifications.toasts,
            formatAngularHttpError,
            el,
          },
        }
      );
    };
  },
});
