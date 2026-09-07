/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useState } from 'react';
import type { IStorageWrapper } from '@kbn/kibana-utils-plugin/public';
import { noop } from 'lodash';
import type { NotificationsStart } from '@kbn/core-notifications-browser';
import { i18n } from '@kbn/i18n';
import {
  type AlertsTableConfiguration,
  alertsTableConfigurationSchema,
} from '../schemas/alerts_table_configuration_schema';

export interface UseAlertsTableConfigurationParams {
  id: string;
  configurationStorage?: IStorageWrapper | null;
  notifications: NotificationsStart;
}

/**
 * Manages the alerts table configuration persistence.
 * Loads, validates, and saves table settings to storage, returning a `React.useState`-compatible tuple.
 * Handles invalid configurations by resetting and notifying the user.
 */
export const useAlertsTableConfiguration = ({
  id,
  configurationStorage,
  notifications,
}: UseAlertsTableConfigurationParams) => {
  const { toasts } = notifications;

  const loadConfiguration = useCallback(() => {
    if (!configurationStorage) {
      return null;
    }
    const savedConfig = configurationStorage.get(id);

    if (!savedConfig) {
      return null;
    }

    try {
      return alertsTableConfigurationSchema.parse(JSON.parse(savedConfig));
    } catch (e) {
      configurationStorage.remove(id);
      toasts.addWarning({
        title: i18n.translate('xpack.responseOpsAlertsTable.loadConfigurationError', {
          defaultMessage: 'Unable to load alerts table configuration',
        }),
        text: i18n.translate('xpack.responseOpsAlertsTable.loadConfigurationError', {
          defaultMessage: 'The saved configuration was invalid and has been reset to default.',
        }),
      });
    }

    return null;
  }, [configurationStorage, id, toasts]);

  const [configuration, setConfiguration] = useState(loadConfiguration);

  const safeSetConfiguration = useCallback(
    (configUpdates: Partial<AlertsTableConfiguration> | null) => {
      if (!configurationStorage) {
        return;
      }
      // It's important to use the functional form of setState to reference the old state instead
      // of using the `configuration` variable from the outer scope, as that would make this callback
      // referentially unstable and cause an unnecessary configuration save
      setConfiguration((prevConfig) => {
        const newConfig = configUpdates != null ? { ...prevConfig, ...configUpdates } : null;

        try {
          // Parsing the configuration ensures that it is valid and contains only the minimal
          // user overrides
          const parsedConfig = !newConfig ? null : alertsTableConfigurationSchema.parse(newConfig);
          if (parsedConfig === null) {
            // If the new config is null, remove the saved configuration
            configurationStorage.remove(id);
            return parsedConfig;
          }

          const serializedConfig = JSON.stringify(parsedConfig);
          if (serializedConfig === JSON.stringify(prevConfig)) {
            // Avoid causing rerenders and saving to storage if the previous and new configurations
            // are structurally equivalent
            return prevConfig;
          }

          configurationStorage.set(id, serializedConfig);
          return parsedConfig;
        } catch {
          toasts.addWarning({
            title: i18n.translate('xpack.responseOpsAlertsTable.saveConfigurationError', {
              defaultMessage: 'Unable to save alerts table configuration',
            }),
            text: i18n.translate('xpack.responseOpsAlertsTable.saveConfigurationError', {
              defaultMessage: 'The new configuration is invalid and cannot be saved.',
            }),
          });
        }

        return prevConfig;
      });
    },
    [configurationStorage, id, toasts]
  );

  if (!configurationStorage) {
    return [null, noop] as const;
  }

  return [configuration, safeSetConfiguration] as const;
};
