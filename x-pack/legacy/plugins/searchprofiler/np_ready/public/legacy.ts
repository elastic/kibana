/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* Legacy imports */
import { npSetup, npStart } from 'ui/new_platform';
import { I18nContext } from 'ui/i18n';
import uiRoutes from 'ui/routes';
import 'ui/capabilities/route_setup';
import { toastNotifications } from 'ui/notify';
// @ts-ignore
import { xpackInfo } from 'plugins/xpack_main/services/xpack_info';
// @ts-ignore
import { formatAngularHttpError } from 'ui/notify/lib';
/* Legacy imports */

import { NotificationsSetup } from '../../../../../../src/core/public';
import { plugin } from '.';

const pluginInstance = plugin({} as any);

uiRoutes.when('/dev_tools/searchprofiler', {
  template: `<kbn-dev-tools-app class="prfDevTool" data-test-subj="searchProfiler">
  <div id="seachProfilerAppRoot" />
</kbn-dev-tools-app>`,
  requireUICapability: 'dev_tools.show',
  controller: $scope => {
    const el = document.querySelector<HTMLElement>('seachProfilerAppRoot')!;

    if (!el) {
      const error = `Could not mount app!`;
      npSetup.core.fatalErrors.add(error);
      throw new Error(error);
    }

    pluginInstance.setup(npSetup.core, {
      __LEGACY: {
        I18nContext,
        licenseEnabled: xpackInfo.get('features.searchprofiler.enableAppLink'),
        notifications: (toastNotifications as unknown) as NotificationsSetup,
        formatAngularHttpError,
        el,
      },
    });

    pluginInstance.start(
      {
        ...npStart.core,
      },
      {}
    );
  },
});
