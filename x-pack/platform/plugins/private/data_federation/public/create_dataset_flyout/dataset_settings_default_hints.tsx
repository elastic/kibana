/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FunctionComponent, PropsWithChildren, ReactNode } from 'react';
import React, { createContext, useContext, useMemo } from 'react';
import { EuiCode, EuiIconTip, EuiScreenReaderOnly } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

import { createDatasetFlyoutStrings } from './create_dataset_flyout_i18n';
import type { DatasetFormatFormValue } from './create_dataset_flyout_form_state';
import { getDefaultSettingsForFormat } from './dataset_settings_defaults';
import { NULL_VALUE_EMPTY_STRING_PRESET } from './dataset_settings_options';
import { formatSettingsFieldDisplayValue } from './dataset_settings_value_labels';
import type { DatasetSettingsFieldId } from './dataset_settings_visibility';
import { bytesToDisplayValue, pickBestByteSizeUnit } from './max_field_size_utils';

/** Elasticsearch stops at the first error unless a budget is configured. */
const MAX_ERRORS_DEFAULT_LITERAL = 'unbounded';

export const getSettingDefaultValue = (
  fieldId: DatasetSettingsFieldId,
  format: Exclude<DatasetFormatFormValue, ''>
): string | undefined => getDefaultSettingsForFormat(format)[fieldId];

/**
 * Defaults Elasticsearch documents but that have no equivalent form value, so
 * they cannot be read from the defaults table.
 */
const getImplicitDefaultLabel = (fieldId: DatasetSettingsFieldId): string | undefined =>
  fieldId === 'max_errors'
    ? createDatasetFlyoutStrings.settingsMaxErrorsDefaultUnbounded()
    : undefined;

export const getSettingDefaultLabel = (
  fieldId: DatasetSettingsFieldId,
  format: Exclude<DatasetFormatFormValue, ''>
): string | undefined => {
  const value = getSettingDefaultValue(fieldId, format);

  return value ? formatSettingsFieldDisplayValue(fieldId, value) : getImplicitDefaultLabel(fieldId);
};

/** Whitespace reads as an absent value unless it is escaped. */
const escapeWhitespace = (value: string): string =>
  value.replace(/\t/g, '\\t').replace(/\n/g, '\\n').replace(/\r/g, '\\r');

/** The stored value is a byte count, which says less than the size it stands for. */
const toByteSizeLiteral = (value: string): string => {
  const bytes = Number(value);

  if (!Number.isFinite(bytes)) {
    return value;
  }

  const unit = pickBestByteSizeUnit(bytes);

  return `${bytesToDisplayValue(bytes, unit)}${unit}`;
};

/**
 * The literal Elasticsearch receives, which is what the help text quotes. It
 * differs from the value the form holds where that value is an internal
 * sentinel or a raw byte count.
 */
export const getSettingDefaultLiteral = (
  fieldId: DatasetSettingsFieldId,
  format: Exclude<DatasetFormatFormValue, ''>
): string | undefined => {
  const value = getSettingDefaultValue(fieldId, format);

  if (value === undefined) {
    return fieldId === 'max_errors' ? MAX_ERRORS_DEFAULT_LITERAL : undefined;
  }

  if (value === NULL_VALUE_EMPTY_STRING_PRESET) {
    return undefined;
  }

  return fieldId === 'max_field_size' ? toByteSizeLiteral(value) : escapeWhitespace(value);
};

const SettingDefaultHelp: FunctionComponent<{ literal: string }> = ({ literal }) => (
  <FormattedMessage
    id="xpack.dataFederation.createDatasetFlyout.settingsDefaultHelp"
    defaultMessage="{value} by default."
    values={{ value: <EuiCode>{literal}</EuiCode> }}
  />
);

export interface DatasetSettingDefaultHint {
  /** The default value, when it is one of the field's selectable values. */
  value?: string;
  /** Sentence naming the default, shown below the field. */
  help: ReactNode;
}

const DatasetSettingDefaultHintsContext = createContext<
  Exclude<DatasetFormatFormValue, ''> | undefined
>(undefined);

export interface DatasetSettingDefaultHintsProviderProps {
  format: Exclude<DatasetFormatFormValue, ''>;
  /** Flows that pre-fill their fields opt out, since the default is the value. */
  isEnabled: boolean;
}

export const DatasetSettingDefaultHintsProvider: FunctionComponent<
  PropsWithChildren<DatasetSettingDefaultHintsProviderProps>
> = ({ format, isEnabled, children }) => (
  <DatasetSettingDefaultHintsContext.Provider value={isEnabled ? format : undefined}>
    {children}
  </DatasetSettingDefaultHintsContext.Provider>
);

/**
 * Fields only need to be clearable where a cleared field falls back to a
 * default, so the control they render depends on this too.
 */
export const useDatasetSettingDefaultsShown = (): boolean =>
  useContext(DatasetSettingDefaultHintsContext) !== undefined;

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

    const value = getSettingDefaultValue(fieldId, format);
    const literal = getSettingDefaultLiteral(fieldId, format);

    if (!literal) {
      /** An empty default has no literal worth quoting, so it is spelled out. */
      return value === NULL_VALUE_EMPTY_STRING_PRESET
        ? { value, help: createDatasetFlyoutStrings.settingsDefaultEmptyStringHelp() }
        : undefined;
    }

    return { value, help: <SettingDefaultHelp literal={literal} /> };
  }, [fieldName, format]);
};

export const DATASET_SETTING_DESCRIPTION_TEST_SUBJ = 'datasetSettingFieldDescription';
export const DATASET_SETTING_DESCRIPTION_TIP_TEST_SUBJ = 'datasetSettingFieldDescriptionTip';

export interface SettingFieldText {
  label: string;
  /** What the field describes. Where defaults are shown, it moves into a tooltip. */
  description?: string;
  /** Help text, which stands in as the description where no shorter one is given. */
  helpText?: string;
  placeholder?: string;
}

export interface ResolvedSettingFieldText {
  label: ReactNode;
  helpText: ReactNode;
  placeholder?: string;
}

/**
 * Where defaults are shown, the help text is given over to the default and the
 * description moves into a tooltip on the label, which sighted users have to
 * seek out, so it stays on the field as a description for screen readers.
 */
export const useSettingFieldText = (
  fieldName: string,
  { label, description, helpText, placeholder }: SettingFieldText
): ResolvedSettingFieldText => {
  const defaultHint = useDatasetSettingDefaultHint(fieldName);
  const areDefaultsShown = useDatasetSettingDefaultsShown();

  if (!areDefaultsShown) {
    return { label, helpText, placeholder };
  }

  const fieldDescription = description ?? helpText;

  if (!fieldDescription) {
    return { label, helpText: defaultHint?.help, placeholder };
  }

  return {
    label: (
      <>
        {label}{' '}
        <EuiIconTip
          type="info"
          size="s"
          color="subdued"
          content={fieldDescription}
          iconProps={{ 'data-test-subj': DATASET_SETTING_DESCRIPTION_TIP_TEST_SUBJ }}
        />
      </>
    ),
    helpText: [
      <EuiScreenReaderOnly key="description">
        <span data-test-subj={DATASET_SETTING_DESCRIPTION_TEST_SUBJ}>{fieldDescription}</span>
      </EuiScreenReaderOnly>,
      ...(defaultHint ? [defaultHint.help] : []),
    ],
    placeholder,
  };
};
