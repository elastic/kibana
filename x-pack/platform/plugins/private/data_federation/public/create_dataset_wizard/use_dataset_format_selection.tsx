/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MutableRefObject } from 'react';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { EuiSuperSelectProps } from '@elastic/eui';
import type { Control, UseFormGetValues, UseFormSetValue } from 'react-hook-form';
import { useController, useWatch } from 'react-hook-form';

import { applySettingsForFormat } from '../create_dataset_flyout/dataset_settings_defaults';
import type {
  DatasetErrorModeFormValue,
  DatasetFormatFormValue,
} from '../create_dataset_flyout/create_dataset_flyout_form_state';
import { emptyCreateDatasetSettingsFormValues } from '../create_dataset_flyout/create_dataset_flyout_form_state';
import { createDatasetFlyoutStrings } from '../create_dataset_flyout/create_dataset_flyout_i18n';
import type { DatasetSettingsFieldId } from '../create_dataset_flyout/dataset_settings_visibility';
import { FORMAT_SUPER_SELECT_OPTIONS } from '../create_dataset_flyout/dataset_settings_options';
import { buildDefaultSettingsCustomJson } from '../create_dataset_flyout/settings_custom_json_schema';
import { EMPTY_SETTINGS_CUSTOM_JSON } from '../create_dataset_flyout/settings_custom_json_utils';
import { AutoDetectedSuffix } from './auto_detected_suffix';
import {
  DATASET_WIZARD_FLOW_VARIANT_1,
  isDatasetWizardFlow3,
  isDatasetWizardFlow396,
  type DatasetWizardFlowVariant,
} from './dataset_wizard_flow_variant';
import type { DatasetWizardFormValues } from './dataset_wizard_form_state';
import { datasetWizardStrings } from './dataset_wizard_i18n';
import { inferFormatFromResource } from './infer_format_from_resource';
import { keepResourceOwnedSettings } from './resource_settings_fields';

const FORMAT_VALUES: DatasetFormatFormValue[] = ['csv', 'tsv', 'parquet', 'ndjson', 'orc'];

export const isKnownDatasetFormat = (
  value: string
): value is Exclude<DatasetFormatFormValue, ''> =>
  FORMAT_VALUES.includes(value as Exclude<DatasetFormatFormValue, ''>);

type FormatSelectionSource = 'none' | 'auto' | 'manual';

export type DatasetFormatSyncMode = 'resource-change' | 'resource-blur';

export interface UseDatasetFormatSelectionParams {
  control: Control<DatasetWizardFormValues>;
  getValues: UseFormGetValues<DatasetWizardFormValues>;
  setValue: UseFormSetValue<DatasetWizardFormValues>;
  resource: string;
  flowVariant: DatasetWizardFlowVariant;
  isEditMode: boolean;
  resourceSettingsFieldIds: readonly DatasetSettingsFieldId[];
  syncedResourceRef: MutableRefObject<string | null>;
  syncMode: DatasetFormatSyncMode;
  requireFormat?: boolean;
  enabled?: boolean;
}

