/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { i18n } from '@kbn/i18n';
import type { UiSettingsParams } from '@kbn/core/types';

export const DISPATCHER_ENABLED_SETTING_ID = 'observability:alerting:dispatcherEnabled';

export const dispatcherUiSettings: Record<string, UiSettingsParams<boolean>> = {
  [DISPATCHER_ENABLED_SETTING_ID]: {
    category: ['observability'],
    name: i18n.translate('xpack.alertingVTwo.dispatcherEnabledSettingName', {
      defaultMessage: 'Alerting v2 dispatcher',
    }),
    scope: 'global',
    value: true,
    description: i18n.translate('xpack.alertingVTwo.dispatcherEnabledSettingDescription', {
      defaultMessage:
        'Controls whether the alerting v2 dispatcher task processes alert episodes. When disabled, the task still runs on schedule but performs no work.',
    }),
    schema: schema.boolean(),
    requiresPageReload: false,
  },
};
