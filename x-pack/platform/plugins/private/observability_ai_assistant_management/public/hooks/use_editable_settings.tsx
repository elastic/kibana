/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useKibana } from '@kbn/kibana-react-plugin/public';
import React, { useEffect, useMemo, useState } from 'react';
import type { IUiSettingsClient, UiSettingsMetadataState, UiSettingsType } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import { isEmpty } from 'lodash';
import { getFieldDefinition } from '@kbn/management-settings-field-definition';
import type {
  FieldDefinition,
  OnFieldChangeFn,
  UiSettingMetadata,
  UnsavedFieldChange,
} from '@kbn/management-settings-types';
import { mergeSettingDefinitions, normalizeSettings } from '@kbn/management-settings-utilities';

function getSettingsFields({
  settingsKeys,
  uiSettings,
  definitions,
}: {
  settingsKeys: string[];
  uiSettings?: IUiSettingsClient;
  definitions: UiSettingsMetadataState;
}) {
  if (!uiSettings) {
    return {};
  }
  const normalizedSettings = normalizeSettings(
    mergeSettingDefinitions(definitions, uiSettings.getAll())
  );
  const fields: Record<string, FieldDefinition> = {};

  settingsKeys.forEach((key) => {
    const setting: UiSettingMetadata = normalizedSettings[key];
    if (setting) {
      const field = getFieldDefinition({
        id: key,
        setting,
        params: { isCustom: uiSettings.isCustom(key), isOverridden: uiSettings.isOverridden(key) },
      });
      fields[key] = field;
    }
  });

  return fields;
}

export function useEditableSettings(settingsKeys: string[]) {
  const {
    services: { settings, notifications },
  } = useKibana();

  const [isSaving, setIsSaving] = useState(false);
  const [forceReloadSettings, setForceReloadSettings] = useState(0);
  const [unsavedChanges, setUnsavedChanges] = React.useState<Record<string, UnsavedFieldChange>>(
    {}
  );
  const [definitions, setDefinitions] = useState<UiSettingsMetadataState>({});

  useEffect(() => {
    if (!settings) {
      return;
    }

    let isCurrent = true;
    settings.metadata.getAll('namespace').then(
      (result) => {
        if (isCurrent) {
          setDefinitions(result);
        }
      },
      (error: Error) => {
        if (isCurrent) {
          notifications?.toasts.addDanger({
            title: i18n.translate(
              'xpack.observabilityAiAssistantManagement.editableSettings.loadError',
              { defaultMessage: 'Unable to load settings' }
            ),
            text: error.message,
          });
        }
      }
    );

    return () => {
      isCurrent = false;
    };
  }, [settings, notifications]);

  const fields = useMemo(
    () => {
      return getSettingsFields({ settingsKeys, uiSettings: settings?.client, definitions });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [settings, settingsKeys, forceReloadSettings, definitions]
  );

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

  async function saveAll() {
    if (settings && !isEmpty(unsavedChanges)) {
      let updateErrorOccurred = false;
      const subscription = settings.client.getUpdateErrors$().subscribe((error) => {
        updateErrorOccurred = true;
      });
      try {
        setIsSaving(true);
        const arr = Object.entries(unsavedChanges).map(([key, value]) =>
          settings.client.set(key, value.unsavedValue)
        );
        await Promise.all(arr);
        setForceReloadSettings((state) => ++state);
        cleanUnsavedChanges();
        if (updateErrorOccurred) {
          throw new Error('One or more settings updates failed');
        }
      } catch (e) {
        throw e;
      } finally {
        setIsSaving(false);
        if (subscription) {
          subscription.unsubscribe();
        }
      }
    }
  }

  async function saveSingleSetting(
    id: string,
    change: UnsavedFieldChange<UiSettingsType>['unsavedValue']
  ) {
    if (settings) {
      try {
        setIsSaving(true);
        await settings.client.set(id, change);
        setForceReloadSettings((state) => ++state);
      } finally {
        setIsSaving(false);
      }
    }
  }

  return {
    fields,
    unsavedChanges,
    handleFieldChange,
    saveAll,
    isSaving,
    cleanUnsavedChanges,
    saveSingleSetting,
  };
}
