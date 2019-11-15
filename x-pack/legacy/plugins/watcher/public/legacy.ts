/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { CoreSetup, App, AppUnmount } from 'src/core/public';
import { i18n } from '@kbn/i18n';

/* Legacy UI imports */
import { npSetup, npStart } from 'ui/new_platform';
import routes from 'ui/routes';
import { I18nContext } from 'ui/i18n';
import { management, MANAGEMENT_BREADCRUMB } from 'ui/management';
// @ts-ignore
import { TimeBuckets } from 'ui/time_buckets';
// @ts-ignore
import { xpackInfo } from 'plugins/xpack_main/services/xpack_info';

import { plugin } from './np_ready';
import { PLUGIN } from '../common/constants';
import { LICENSE_STATUS_INVALID, LICENSE_STATUS_UNAVAILABLE } from '../../../common/constants';
import { manageAngularLifecycle } from './manage_angular_lifecycle';

const template = `<kbn-management-app section="elasticsearch/watcher">
  <div id="watchReactRoot"></div>
</kbn-management-app>`;

let elem: HTMLElement;
let mountApp: () => AppUnmount | Promise<AppUnmount>;
let unmountApp: AppUnmount | Promise<AppUnmount>;
routes.when('/management/elasticsearch/watcher/:param1?/:param2?/:param3?/:param4?', {
  template,
  controller: class WatcherController {
    constructor($injector: any, $scope: any, $http: any, Private: any) {
      const $route = $injector.get('$route');
      const licenseStatus = xpackInfo.get(`features.${PLUGIN.ID}`);
      const shimCore: CoreSetup = {
        ...npSetup.core,
        application: {
          ...npSetup.core.application,
          register(app: App): void {
            mountApp = () =>
              app.mount({} as any, {
                element: elem,
                appBasePath: '/management/elasticsearch/watcher/',
              });
          },
        },
      };

      // clean up previously rendered React app if one exists
      // this happens because of React Router redirects
      if (elem) {
        ((unmountApp as unknown) as AppUnmount)();
      }
      // NOTE: We depend upon Angular's $http service because it's decorated with interceptors,
      // e.g. to check license status per request.
      // setHttpClient($http);

      $scope.$$postDigest(() => {
        elem = document.getElementById('watchReactRoot')!;
        const instance = plugin();
        instance.setup(shimCore, {
          ...(npSetup.plugins as typeof npSetup.plugins & { eui_utils: any }),
          __LEGACY: {
            MANAGEMENT_BREADCRUMB,
            savedObjects: npStart.core.savedObjects.client,
            I18nContext,
            TimeBuckets,
            licenseStatus,
          },
        });

        instance.start(npStart.core, {});

        unmountApp = mountApp();

        manageAngularLifecycle($scope, $route, elem);
      });
    }
  } as any,
  // @ts-ignore
  controllerAs: 'watchRoute',
});

routes.defaults(/\/management/, {
  resolve: {
    watcherManagementSection: () => {
      const watchesSection = management.getSection('elasticsearch/watcher');
      const licenseStatus = xpackInfo.get(`features.${PLUGIN.ID}`);
      const { status } = licenseStatus;

      if (status === LICENSE_STATUS_INVALID || status === LICENSE_STATUS_UNAVAILABLE) {
        return watchesSection.hide();
      }

      watchesSection.show();
    },
  },
});

management.getSection('elasticsearch').register('watcher', {
  display: i18n.translate('xpack.watcher.sections.watchList.managementSection.watcherDisplayName', {
    defaultMessage: 'Watcher',
  }),
  order: 6,
  url: '#/management/elasticsearch/watcher/',
} as any);

management.getSection('elasticsearch/watcher').register('watches', {
  display: i18n.translate('xpack.watcher.sections.watchList.managementSection.watchesDisplayName', {
    defaultMessage: 'Watches',
  }),
  order: 1,
} as any);

management.getSection('elasticsearch/watcher').register('watch', {
  visible: false,
} as any);

management.getSection('elasticsearch/watcher/watch').register('status', {
  display: i18n.translate('xpack.watcher.sections.watchList.managementSection.statusDisplayName', {
    defaultMessage: 'Status',
  }),
  order: 1,
  visible: false,
} as any);

management.getSection('elasticsearch/watcher/watch').register('edit', {
  display: i18n.translate('xpack.watcher.sections.watchList.managementSection.editDisplayName', {
    defaultMessage: 'Edit',
  }),
  order: 2,
  visible: false,
} as any);

management.getSection('elasticsearch/watcher/watch').register('new', {
  display: i18n.translate(
    'xpack.watcher.sections.watchList.managementSection.newWatchDisplayName',
    {
      defaultMessage: 'New Watch',
    }
  ),
  order: 1,
  visible: false,
} as any);

management.getSection('elasticsearch/watcher/watch').register('history-item', {
  order: 1,
  visible: false,
} as any);
