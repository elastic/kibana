/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint-disable @kbn/eslint/no-restricted-paths */
import { npSetup } from 'ui/new_platform';
import { I18nContext } from 'ui/i18n';
// @ts-ignore
import { xpackInfo } from 'plugins/xpack_main/services/xpack_info';
// @ts-ignore
import { formatAngularHttpError } from 'ui/notify/lib';
import 'ui/autoload/all';

import { plugin } from './np_ready';

const pluginInstance = plugin({} as any);

pluginInstance.setup(npSetup.core, {
  ...npSetup.plugins,
  __LEGACY: {
    I18nContext,
    licenseEnabled: xpackInfo.get('features.searchprofiler.enableAppLink'),
    notifications: npSetup.core.notifications.toasts,
    formatAngularHttpError,
  },
});
