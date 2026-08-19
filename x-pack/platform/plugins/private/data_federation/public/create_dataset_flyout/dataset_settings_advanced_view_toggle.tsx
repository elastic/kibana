/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FunctionComponent } from 'react';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { EuiButtonGroup, EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiTitle } from '@elastic/eui';
import type { Control, UseFormGetValues, UseFormSetValue } from 'react-hook-form';
import { useWatch } from 'react-hook-form';

import type { DatasetWizardFormValues } from '../create_dataset_wizard/dataset_wizard_form_state';
import { datasetWizardStrings } from '../create_dataset_wizard/dataset_wizard_i18n';
import type {
  CreateDatasetSettingsFormValues,
  DatasetErrorModeFormValue,
  DatasetFormatFormValue,
} from './create_dataset_flyout_form_state';
import { buildDatasetSettingsFromFormValues } from './create_dataset_flyout_form_state';
import { DatasetSettingsCustomJsonEditor } from './dataset_settings_custom_json_editor';
import { DatasetSettingsFieldsLayout } from './dataset_settings_fields_layout';
import { getFlow3AdvancedFields } from './dataset_settings_flow3_layout';
import type { DatasetSettingsFieldId } from './dataset_settings_visibility';
import { getVisibleCustomJsonApiKeys } from './settings_custom_json_schema';
import {
  DATASET_SETTINGS_CUSTOM_JSON_API_KEYS,
  stripJsonComments,
  type DatasetSettingsCustomJsonApiKey,
} from './settings_custom_json_utils';

type AdvancedViewMode = 'json' | 'list';

const CUSTOM_JSON_API_KEY_SET = new Set<string>(DATASET_SETTINGS_CUSTOM_JSON_API_KEYS);
const JSON_ONLY_API_KEYS = new Set<string>(['target_split_size']);

const jsonValueToFormValue = (value: unknown): string => {
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'number') return String(value);
  if (typeof value === 'string') return value;
  return '';
};

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
  const [activeView, setActiveView] = useState<AdvancedViewMode>('json');
  const lastValidParsedRef = useRef<Record<string, unknown>>({});
  const prevSettingsDigestRef = useRef<string>('');

  const advancedFields = useMemo(
    () => getFlow3AdvancedFields(format, errorMode),
    [format, errorMode]
  );

  const visibleJsonApiKeys = useMemo(
    () => getVisibleCustomJsonApiKeys(format, errorMode),
    [format, errorMode]
  );

  const allFormFieldIds = useMemo(
    () =>
      visibleJsonApiKeys.filter(
        (key): key is DatasetSettingsFieldId => !JSON_ONLY_API_KEYS.has(key)
      ),
    [visibleJsonApiKeys]
  );

  const settings = useWatch({ control, name: 'settings' });
  const customJson = useWatch({ control, name: 'settings_custom_json' });

  useEffect(() => {
    const parsed = tryParseJson(customJson);
    if (parsed !== undefined) {
      lastValidParsedRef.current = parsed;
    }
  }, [customJson]);

  useEffect(() => {
    if (activeView !== 'list') return;

    const settingsDigest = JSON.stringify(settings);
    if (settingsDigest === prevSettingsDigestRef.current) return;
    prevSettingsDigestRef.current = settingsDigest;

    const newJson = buildJsonFromFormSettings(
      settings as CreateDatasetSettingsFormValues,
      visibleJsonApiKeys,
      getValues('settings_custom_json')
    );
    setValue('settings_custom_json', newJson, { shouldDirty: true, shouldValidate: true });
  }, [activeView, settings, visibleJsonApiKeys, getValues, setValue]);

  const populateFieldsFromJson = useCallback(
    (parsed: Record<string, unknown>) => {
      for (const fieldId of allFormFieldIds) {
        if (fieldId in parsed) {
          const formValue = jsonValueToFormValue(parsed[fieldId]);
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          setValue(`settings.${fieldId}` as any, formValue as any, {
            shouldDirty: true,
            shouldValidate: true,
          });
        }
      }
    },
    [allFormFieldIds, setValue]
  );

  const handleViewChange = useCallback(
    (nextViewId: string) => {
      const nextView = nextViewId as AdvancedViewMode;
      if (nextView === activeView) return;

      if (nextView === 'list') {
        const parsed =
          tryParseJson(getValues('settings_custom_json')) ?? lastValidParsedRef.current;
        populateFieldsFromJson(parsed);
        prevSettingsDigestRef.current = JSON.stringify(getValues('settings'));
      } else {
        const newJson = buildJsonFromFormSettings(
          getValues('settings') as CreateDatasetSettingsFormValues,
          visibleJsonApiKeys,
          getValues('settings_custom_json')
        );
        setValue('settings_custom_json', newJson, { shouldDirty: true, shouldValidate: true });
      }

      setActiveView(nextView);
    },
    [activeView, getValues, populateFieldsFromJson, setValue, visibleJsonApiKeys]
  );

  const toggleOptions = useMemo(
    () => [
      {
        id: 'json',
        label: datasetWizardStrings.advancedSettingsJsonViewLabel(),
        iconType: 'editorCodeBlock',
      },
      {
        id: 'list',
        label: datasetWizardStrings.advancedSettingsListViewLabel(),
        iconType: 'list',
      },
    ],
    []
  );

  return (
    <>
      <EuiFlexGroup justifyContent="spaceBetween" alignItems="center" gutterSize="none">
        <EuiFlexItem grow={false}>
          <EuiTitle size="xxs">
            <h4>
              {activeView === 'json'
                ? datasetWizardStrings.settingsCustomJsonLabel()
                : datasetWizardStrings.settingsCustomFieldsLabel()}
            </h4>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonGroup
            legend={datasetWizardStrings.advancedSettingsViewToggleLegend()}
            options={toggleOptions}
            idSelected={activeView}
            onChange={handleViewChange}
            isIconOnly
            buttonSize="compressed"
            data-test-subj={`${testSubjPrefix}AdvancedSettingsViewToggle`}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      {activeView === 'json' ? (
        <DatasetSettingsCustomJsonEditor
          control={control}
          format={format}
          errorMode={errorMode}
          hideLabel
          testSubjPrefix={testSubjPrefix}
        />
      ) : (
        <DatasetSettingsFieldsLayout
          control={control}
          fields={advancedFields}
          testSubjPrefix={testSubjPrefix}
          columns={1}
        />
      )}
    </>
  );
};
