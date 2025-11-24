/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useContext } from 'react';
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
import { useMutation, useQuery, useQueryClient } from '@kbn/react-query';
import {
  GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR,
  GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR_DEFAULT_ONLY,
} from '@kbn/management-settings-ids';
import { SettingsStart } from '@kbn/core-ui-settings-browser';

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
];

export const SettingsContextProvider = ({
  children,
  settings,
}: {
  children: React.ReactNode;
  settings: SettingsStart;
}) => {
  const value = Settings({ settingsKeys: SETTING_KEYS, settings });
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

const Settings = ({
  settingsKeys,
  settings,
}: {
  settingsKeys: string[];
  settings: SettingsStart;
}) => {
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
        } finally {
          if (subscription) {
            subscription.unsubscribe();
          }
        }
      }
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
