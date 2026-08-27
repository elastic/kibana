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
import { buildDatasetSettingsFromFormValues } from './create_dataset_flyout_form_state';
import { DatasetSettingsFieldsLayout } from './dataset_settings_fields_layout';
import { getFlow3AdvancedFields } from './dataset_settings_flow3_layout';
import { getVisibleCustomJsonApiKeys } from './settings_custom_json_schema';
import {
  DATASET_SETTINGS_CUSTOM_JSON_API_KEYS,
  applyCustomJsonToFormSettings,
  stripJsonComments,
  type DatasetSettingsCustomJsonApiKey,
} from './settings_custom_json_utils';

const CUSTOM_JSON_API_KEY_SET = new Set<string>(DATASET_SETTINGS_CUSTOM_JSON_API_KEYS);
const JSON_ONLY_API_KEYS = new Set<string>(['target_split_size']);

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

const buildJsonFromFormSettings = (
  settings: CreateDatasetSettingsFormValues,
  visibleApiKeys: DatasetSettingsCustomJsonApiKey[],
  existingJsonStr: string
): string => {
  const apiSettings = buildDatasetSettingsFromFormValues(settings) ?? {};
  const existingParsed = tryParseJson(existingJsonStr) ?? {};

  const jsonObject: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(existingParsed)) {
    if (!CUSTOM_JSON_API_KEY_SET.has(key)) {
      jsonObject[key] = value;
    }
  }

  for (const key of visibleApiKeys) {
    if (JSON_ONLY_API_KEYS.has(key)) {
      if (key in existingParsed) {
        jsonObject[key] = existingParsed[key];
      }
    } else {
      const apiValue = (apiSettings as Record<string, unknown>)[key];
      if (apiValue !== undefined) {
        jsonObject[key] = apiValue;
      }
    }
  }

  return JSON.stringify(jsonObject, null, 2);
};

export interface DatasetSettingsAdvancedViewToggleProps {
  control: Control<DatasetWizardFormValues>;
  getValues: UseFormGetValues<DatasetWizardFormValues>;
  setValue: UseFormSetValue<DatasetWizardFormValues>;
  format: Exclude<DatasetFormatFormValue, ''>;
  errorMode: DatasetErrorModeFormValue;
  testSubjPrefix: string;
}

export const DatasetSettingsAdvancedViewToggle: FunctionComponent<
  DatasetSettingsAdvancedViewToggleProps
> = ({ control, getValues, setValue, format, errorMode, testSubjPrefix }) => {
  const prevSettingsDigestRef = useRef<string | null>(null);

  const advancedFields = useMemo(
    () => getFlow3AdvancedFields(format, errorMode),
    [format, errorMode]
  );

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
    const newJson = buildJsonFromFormSettings(
      settings as CreateDatasetSettingsFormValues,
      visibleJsonApiKeys,
      getValues('settings_custom_json')
    );
    setValue('settings_custom_json', newJson, { shouldDirty: true, shouldValidate: true });
  }, [getValues, setValue, settings, visibleJsonApiKeys]);

  return (
    <DatasetSettingsFieldsLayout
      control={control}
      fields={advancedFields}
      testSubjPrefix={testSubjPrefix}
      columns={1}
      rowSpacerSize="m"
    />
  );
};
