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
  savedState: DefaultModelSettingsState;
  isDirty: boolean;
  setEnableAi: (enabled: boolean) => void;
  setDefaultModelId: (id: string) => void;
  setFeatureSpecificModels: (enabled: boolean) => void;
  save: () => Promise<void>;
  reset: () => void;
}

interface PersistedDefaultModelState {
  defaultModelId: string;
  disallowOtherModels: boolean;
}

const isAiDisabled = ({ defaultModelId, disallowOtherModels }: PersistedDefaultModelState) =>
  defaultModelId === NO_DEFAULT_MODEL && disallowOtherModels === true;

const derive = (persisted: PersistedDefaultModelState): DefaultModelSettingsState => ({
  enableAi: !isAiDisabled(persisted),
  defaultModelId: persisted.defaultModelId,
  featureSpecificModels: !persisted.disallowOtherModels,
});

const toPersisted = (state: DefaultModelSettingsState): PersistedDefaultModelState => ({
  defaultModelId: state.defaultModelId,
  disallowOtherModels: !state.featureSpecificModels,
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
    const disallowOtherModels = settingsClient.get<boolean>(
      GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR_DEFAULT_ONLY,
      false
    );
    return { defaultModelId, disallowOtherModels };
  }, [settingsClient]);

  const [savedState, setSavedState] = useState<DefaultModelSettingsState>(() =>
    derive(getPersistedState())
  );
  const [state, setState] = useState<DefaultModelSettingsState>(() => derive(getPersistedState()));

  // Remember the last known "AI enabled" configuration so toggling the master switch
  // OFF and back ON in the same session restores what the user had before.
  const lastEnabledRef = useRef<PersistedDefaultModelState | null>(null);
  if (lastEnabledRef.current === null) {
    const persisted = getPersistedState();
    lastEnabledRef.current = isAiDisabled(persisted)
      ? { defaultModelId: NO_DEFAULT_MODEL, disallowOtherModels: false }
      : persisted;
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
        // Turning AI off: remember the current configuration so we can restore it later
        // in the same session, and collapse to the disabled persisted form.
        lastEnabledRef.current = toPersisted(prev);
        return {
          enableAi: false,
          defaultModelId: NO_DEFAULT_MODEL,
          featureSpecificModels: false,
        };
      }
      if (!prev.enableAi && enabled) {
        const remembered = lastEnabledRef.current ?? {
          defaultModelId: NO_DEFAULT_MODEL,
          disallowOtherModels: false,
        };
        return {
          enableAi: true,
          defaultModelId: remembered.defaultModelId,
          featureSpecificModels: !remembered.disallowOtherModels,
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
      if (persisted.disallowOtherModels !== savedPersisted.disallowOtherModels) {
        await settingsClient.set(
          GEN_AI_SETTINGS_DEFAULT_AI_CONNECTOR_DEFAULT_ONLY,
          persisted.disallowOtherModels
        );
      }
      const newSaved = derive(getPersistedState());
      setSavedState(newSaved);
      setState(newSaved);
      if (newSaved.enableAi) {
        lastEnabledRef.current = toPersisted(newSaved);
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
    }
  }, [state, savedState, settingsClient, getPersistedState, notifications]);

  const reset = useCallback(() => {
    setState(savedState);
  }, [savedState]);

  return {
    state,
    savedState,
    isDirty,
    setEnableAi,
    setDefaultModelId,
    setFeatureSpecificModels,
    save,
    reset,
  };
};
