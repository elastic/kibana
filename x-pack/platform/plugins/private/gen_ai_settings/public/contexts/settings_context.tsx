/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { createContext, useContext } from 'react';
import type {
  FieldDefinition,
  OnFieldChangeFn,
  UiSettingMetadata,
  UnsavedFieldChange,
} from '@kbn/management-settings-types';
import { isEmpty } from 'lodash';
import type { IUiSettingsClient, UiSettingsType } from '@kbn/core/public';
import { normalizeSettings } from '@kbn/management-settings-utilities';
import { getFieldDefinition } from '@kbn/management-settings-field-definition';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR,
  GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR_DEFAULT_ONLY,
  AI_ASSISTANT_PREFERRED_AI_ASSISTANT_TYPE,
} from '@kbn/management-settings-ids';
import { useKibana } from '../hooks/use_kibana';

type SettingsContext = ReturnType<typeof Settings>;

const SettingsContext = createContext<null | SettingsContext>(null);

const useSettingsContext = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettingsContext must be inside of a SettingsContextProvider.Provider.');
  }
  return context;
};

const SETTING_KEYS = [
  GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR,
  GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR_DEFAULT_ONLY,
  AI_ASSISTANT_PREFERRED_AI_ASSISTANT_TYPE,
];

export const SettingsContextProvider = ({ children }: { children: React.ReactNode }) => {
  const value = Settings({ settingsKeys: SETTING_KEYS });
  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
};

function combineErrors(errors: Error[]): Error {
  const message = errors.map((err) => err.message || String(err)).join('; ');
  return new Error(message);
}

function getSettingsFields({
  settingsKeys,
  uiSettings,
}: {
  settingsKeys: string[];
  uiSettings?: IUiSettingsClient;
}) {
  if (!uiSettings) {
    return {};
  }

  const uiSettingsDefinition = uiSettings.getAll();
  const normalizedSettings = normalizeSettings(uiSettingsDefinition);

  return settingsKeys.reduce<Record<string, FieldDefinition>>((acc, key) => {
    const setting: UiSettingMetadata = normalizedSettings[key];
    if (setting) {
      const field = getFieldDefinition({
        id: key,
        setting,
        params: { isCustom: uiSettings.isCustom(key), isOverridden: uiSettings.isOverridden(key) },
      });
      acc[key] = field;
    }
    return acc;
  }, {});
}

const Settings = ({ settingsKeys }: { settingsKeys: string[] }) => {
  const {
    services: { settings },
  } = useKibana();

  const [unsavedChanges, setUnsavedChanges] = React.useState<Record<string, UnsavedFieldChange>>(
    {}
  );

  const queryClient = useQueryClient();

  const fieldsQuery = useQuery({
    queryKey: ['settingsFields', settingsKeys],
    queryFn: async () => {
      return getSettingsFields({ settingsKeys, uiSettings: settings?.client });
    },
    refetchOnWindowFocus: true,
  });

  const saveSingleSettingMutation = useMutation({
    mutationFn: async ({
      id,
      change,
    }: {
      id: string;
      change: UnsavedFieldChange<UiSettingsType>['unsavedValue'];
    }) => {
      await settings.client.set(id, change);
      queryClient.invalidateQueries({ queryKey: ['settingsFields', settingsKeys] });
    },
  });

  const saveAllMutation = useMutation({
    mutationFn: async () => {
      if (settings && !isEmpty(unsavedChanges)) {
        const updateErrors: Error[] = [];
        const subscription = settings.client.getUpdateErrors$().subscribe((error) => {
          updateErrors.push(error);
        });
        try {
          const fieldsMap = fieldsQuery.data ?? {};
          const requiresReload = Object.keys(unsavedChanges).some(
            (key) => fieldsMap[key]?.requiresPageReload === true
          );
          await Promise.all(
            Object.entries(unsavedChanges).map(([key, value]) => {
              return settings.client.set(key, value.unsavedValue);
            })
          );
          queryClient.invalidateQueries({ queryKey: ['settingsFields', settingsKeys] });
          cleanUnsavedChanges();
          if (updateErrors.length > 0) {
            throw combineErrors(updateErrors);
          }
          return requiresReload;
        } finally {
          if (subscription) {
            subscription.unsubscribe();
          }
        }
      }
      return false;
    },
  });

  const handleFieldChange: OnFieldChangeFn = (id, change) => {
    if (!change) {
      const { [id]: unsavedChange, ...rest } = unsavedChanges;
      setUnsavedChanges(rest);
      return;
    }
    setUnsavedChanges((changes) => ({ ...changes, [id]: change }));
  };

  function cleanUnsavedChanges() {
    setUnsavedChanges({});
  }

  return {
    fields: fieldsQuery.data ?? {},
    unsavedChanges,
    handleFieldChange,
    saveAll: saveAllMutation.mutateAsync,
    isSaving: saveAllMutation.isLoading || saveSingleSettingMutation.isLoading,
    cleanUnsavedChanges,
    saveSingleSetting: saveSingleSettingMutation.mutateAsync,
  };
};

export { SettingsContext, useSettingsContext };
