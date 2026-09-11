/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FunctionComponent } from 'react';
import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import type { Control, FieldPath, UseFormGetValues, UseFormSetValue } from 'react-hook-form';
import { useWatch } from 'react-hook-form';
import { debounce } from 'lodash';

import type { DatasetWizardFormValues } from '../create_dataset_wizard/dataset_wizard_form_state';
import type {
  CreateDatasetSettingsFormValues,
  DatasetErrorModeFormValue,
  DatasetFormatFormValue,
} from './create_dataset_flyout_form_state';
import { DatasetSettingsFieldsLayout } from './dataset_settings_fields_layout';
import type { DatasetSettingsFieldId } from './dataset_settings_visibility';
import { getVisibleCustomJsonApiKeys } from './settings_custom_json_schema';
import {
  applyCustomJsonToFormSettings,
  buildSettingsCustomJsonFromForm,
  stripJsonComments,
} from './settings_custom_json_utils';

const tryParseJson = (value: string): Record<string, unknown> | undefined => {
  try {
    const stripped = stripJsonComments(value).trim();
    if (!stripped || stripped === '{}') return {};
    const parsed = JSON.parse(stripped);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    // invalid JSON — caller handles the undefined return
  }
  return undefined;
};

export interface DatasetSettingsAdvancedViewToggleProps {
  control: Control<DatasetWizardFormValues>;
  getValues: UseFormGetValues<DatasetWizardFormValues>;
  setValue: UseFormSetValue<DatasetWizardFormValues>;
  format: Exclude<DatasetFormatFormValue, ''>;
  errorMode: DatasetErrorModeFormValue;
  /** Advanced fields to show, already filtered by the settings panel. */
  fields: readonly DatasetSettingsFieldId[];
  testSubjPrefix: string;
  constrainWidth?: boolean;
  compressed?: boolean;
}

export const DatasetSettingsAdvancedViewToggle: FunctionComponent<
  DatasetSettingsAdvancedViewToggleProps
> = ({
  control,
  getValues,
  setValue,
  format,
  errorMode,
  fields,
  testSubjPrefix,
  constrainWidth = true,
  compressed,
}) => {
  const prevSettingsDigestRef = useRef<string | null>(null);

  const visibleJsonApiKeys = useMemo(
    () => getVisibleCustomJsonApiKeys(format, errorMode),
    [format, errorMode]
  );

  const settings = useWatch({ control, name: 'settings' });
  const customJson = useWatch({ control, name: 'settings_custom_json' });
  const skipJsonToFormRef = useRef(false);
  const expectedSettingsDigestFromJsonRef = useRef<string | null>(null);

  const populateFieldsFromJson = useCallback(
    (parsed: Record<string, unknown>) => {
      const currentSettings = getValues('settings') as CreateDatasetSettingsFormValues;
      const nextSettings = applyCustomJsonToFormSettings(currentSettings, JSON.stringify(parsed));

      expectedSettingsDigestFromJsonRef.current = JSON.stringify(nextSettings);

      (Object.keys(nextSettings) as Array<keyof CreateDatasetSettingsFormValues>).forEach((key) => {
        if (currentSettings[key] === nextSettings[key]) {
          return;
        }

        setValue(`settings.${key}` as FieldPath<DatasetWizardFormValues>, nextSettings[key], {
          shouldDirty: true,
          shouldValidate: true,
        });
      });
    },
    [getValues, setValue]
  );

  const debouncedPopulateFieldsFromJson = useMemo(
    () => debounce(populateFieldsFromJson, 250),
    [populateFieldsFromJson]
  );

  useEffect(
    () => () => {
      debouncedPopulateFieldsFromJson.flush();
    },
    [debouncedPopulateFieldsFromJson]
  );

  useEffect(() => {
    const parsed = tryParseJson(customJson);
    if (parsed === undefined) {
      return;
    }

    if (skipJsonToFormRef.current) {
      skipJsonToFormRef.current = false;
      return;
    }

    debouncedPopulateFieldsFromJson(parsed);
  }, [customJson, debouncedPopulateFieldsFromJson]);

  useEffect(() => {
    const settingsDigest = JSON.stringify(settings);
    if (prevSettingsDigestRef.current === null) {
      prevSettingsDigestRef.current = settingsDigest;
      return;
    }

    if (settingsDigest === prevSettingsDigestRef.current) {
      return;
    }

    if (expectedSettingsDigestFromJsonRef.current) {
      if (settingsDigest !== expectedSettingsDigestFromJsonRef.current) {
        return;
      }

      prevSettingsDigestRef.current = settingsDigest;
      expectedSettingsDigestFromJsonRef.current = null;
      return;
    }

    prevSettingsDigestRef.current = settingsDigest;
    skipJsonToFormRef.current = true;
    const newJson = buildSettingsCustomJsonFromForm(
      settings as CreateDatasetSettingsFormValues,
      (settings as CreateDatasetSettingsFormValues).error_mode,
      getValues('settings_custom_json')
    );
    setValue('settings_custom_json', newJson, { shouldDirty: true, shouldValidate: true });
  }, [getValues, setValue, settings, visibleJsonApiKeys]);

  return (
    <DatasetSettingsFieldsLayout
      control={control}
      fields={fields}
      testSubjPrefix={testSubjPrefix}
      columns={1}
      rowSpacerSize="m"
      constrainWidth={constrainWidth}
      compressed={compressed}
    />
  );
};
