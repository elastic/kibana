/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FunctionComponent, PropsWithChildren } from 'react';
import React, { createContext, useContext, useMemo } from 'react';

import { createDatasetFlyoutStrings } from './create_dataset_flyout_i18n';
import type { DatasetFormatFormValue } from './create_dataset_flyout_form_state';
import { getDefaultSettingsForFormat } from './dataset_settings_defaults';
import { formatSettingsFieldDisplayValue } from './dataset_settings_value_labels';
import type { DatasetSettingsFieldId } from './dataset_settings_visibility';

/**
 * Defaults Elasticsearch documents but that have no equivalent form value, so
 * they cannot be read from the defaults table.
 */
const getImplicitDefaultLabel = (fieldId: DatasetSettingsFieldId): string | undefined =>
  fieldId === 'max_errors'
    ? createDatasetFlyoutStrings.settingsMaxErrorsDefaultUnbounded()
    : undefined;

export const getSettingDefaultValue = (
  fieldId: DatasetSettingsFieldId,
  format: Exclude<DatasetFormatFormValue, ''>
): string | undefined => getDefaultSettingsForFormat(format)[fieldId];

export const getSettingDefaultLabel = (
  fieldId: DatasetSettingsFieldId,
  format: Exclude<DatasetFormatFormValue, ''>
): string | undefined => {
  const value = getSettingDefaultValue(fieldId, format);

  return value ? formatSettingsFieldDisplayValue(fieldId, value) : getImplicitDefaultLabel(fieldId);
};

export interface DatasetSettingDefaultHint {
  /** The default value, when it is one of the field's selectable values. */
  value?: string;
  placeholder: string;
}

const DatasetSettingDefaultHintsContext = createContext<
  Exclude<DatasetFormatFormValue, ''> | undefined
>(undefined);

export interface DatasetSettingDefaultHintsProviderProps {
  format: Exclude<DatasetFormatFormValue, ''>;
  /** Flows that pre-fill their fields opt out, since a placeholder would never show. */
  isEnabled: boolean;
}

export const DatasetSettingDefaultHintsProvider: FunctionComponent<
  PropsWithChildren<DatasetSettingDefaultHintsProviderProps>
> = ({ format, isEnabled, children }) => (
  <DatasetSettingDefaultHintsContext.Provider value={isEnabled ? format : undefined}>
    {children}
  </DatasetSettingDefaultHintsContext.Provider>
);

/** Settings fields are always bound to `settings.<fieldId>` in the wizard form. */
const settingsFieldIdFromFieldName = (name: string): DatasetSettingsFieldId | undefined => {
  const prefix = 'settings.';

  return name.startsWith(prefix)
    ? (name.slice(prefix.length) as DatasetSettingsFieldId)
    : undefined;
};

export const useDatasetSettingDefaultHint = (
  fieldName: string
): DatasetSettingDefaultHint | undefined => {
  const format = useContext(DatasetSettingDefaultHintsContext);

  return useMemo(() => {
    if (!format) {
      return undefined;
    }

    const fieldId = settingsFieldIdFromFieldName(fieldName);
    if (!fieldId) {
      return undefined;
    }

    const label = getSettingDefaultLabel(fieldId, format);
    if (!label) {
      return undefined;
    }

    return {
      value: getSettingDefaultValue(fieldId, format),
      placeholder: createDatasetFlyoutStrings.settingsDefaultPlaceholder(label),
    };
  }, [fieldName, format]);
};