export const useDatasetFormatSelection = ({
  control,
  getValues,
  setValue,
  resource,
  flowVariant,
  isEditMode,
  resourceSettingsFieldIds,
  syncedResourceRef,
  syncMode,
  requireFormat = false,
  enabled = true,
}: UseDatasetFormatSelectionParams) => {
  const [autoDetectedFormat, setAutoDetectedFormat] = useState<DatasetFormatFormValue | ''>('');
  const [formatSelectionSource, setFormatSelectionSource] = useState<FormatSelectionSource>('none');
  const showDefaultsAsPlaceholders = isDatasetWizardFlow396(flowVariant);

  const { field: formatField, fieldState: formatFieldState } = useController({
    name: 'settings.format',
    control,
    rules:
      enabled && requireFormat
        ? {
            validate: (value) =>
              isKnownDatasetFormat(String(value ?? ''))
                ? true
                : createDatasetFlyoutStrings.settingsFormatRequired(),
          }
        : undefined,
  });

  const format = formatField.value as DatasetFormatFormValue;
  const hasFormatSelected = isKnownDatasetFormat(format);
  const errorMode = useWatch({ control, name: 'settings.error_mode' }) as DatasetErrorModeFormValue;
  const previousErrorModeRef = useRef<DatasetErrorModeFormValue | undefined>(undefined);
  const initialResourceRef = useRef(resource);

  const setDefaultCustomJson = useCallback(
    (
      nextFormat: Exclude<DatasetFormatFormValue, ''>,
      nextErrorMode: DatasetErrorModeFormValue = ''
    ) => {
      setValue('settings_custom_json', buildDefaultSettingsCustomJson(nextFormat, nextErrorMode), {
        shouldDirty: true,
        shouldValidate: true,
      });
    },
    [setValue]
  );

  const applyFormatDefaultsToForm = useCallback(
    (nextFormat: Exclude<DatasetFormatFormValue, ''>) => {
      const currentSettings = getValues('settings');
      const withDefaults = keepResourceOwnedSettings(
        applySettingsForFormat(currentSettings, nextFormat, {
          applyDefaults: !showDefaultsAsPlaceholders,
        }),
        currentSettings,
        resourceSettingsFieldIds
      );
      setValue('settings', withDefaults, { shouldDirty: true, shouldValidate: true });

      // Seeding the JSON with defaults would write them straight back into the
      // fields the placeholders are meant to leave empty.
      if (isDatasetWizardFlow3(flowVariant) && !showDefaultsAsPlaceholders) {
        setDefaultCustomJson(nextFormat, withDefaults.error_mode);
        previousErrorModeRef.current = withDefaults.error_mode;
      }
    },
    [
      flowVariant,
      getValues,
      resourceSettingsFieldIds,
      setDefaultCustomJson,
      setValue,
      showDefaultsAsPlaceholders,
    ]
  );

  const handleFormatSelection = useCallback(
    (nextFormat: Exclude<DatasetFormatFormValue, ''>, source: FormatSelectionSource) => {
      applyFormatDefaultsToForm(nextFormat);
      setFormatSelectionSource(source);
      if (source === 'auto') {
        setAutoDetectedFormat(nextFormat);
      } else if (nextFormat !== autoDetectedFormat) {
        setAutoDetectedFormat('');
      }
    },
    [applyFormatDefaultsToForm, autoDetectedFormat]
  );

  const syncFormatFromResource = useCallback(() => {
    const inferredFormat = inferFormatFromResource(resource);
    const resourceChanged = syncedResourceRef.current !== resource;

    if (!resourceChanged) {
      if (!isKnownDatasetFormat(formatField.value)) {
        return;
      }

      if (formatSelectionSource !== 'none') {
        return;
      }

      if (inferredFormat && formatField.value === inferredFormat) {
        setAutoDetectedFormat(inferredFormat);
        setFormatSelectionSource('auto');
      } else {
        setFormatSelectionSource('manual');
      }
      return;
    }

    syncedResourceRef.current = resource;

    if (inferredFormat) {
      handleFormatSelection(inferredFormat, 'auto');
      return;
    }

    if (isEditMode && isKnownDatasetFormat(formatField.value)) {
      setFormatSelectionSource('manual');
      return;
    }

    setValue(
      'settings',
      keepResourceOwnedSettings(
        emptyCreateDatasetSettingsFormValues(),
        getValues('settings'),
        resourceSettingsFieldIds
      ),
      {
        shouldDirty: true,
        shouldValidate: true,
      }
    );
    if (isDatasetWizardFlow3(flowVariant)) {
      setValue('settings_custom_json', EMPTY_SETTINGS_CUSTOM_JSON, {
        shouldDirty: true,
        shouldValidate: true,
      });
    }
    setAutoDetectedFormat('');
    setFormatSelectionSource('none');
  }, [
    flowVariant,
    formatField.value,
    formatSelectionSource,
    getValues,
    handleFormatSelection,
    isEditMode,
    resource,
    resourceSettingsFieldIds,
    setValue,
    syncedResourceRef,
  ]);

  useEffect(() => {
    if (!enabled || !isDatasetWizardFlow3(flowVariant) || showDefaultsAsPlaceholders || !hasFormatSelected) {
      previousErrorModeRef.current = errorMode;
      return;
    }

    if (previousErrorModeRef.current === undefined) {
      previousErrorModeRef.current = errorMode;
      return;
    }

    if (previousErrorModeRef.current === errorMode) {
      return;
    }

    previousErrorModeRef.current = errorMode;
    setDefaultCustomJson(format, errorMode);
  }, [
    errorMode,
    flowVariant,
    format,
    hasFormatSelected,
    setDefaultCustomJson,
    showDefaultsAsPlaceholders,
    enabled,
  ]);

  useEffect(() => {
    if (!enabled || syncMode !== 'resource-blur' || !initialResourceRef.current.trim()) {
      return;
    }

    syncFormatFromResource();
    // Reconcile restored drafts when logistics mounts before the first blur.
  }, [enabled, syncFormatFromResource, syncMode]);

  useEffect(() => {
    if (!enabled || syncMode !== 'resource-change') {
      return;
    }

    syncFormatFromResource();
  }, [enabled, syncFormatFromResource, syncMode]);

  const formatSuperSelectOptions = useMemo<EuiSuperSelectProps['options']>(() => {
    const autoDetectedSuffix =
      flowVariant === DATASET_WIZARD_FLOW_VARIANT_1
        ? ` ${datasetWizardStrings.formatAutoDetectedSuffix()}`
        : null;

    return FORMAT_SUPER_SELECT_OPTIONS().map((option) => {
      const isSelectedAutoDetected = option.value === format && option.value === autoDetectedFormat;

      if (!isSelectedAutoDetected) {
        return option;
      }

      return {
        ...option,
        inputDisplay: (
          <>
            {option.inputDisplay}{' '}
            {flowVariant === DATASET_WIZARD_FLOW_VARIANT_1 ? (
              autoDetectedSuffix
            ) : (
              <AutoDetectedSuffix />
            )}
          </>
        ),
      };
    });
  }, [autoDetectedFormat, flowVariant, format]);

  return {
    formatField,
    formatFieldState,
    format,
    hasFormatSelected,
    formatSuperSelectOptions,
    handleFormatSelection,
    syncFormatFromResource,
    autoDetectedFormat,
  };
};
