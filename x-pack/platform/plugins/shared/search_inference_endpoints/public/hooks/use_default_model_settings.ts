/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR,
  GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR_DEFAULT_ONLY,
} from '@kbn/management-settings-ids';
import { i18n } from '@kbn/i18n';
import { NO_DEFAULT_MODEL } from '../../common/constants';
import { useKibana } from './use_kibana';

export interface DefaultModelSettingsState {
  defaultModelId: string;
  disallowOtherModels: boolean;
}

export interface UseDefaultModelSettingsReturn {
  state: DefaultModelSettingsState;
  savedState: DefaultModelSettingsState;
  isDirty: boolean;
  setDefaultModelId: (id: string) => void;
  setDisallowOtherModels: (disallow: boolean) => void;
  save: () => Promise<void>;
  reset: () => void;
}

export const useDefaultModelSettings = (): UseDefaultModelSettingsReturn => {
  const { services } = useKibana();
  const uiSettings = services.uiSettings;
  const notifications = services.notifications;

  const getSavedState = useCallback((): DefaultModelSettingsState => {
    const defaultModelId = uiSettings.get<string>(
      GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR,
      NO_DEFAULT_MODEL
    );
    const disallowOtherModels = uiSettings.get<boolean>(
      GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR_DEFAULT_ONLY,
      false
    );
    return { defaultModelId, disallowOtherModels };
  }, [uiSettings]);

  const [savedState, setSavedState] = useState<DefaultModelSettingsState>(getSavedState);
  const [state, setState] = useState<DefaultModelSettingsState>(getSavedState);

  useEffect(() => {
    const subscription = uiSettings.getUpdate$().subscribe(({ key }) => {
      if (
        key === GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR ||
        key === GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR_DEFAULT_ONLY
      ) {
        const newSaved = getSavedState();
        setSavedState(newSaved);
      }
    });
    return () => subscription.unsubscribe();
  }, [uiSettings, getSavedState]);

  const isDirty = useMemo(
    () =>
      state.defaultModelId !== savedState.defaultModelId ||
      state.disallowOtherModels !== savedState.disallowOtherModels,
    [state, savedState]
  );

  const setDefaultModelId = useCallback(
    (id: string) => setState((prev) => ({ ...prev, defaultModelId: id })),
    []
  );

  const setDisallowOtherModels = useCallback(
    (disallow: boolean) => setState((prev) => ({ ...prev, disallowOtherModels: disallow })),
    []
  );

  const save = useCallback(async () => {
    try {
      if (state.defaultModelId !== savedState.defaultModelId) {
        await uiSettings.set(GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR, state.defaultModelId);
      }
      if (state.disallowOtherModels !== savedState.disallowOtherModels) {
        await uiSettings.set(
          GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR_DEFAULT_ONLY,
          state.disallowOtherModels
        );
      }
      const newSaved = getSavedState();
      setSavedState(newSaved);
      setState(newSaved);
      notifications.toasts.addSuccess({
        title: i18n.translate('xpack.searchInferenceEndpoints.settings.defaultModel.saveSuccess', {
          defaultMessage: 'Default model settings saved',
        }),
      });
    } catch (e) {
      notifications.toasts.addDanger({
        title: i18n.translate('xpack.searchInferenceEndpoints.settings.defaultModel.saveError', {
          defaultMessage: 'Failed to save default model settings',
        }),
        text: (e as Error)?.message ?? 'Unknown error',
      });
    }
  }, [state, savedState, uiSettings, getSavedState, notifications]);

  const reset = useCallback(() => {
    setState(savedState);
  }, [savedState]);

  return {
    state,
    savedState,
    isDirty,
    setDefaultModelId,
    setDisallowOtherModels,
    save,
    reset,
  };
};
