/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useRef, useState } from 'react';
import type {
  RulesSettingsFlappingProperties,
  RulesSettingsProperties,
  RulesSettingsQueryDelayProperties,
} from '@kbn/alerting-plugin/common';
import { useFetchFlappingSettings } from '@kbn/alerts-ui-shared/src/common/hooks/use_fetch_flapping_settings';
import { useKibana } from '../../../common/lib/kibana';
import { useGetQueryDelaySettings } from '../../hooks/use_get_query_delay_settings';
import { useUpdateRuleSettings } from '../../hooks/use_update_rules_settings';

const useResettableState: <T>(
  initialValue?: T
) => [T | undefined, boolean, (next: T, shouldUpdateInitialValue?: boolean) => void, () => void] = (
  initalValue
) => {
  const initialValueRef = useRef(initalValue);
  const [value, setValue] = useState(initalValue);
  const [hasChanged, setHasChanged] = useState(false);
  const reset = () => {
    setValue(initialValueRef.current);
    setHasChanged(false);
  };
  const updateValue = (next: typeof value, shouldUpdateInitialValue = false) => {
    setValue(next);
    if (shouldUpdateInitialValue) {
      initialValueRef.current = next;
      setHasChanged(false);
    } else {
      setHasChanged(true);
    }
  };
  return [value, hasChanged, updateValue, reset];
};

export interface UseRulesSettingsFormProps {
  enabled: boolean;
  setUpdatingRulesSettings?: (isUpdating: boolean) => void;
  onClose: () => void;
  onSave?: () => void;
}

export interface RulesSettingsForm {
  flappingSettings?: RulesSettingsFlappingProperties;
  queryDelaySettings?: RulesSettingsQueryDelayProperties;
  isLoading: boolean;
  hasFlappingError: boolean;
  hasQueryDelayError: boolean;
  canShowFlappingSettings: boolean;
  canWriteFlappingSettings: boolean;
  canShowQueryDelaySettings: boolean;
  canWriteQueryDelaySettings: boolean;
  canShowAlertDeleteSettings: boolean;
  isSaveDisabled: boolean;
  onSettingChange: (
    setting: keyof RulesSettingsProperties,
    key: keyof RulesSettingsFlappingProperties | keyof RulesSettingsQueryDelayProperties,
    value: boolean | number
  ) => void;
  onSave: () => void;
  onCancel: () => void;
}

export const useRulesSettingsForm = ({
  enabled,
  setUpdatingRulesSettings,
  onClose,
  onSave,
}: UseRulesSettingsFormProps): RulesSettingsForm => {
  const {
    application: { capabilities },
    http,
  } = useKibana().services;
  const {
    rulesSettings: {
      writeFlappingSettingsUI,
      readFlappingSettingsUI,
      writeQueryDelaySettingsUI,
      readQueryDelaySettingsUI,
      readAlertDeleteSettingsUI,
    },
  } = capabilities;

  const [flappingSettings, hasFlappingChanged, setFlappingSettings, resetFlappingSettings] =
    useResettableState<RulesSettingsFlappingProperties>();

  const [queryDelaySettings, hasQueryDelayChanged, setQueryDelaySettings, resetQueryDelaySettings] =
    useResettableState<RulesSettingsQueryDelayProperties>();

  const { isLoading: isFlappingLoading, isError: hasFlappingError } = useFetchFlappingSettings({
    http,
    enabled,
    onSuccess: (fetchedSettings) => {
      if (!flappingSettings) {
        setFlappingSettings(
          {
            enabled: fetchedSettings.enabled,
            lookBackWindow: fetchedSettings.lookBackWindow,
            statusChangeThreshold: fetchedSettings.statusChangeThreshold,
          },
          true // Update the initial value so we don't need to fetch it from the server again
        );
      }
    },
  });

  const { isLoading: isQueryDelayLoading, isError: hasQueryDelayError } = useGetQueryDelaySettings({
    enabled,
    onSuccess: (fetchedSettings) => {
      if (!queryDelaySettings) {
        setQueryDelaySettings(
          {
            delay: fetchedSettings.delay,
          },
          true
        );
      }
    },
  });

  const onCancel = useCallback(() => {
    resetFlappingSettings();
    resetQueryDelaySettings();
    onClose();
  }, [onClose, resetFlappingSettings, resetQueryDelaySettings]);

  const { mutate } = useUpdateRuleSettings({
    onSave,
    onClose,
    setUpdatingRulesSettings,
  });

  // In the future when we have more settings sub-features, we should
  // disassociate the rule settings capabilities (save, show) from the
  // sub-feature capabilities (writeXSettingsUI).
  const canWriteFlappingSettings = writeFlappingSettingsUI && !hasFlappingError;
  const canWriteQueryDelaySettings = writeQueryDelaySettingsUI && !hasQueryDelayError;

  const isChanged = hasFlappingChanged || hasQueryDelayChanged;
  const hasMinimumWritePermissions = canWriteFlappingSettings || canWriteQueryDelaySettings;
  const isSaveDisabled = !isChanged || !hasMinimumWritePermissions;

  const onSettingChange: RulesSettingsForm['onSettingChange'] = (setting, key, value) => {
    if (setting === 'flapping') {
      if (!flappingSettings) {
        return;
      }
      const newSettings = {
        ...flappingSettings,
        [key]: value,
      };
      setFlappingSettings({
        ...newSettings,
        statusChangeThreshold: Math.min(
          newSettings.lookBackWindow,
          newSettings.statusChangeThreshold
        ),
      });
    }

    if (setting === 'queryDelay') {
      if (!queryDelaySettings) {
        return;
      }
      const newSettings = {
        ...queryDelaySettings,
        [key]: value,
      };
      setQueryDelaySettings(newSettings);
    }
  };

  const handleSave = () => {
    const updatedSettings: RulesSettingsProperties = {};
    if (canWriteFlappingSettings && hasFlappingChanged) {
      updatedSettings.flapping = flappingSettings;
      setFlappingSettings(flappingSettings!, true);
    }
    if (canWriteQueryDelaySettings && hasQueryDelayChanged) {
      updatedSettings.queryDelay = queryDelaySettings;
      setQueryDelaySettings(queryDelaySettings!, true);
    }
    mutate(updatedSettings);
  };

  return {
    flappingSettings,
    queryDelaySettings,
    isLoading: isFlappingLoading || isQueryDelayLoading,
    hasFlappingError,
    hasQueryDelayError,
    canShowFlappingSettings: Boolean(readFlappingSettingsUI),
    canWriteFlappingSettings,
    canShowQueryDelaySettings: Boolean(readQueryDelaySettingsUI),
    canWriteQueryDelaySettings,
    canShowAlertDeleteSettings: Boolean(readAlertDeleteSettingsUI),
    isSaveDisabled,
    onSettingChange,
    onSave: handleSave,
    onCancel,
  };
};
