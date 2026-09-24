/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { CoreSetup, UiSettingsParams } from '@kbn/core/server';
import { i18n } from '@kbn/i18n';
import { NOTIFICATION_REGISTRY } from '../common/notification_registry';
import { joinNotificationTypeId } from '../common/notification_registry_utils';
import {
  NOTIFICATION_CENTER_ENABLED_DEFAULT,
  NOTIFICATION_CENTER_ENABLED_SETTING,
  NOTIFICATION_TYPE_SETTING_DEFAULT,
  NOTIFICATION_TYPE_SETTINGS,
} from '../common/ui_settings';

// Deliberately not core's `notifications` category, which holds toast and banner lifetimes:
// same word, unrelated concept. Its display name is registered in @kbn/management-settings-utilities.
const CATEGORY = ['notificationCenter'];

/**
 * One toggle per registered type, ordered after the master toggle. Names and descriptions come
 * from the registry, so a new type carries its own copy with no edit here.
 */
const buildTypeSettings = (): Record<string, UiSettingsParams> => {
  const settings: Record<string, UiSettingsParams> = {};
  let order = 1;

  for (const [namespace, definition] of Object.entries(NOTIFICATION_REGISTRY)) {
    for (const [typeId, type] of Object.entries(definition.types)) {
      const settingKey = NOTIFICATION_TYPE_SETTINGS[joinNotificationTypeId(namespace, typeId)];

      settings[settingKey] = {
        name: i18n.translate('xpack.notificationCenter.uiSettings.type.name', {
          defaultMessage: '{namespaceName}: {typeName}',
          values: { namespaceName: definition.display_name, typeName: type.display_name },
        }),
        description: i18n.translate('xpack.notificationCenter.uiSettings.type.description', {
          defaultMessage:
            '{typeDescription} Shown only while global notifications are enabled for this space.',
          values: { typeDescription: type.description },
        }),
        value: NOTIFICATION_TYPE_SETTING_DEFAULT,
        schema: schema.boolean(),
        type: 'boolean',
        category: CATEGORY,
        requiresPageReload: false,
        technicalPreview: true,
        order: order++,
      };
    }
  }

  return settings;
};

/**
 * Registers the space-scoped opt-in toggles that gate the Notification Center UI.
 */
export const registerNotificationCenterUiSettings = (uiSettings: CoreSetup['uiSettings']): void => {
  uiSettings.register({
    [NOTIFICATION_CENTER_ENABLED_SETTING]: {
      name: i18n.translate('xpack.notificationCenter.uiSettings.enabled.name', {
        defaultMessage: 'Notification Center',
      }),
      description: i18n.translate('xpack.notificationCenter.uiSettings.enabled.description', {
        defaultMessage:
          'Show the Notification Center in this space, including the notification bell in the global header.',
      }),
      value: NOTIFICATION_CENTER_ENABLED_DEFAULT,
      schema: schema.boolean(),
      type: 'boolean',
      category: CATEGORY,
      requiresPageReload: false,
      technicalPreview: true,
      order: 0,
    },
    ...buildTypeSettings(),
  });
};
