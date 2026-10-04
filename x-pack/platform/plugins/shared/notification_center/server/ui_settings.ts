/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { UiSettingsParams } from '@kbn/core/server';
import { i18n } from '@kbn/i18n';
import { NOTIFICATION_REGISTRY } from '../common/notification_registry';
import {
  NOTIFICATION_CENTER_ENABLED_SETTING,
  NOTIFICATION_CENTER_SETTING_DEFAULT,
  NOTIFICATION_CENTER_SETTINGS_CATEGORY,
  namespaceSettingKey,
  typeSettingKey,
} from '../common/ui_settings';

/**
 * Registry rows are generated, so their labels interpolate the registry's own `display_name`
 * into a static translatable string rather than composing message ids at runtime.
 */
const sharedParams = {
  category: [NOTIFICATION_CENTER_SETTINGS_CATEGORY],
  type: 'boolean',
  schema: schema.boolean(),
  value: NOTIFICATION_CENTER_SETTING_DEFAULT,
  requiresPageReload: false,
  solutionViews: ['classic', 'es'],
  technicalPreview: true,
} as const satisfies Partial<UiSettingsParams<boolean>>;

/** Space-scoped switches deciding which notifications the Notification Center UI displays. */
export const getNotificationCenterUiSettings = (): Record<string, UiSettingsParams<boolean>> => {
  const settings: Record<string, UiSettingsParams<boolean>> = {
    [NOTIFICATION_CENTER_ENABLED_SETTING]: {
      ...sharedParams,
      order: 0,
      name: i18n.translate('xpack.notificationCenter.uiSettings.enabledName', {
        defaultMessage: 'Notification center',
      }),
      description: i18n.translate('xpack.notificationCenter.uiSettings.enabledDescription', {
        defaultMessage:
          'Show the Notification center in this space. Turn individual notification sources off below.',
      }),
    },
  };

  Object.entries(NOTIFICATION_REGISTRY).forEach(([namespace, definition], namespaceIndex) => {
    // Leave room between namespaces so their types sort directly beneath them.
    const namespaceOrder = (namespaceIndex + 1) * 100;

    settings[namespaceSettingKey(namespace)] = {
      ...sharedParams,
      order: namespaceOrder,
      name: i18n.translate('xpack.notificationCenter.uiSettings.namespaceName', {
        defaultMessage: '{displayName} notifications',
        values: { displayName: definition.display_name },
      }),
      description: definition.description,
    };

    Object.entries(definition.types).forEach(([type, typeDefinition], typeIndex) => {
      settings[typeSettingKey(namespace, type)] = {
        ...sharedParams,
        order: namespaceOrder + typeIndex + 1,
        name: i18n.translate('xpack.notificationCenter.uiSettings.typeName', {
          defaultMessage: '{namespaceName}: {typeName}',
          values: {
            namespaceName: definition.display_name,
            typeName: typeDefinition.display_name,
          },
        }),
        description: typeDefinition.description,
      };
    });
  });

  return settings;
};
