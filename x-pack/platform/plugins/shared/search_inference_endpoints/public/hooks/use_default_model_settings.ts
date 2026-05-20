/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR,
  GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR_DEFAULT_ONLY,
} from '@kbn/management-settings-ids';
import { i18n } from '@kbn/i18n';
import { NO_DEFAULT_MODEL } from '../../common/constants';
import { useKibana } from './use_kibana';

export interface DefaultModelSettingsState {
  enableAi: boolean;
  defaultModelId: string;
  featureSpecificModels: boolean;
}

export interface UseDefaultModelSettingsReturn {
  state: DefaultModelSettingsState;
  isDirty: boolean;
  setEnableAi: (enabled: boolean) => void;
  setDefaultModelId: (id: string) => void;
  setFeatureSpecificModels: (enabled: boolean) => void;
  save: () => Promise<void>;
  reset: () => void;
}

// Persisted shape of the two underlying UI settings. AI is "disabled" when both
// `defaultModelId === NO_DEFAULT_MODEL` and `defaultOnly === true`.
interface PersistedDefaultModelState {
  defaultModelId: string;
  defaultOnly: boolean;
}

const isAiDisabled = ({ defaultModelId, defaultOnly }: PersistedDefaultModelState) =>
  defaultModelId === NO_DEFAULT_MODEL && defaultOnly === true;

const derive = (persisted: PersistedDefaultModelState): DefaultModelSettingsState => ({
  enableAi: !isAiDisabled(persisted),
  defaultModelId: persisted.defaultModelId,
  featureSpecificModels: !persisted.defaultOnly,
});

const toPersisted = (state: DefaultModelSettingsState): PersistedDefaultModelState => ({
  defaultModelId: state.defaultModelId,
  defaultOnly: !state.featureSpecificModels,
});

export const useDefaultModelSettings = (): UseDefaultModelSettingsReturn => {
  const { services } = useKibana();
  const settingsClient = services.settings.client;
  const notifications = services.notifications;

  const getPersistedState = useCallback((): PersistedDefaultModelState => {
    const defaultModelId = settingsClient.get<string>(
      GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR,
      NO_DEFAULT_MODEL
    );
    const defaultOnly = settingsClient.get<boolean>(
      GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR_DEFAULT_ONLY,
      false
    );
    return { defaultModelId, defaultOnly };
  }, [settingsClient]);

  const [savedState, setSavedState] = useState<DefaultModelSettingsState>(() =>
    derive(getPersistedState())
  );
  const [state, setState] = useState<DefaultModelSettingsState>(() => derive(getPersistedState()));

  // Remembers the last AI-enabled config so toggling the master switch off and back on restores it.
  const lastEnabledRef = useRef<DefaultModelSettingsState | null>(null);
  if (lastEnabledRef.current === null) {
    const persisted = getPersistedState();
    lastEnabledRef.current = isAiDisabled(persisted)
      ? { enableAi: true, defaultModelId: NO_DEFAULT_MODEL, featureSpecificModels: true }
      : derive(persisted);
  }

  useEffect(() => {
    const subscription = settingsClient.getUpdate$().subscribe(({ key }) => {
      if (
        key === GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR ||
        key === GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR_DEFAULT_ONLY
      ) {
        const newSaved = derive(getPersistedState());
        setSavedState(newSaved);
      }
    });
    return () => subscription.unsubscribe();
  }, [settingsClient, getPersistedState]);

  const isDirty = useMemo(
    () =>
      state.enableAi !== savedState.enableAi ||
      state.defaultModelId !== savedState.defaultModelId ||
      state.featureSpecificModels !== savedState.featureSpecificModels,
    [state, savedState]
  );

  const setEnableAi = useCallback((enabled: boolean) => {
    setState((prev) => {
      if (prev.enableAi && !enabled) {
        lastEnabledRef.current = prev;
        return {
          enableAi: false,
          defaultModelId: NO_DEFAULT_MODEL,
          featureSpecificModels: false,
        };
      }
      if (!prev.enableAi && enabled) {
        const remembered = lastEnabledRef.current ?? {
          enableAi: true,
          defaultModelId: NO_DEFAULT_MODEL,
          featureSpecificModels: true,
        };
        return {
          enableAi: true,
          defaultModelId: remembered.defaultModelId,
          featureSpecificModels: remembered.featureSpecificModels,
        };
      }
      return prev;
    });
  }, []);

  const setDefaultModelId = useCallback(
    (id: string) => setState((prev) => ({ ...prev, defaultModelId: id })),
    []
  );

  const setFeatureSpecificModels = useCallback(
    (enabled: boolean) => setState((prev) => ({ ...prev, featureSpecificModels: enabled })),
    []
  );

  const save = useCallback(async () => {
    try {
      const persisted = toPersisted(state);
      const savedPersisted = toPersisted(savedState);
      if (persisted.defaultModelId !== savedPersisted.defaultModelId) {
        await settingsClient.set(GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR, persisted.defaultModelId);
      }
      if (persisted.defaultOnly !== savedPersisted.defaultOnly) {
        await settingsClient.set(
          GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR_DEFAULT_ONLY,
          persisted.defaultOnly
        );
      }
      const newSaved = derive(getPersistedState());
      setSavedState(newSaved);
      setState(newSaved);
      if (newSaved.enableAi) {
        lastEnabledRef.current = newSaved;
      }
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
      throw e instanceof Error ? e : new Error(String(e));
    }
  }, [state, savedState, settingsClient, getPersistedState, notifications]);

  const reset = useCallback(() => {
    setState(savedState);
  }, [savedState]);

  return {
    state,
    isDirty,
    setEnableAi,
    setDefaultModelId,
    setFeatureSpecificModels,
    save,
    reset,
  };
};
