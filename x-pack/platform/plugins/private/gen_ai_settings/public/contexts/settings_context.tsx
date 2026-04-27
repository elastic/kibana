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
import { useMutation, useQuery, useQueryClient } from '@kbn/react-query';
import {
  GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR,
  GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR_DEFAULT_ONLY,
  GEN_AI_SETTINGS_TOKEN_USAGE_TRACKING,
  AGENT_BUILDER_PRE_PROMPT_WORKFLOW_IDS,
  AI_ASSISTANT_PREFERRED_AI_ASSISTANT_TYPE,
  AI_CHAT_EXPERIENCE_TYPE,
} from '@kbn/management-settings-ids';
import { i18n } from '@kbn/i18n';
import { useKibana } from '../hooks/use_kibana';

// Validation types
export interface ValidationError {
  message: string;
  field?: string;
}

type SettingsContext = ReturnType<typeof useSettings>;

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
  GEN_AI_SETTINGS_TOKEN_USAGE_TRACKING,
  AGENT_BUILDER_PRE_PROMPT_WORKFLOW_IDS,
  AI_ASSISTANT_PREFERRED_AI_ASSISTANT_TYPE,
  AI_CHAT_EXPERIENCE_TYPE,
];

export const SettingsContextProvider = ({ children }: { children: React.ReactNode }) => {
  const value = useSettings({ settingsKeys: SETTING_KEYS });
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

const useSettings = ({ settingsKeys }: { settingsKeys: string[] }) => {
  const {
    services: { settings, notifications },
  } = useKibana();

  const [unsavedChanges, setUnsavedChanges] = React.useState<Record<string, UnsavedFieldChange>>(
    {}
  );

  // Custom validation errors from external validators
  const [customValidationErrors, setCustomValidationErrors] = React.useState<ValidationError[]>([]);

  const queryClient = useQueryClient();

  const fieldsQuery = useQuery({
    queryKey: ['settingsFields', settingsKeys],
    queryFn: async () => {
      return getSettingsFields({ settingsKeys, uiSettings: settings?.client });
    },
    refetchOnWindowFocus: true,
  });

  // Subscribe to UI settings changes to update in real-time when values change
  React.useEffect(() => {
    if (!settings?.client) {
      return;
    }

    const subscription = settings.client.getUpdate$().subscribe(({ key }) => {
      // If the changed setting is one we're tracking, invalidate the query to refetch
      if (settingsKeys.includes(key)) {
        queryClient.invalidateQueries({ queryKey: ['settingsFields', settingsKeys] });
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [settings?.client, settingsKeys, queryClient]);

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
        // Validate fields before saving
        if (customValidationErrors.length > 0) {
          // Throw error to prevent save
          throw new Error(customValidationErrors.map((error) => error.message).join('\n'));
        }

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
    onSuccess() {
      notifications.toasts.addSuccess({
        title: i18n.translate('xpack.gen_ai_settings.save.success', {
          defaultMessage: 'Settings saved',
        }),
      });
    },
    onError(error: Error) {
      notifications.toasts.addDanger({
        title: i18n.translate('xpack.gen_ai_settings.save.error', {
          defaultMessage: 'Failed to save settings',
        }),
        text:
          error.message ??
          i18n.translate('xpack.gen_ai_settings.save.error.text', {
            defaultMessage: 'Unknown error',
          }),
      });
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

  const cleanUnsavedChanges = React.useCallback(() => setUnsavedChanges({}), []);

  const setValidationErrors = React.useCallback(
    (errors: ValidationError[] | ((current: ValidationError[]) => ValidationError[])) => {
      if (typeof errors === 'function') {
        setCustomValidationErrors((current) => errors(current));
      } else {
        setCustomValidationErrors(errors);
      }
    },
    []
  );

  return {
    fields: fieldsQuery.data ?? {},
    unsavedChanges,
    handleFieldChange,
    saveAll: saveAllMutation.mutateAsync,
    isSaving: saveAllMutation.isLoading || saveSingleSettingMutation.isLoading,
    cleanUnsavedChanges,
    saveSingleSetting: saveSingleSettingMutation.mutateAsync,
    setValidationErrors,
  };
};

export { SettingsContext, useSettingsContext };

/**
 * Field-specific hook for settings context with automatic validation error management.
 *
 * @param fieldNames - Array of field names this hook instance is responsible for.
 *   **Must be a stable reference** (module-level constant or `useMemo`) — the array is used
 *   directly in dependency arrays and a new array identity on every render will cause
 *   infinite re-renders.
 * @param validationFn - Optional validation function called automatically when `validationDeps` change
 * @param validationDeps - Dependencies for the validation function
 * @returns Settings context with field-scoped validation error management
 */
export const useFieldSettingsContext = <T extends any[]>(
  fieldNames: string[],
  validationFn?: (...args: any[]) => ValidationError[],
  validationDeps?: T
) => {
  const context = useSettingsContext();
  const { setValidationErrors: contextSetValidationErrors } = context;

  // Validate that we have field names
  if (!fieldNames || fieldNames.length === 0) {
    throw new Error('useFieldSettingsContext requires at least one field name');
  }

  // Track last validation errors to prevent unnecessary updates
  const lastValidationErrorsRef = React.useRef<ValidationError[]>([]);

  // Create a field-scoped setValidationErrors function with deduplication
  const setValidationErrors = React.useCallback(
    (errors: ValidationError[]) => {
      // Validate that all errors belong to the allowed fields
      const invalidErrors = errors.filter(
        (error) => error.field && !fieldNames.includes(error.field)
      );

      if (invalidErrors.length > 0) {
        const invalidFields = invalidErrors.map((e) => e.field).join(', ');
        throw new Error(
          `Validation errors contain fields not managed by this hook instance. ` +
            `Invalid fields: ${invalidFields}. Allowed fields: ${fieldNames.join(', ')}`
        );
      }

      // Check if errors have actually changed to prevent unnecessary updates
      const errorsChanged =
        errors.length !== lastValidationErrorsRef.current.length ||
        errors.some(
          (error, index) =>
            error.message !== lastValidationErrorsRef.current[index]?.message ||
            error.field !== lastValidationErrorsRef.current[index]?.field
        );

      if (errorsChanged) {
        lastValidationErrorsRef.current = errors;

        contextSetValidationErrors((currentErrors) => {
          const otherErrors = currentErrors.filter(
            (error) => !error.field || !fieldNames.includes(error.field)
          );
          return [...otherErrors, ...errors];
        });
      }
    },
    [contextSetValidationErrors, fieldNames]
  );

  // Auto-run validation function when dependencies change
  React.useEffect(
    () => {
      if (validationFn && validationDeps) {
        const errors = validationFn(...validationDeps);
        setValidationErrors(errors);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    validationDeps
      ? [...validationDeps, setValidationErrors, validationFn]
      : [setValidationErrors, validationFn]
  );

  React.useEffect(() => {
    return () => {
      contextSetValidationErrors((currentErrors) =>
        currentErrors.filter((error) => !error.field || !fieldNames.includes(error.field))
      );
    };
  }, [contextSetValidationErrors, fieldNames]);

  return {
    ...context,
    setValidationErrors,
  };
};
