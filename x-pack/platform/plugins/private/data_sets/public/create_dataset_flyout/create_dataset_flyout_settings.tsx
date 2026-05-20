/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import {
  EuiFieldNumber,
  EuiFieldText,
  EuiFormRow,
  EuiSelect,
  EuiSpacer,
  EuiSwitch,
  EuiText,
} from '@elastic/eui';
import type { Control } from 'react-hook-form';
import { useController } from 'react-hook-form';

import { createDatasetFlyoutStrings } from './create_dataset_flyout_i18n';
import type { CreateDatasetFormValues } from './create_dataset_flyout_form_state';
import {
  DATASET_FORMAT_AUTOMATIC,
  showsDatasetFileSettings,
  validateMaxErrorRatio,
  validateMaxErrors,
} from './create_dataset_flyout_form_state';

export function CreateDatasetFlyoutSettings({
  control,
}: {
  control: Control<CreateDatasetFormValues>;
}) {
  const { field: formatField } = useController({
    name: 'settings.format',
    control,
  });

  const format = formatField.value;
  const showFileSettings = showsDatasetFileSettings(format);

  const formatOptions = useMemo(
    () => [
      {
        value: DATASET_FORMAT_AUTOMATIC,
        text: createDatasetFlyoutStrings.settingsFormatAutomatic(),
      },
      {
        value: 'parquet',
        text: createDatasetFlyoutStrings.settingsFormatParquet(),
      },
      {
        value: 'csv',
        text: createDatasetFlyoutStrings.settingsFormatCsv(),
      },
      {
        value: 'ndjson',
        text: createDatasetFlyoutStrings.settingsFormatNdjson(),
      },
      {
        value: 'orc',
        text: createDatasetFlyoutStrings.settingsFormatOrc(),
      },
    ],
    []
  );

  return (
    <>
      <EuiSpacer size="m" />
      <EuiText size="s" color="subdued" data-test-subj="createDatasetFlyoutSettingsHelp">
        {createDatasetFlyoutStrings.settingsSectionHelp()}
      </EuiText>
      <EuiSpacer size="s" />
      <EuiFormRow label={createDatasetFlyoutStrings.settingsFormatLabel()} fullWidth>
        <EuiSelect
          options={formatOptions}
          data-test-subj="createDatasetFlyoutSettingsFormat"
          fullWidth
          aria-label={createDatasetFlyoutStrings.settingsFormatLabel()}
          value={formatField.value}
          onChange={(e) => formatField.onChange(e.target.value)}
          name={formatField.name}
          inputRef={formatField.ref}
        />
      </EuiFormRow>
      {showFileSettings ? <CreateDatasetFlyoutFileSettings control={control} /> : null}
    </>
  );
}

function CreateDatasetFlyoutFileSettings({
  control,
}: {
  control: Control<CreateDatasetFormValues>;
}) {
  const { field: errorModeField } = useController({
    name: 'settings.errorMode',
    control,
  });
  const { field: maxErrorsField, fieldState: maxErrorsState } = useController({
    name: 'settings.maxErrors',
    control,
    rules: { validate: validateMaxErrors },
  });
  const { field: maxErrorRatioField, fieldState: maxErrorRatioState } = useController({
    name: 'settings.maxErrorRatio',
    control,
    rules: { validate: validateMaxErrorRatio },
  });
  const { field: partitionDetectionField } = useController({
    name: 'settings.partitionDetection',
    control,
  });
  const { field: partitionPathField } = useController({
    name: 'settings.partitionPath',
    control,
  });
  const { field: hivePartitioningField } = useController({
    name: 'settings.hivePartitioning',
    control,
  });

  const errorModeOptions = useMemo(
    () => [
      {
        value: '',
        text: createDatasetFlyoutStrings.settingsErrorModePlaceholder(),
      },
      {
        value: 'fail_fast',
        text: createDatasetFlyoutStrings.settingsErrorModeFailFast(),
      },
      {
        value: 'skip_row',
        text: createDatasetFlyoutStrings.settingsErrorModeSkipRow(),
      },
      {
        value: 'null_field',
        text: createDatasetFlyoutStrings.settingsErrorModeNullField(),
      },
    ],
    []
  );

  const partitionDetectionOptions = useMemo(
    () => [
      {
        value: '',
        text: createDatasetFlyoutStrings.settingsPartitionDetectionPlaceholder(),
      },
      {
        value: 'auto',
        text: createDatasetFlyoutStrings.settingsPartitionDetectionAuto(),
      },
      {
        value: 'hive',
        text: createDatasetFlyoutStrings.settingsPartitionDetectionHive(),
      },
      {
        value: 'template',
        text: createDatasetFlyoutStrings.settingsPartitionDetectionTemplate(),
      },
      {
        value: 'none',
        text: createDatasetFlyoutStrings.settingsPartitionDetectionNone(),
      },
    ],
    []
  );

  return (
    <>
      <EuiFormRow label={createDatasetFlyoutStrings.settingsErrorModeLabel()} fullWidth>
        <EuiSelect
          options={errorModeOptions}
          data-test-subj="createDatasetFlyoutSettingsErrorMode"
          fullWidth
          aria-label={createDatasetFlyoutStrings.settingsErrorModeLabel()}
          value={errorModeField.value}
          onChange={(e) => errorModeField.onChange(e.target.value)}
          name={errorModeField.name}
          inputRef={errorModeField.ref}
        />
      </EuiFormRow>
      <EuiFormRow
        label={createDatasetFlyoutStrings.settingsMaxErrorsLabel()}
        helpText={createDatasetFlyoutStrings.settingsMaxErrorsHelp()}
        fullWidth
        isInvalid={Boolean(maxErrorsState.error)}
        error={maxErrorsState.error?.message}
      >
        <EuiFieldNumber
          data-test-subj="createDatasetFlyoutSettingsMaxErrors"
          fullWidth
          min={0}
          step={1}
          isInvalid={Boolean(maxErrorsState.error)}
          value={maxErrorsField.value === '' ? undefined : Number(maxErrorsField.value)}
          onChange={(e) =>
            maxErrorsField.onChange(
              e.target.value === undefined ? '' : String(e.target.value)
            )
          }
          name={maxErrorsField.name}
          inputRef={maxErrorsField.ref}
        />
      </EuiFormRow>
      <EuiFormRow
        label={createDatasetFlyoutStrings.settingsMaxErrorRatioLabel()}
        helpText={createDatasetFlyoutStrings.settingsMaxErrorRatioHelp()}
        fullWidth
        isInvalid={Boolean(maxErrorRatioState.error)}
        error={maxErrorRatioState.error?.message}
      >
        <EuiFieldNumber
          data-test-subj="createDatasetFlyoutSettingsMaxErrorRatio"
          fullWidth
          min={0}
          max={1}
          step={0.01}
          isInvalid={Boolean(maxErrorRatioState.error)}
          value={
            maxErrorRatioField.value === '' ? undefined : Number(maxErrorRatioField.value)
          }
          onChange={(e) =>
            maxErrorRatioField.onChange(
              e.target.value === undefined ? '' : String(e.target.value)
            )
          }
          name={maxErrorRatioField.name}
          inputRef={maxErrorRatioField.ref}
        />
      </EuiFormRow>
      <EuiFormRow label={createDatasetFlyoutStrings.settingsPartitionDetectionLabel()} fullWidth>
        <EuiSelect
          options={partitionDetectionOptions}
          data-test-subj="createDatasetFlyoutSettingsPartitionDetection"
          fullWidth
          aria-label={createDatasetFlyoutStrings.settingsPartitionDetectionLabel()}
          value={partitionDetectionField.value}
          onChange={(e) => partitionDetectionField.onChange(e.target.value)}
          name={partitionDetectionField.name}
          inputRef={partitionDetectionField.ref}
        />
      </EuiFormRow>
      <EuiFormRow
        label={createDatasetFlyoutStrings.settingsPartitionPathLabel()}
        helpText={createDatasetFlyoutStrings.settingsPartitionPathHelp()}
        fullWidth
      >
        <EuiFieldText
          data-test-subj="createDatasetFlyoutSettingsPartitionPath"
          fullWidth
          autoComplete="off"
          value={partitionPathField.value}
          onChange={(e) => partitionPathField.onChange(e.target.value)}
          name={partitionPathField.name}
          inputRef={partitionPathField.ref}
        />
      </EuiFormRow>
      <EuiFormRow
        label={createDatasetFlyoutStrings.settingsHivePartitioningLabel()}
        fullWidth
      >
        <EuiSwitch
          data-test-subj="createDatasetFlyoutSettingsHivePartitioning"
          label={createDatasetFlyoutStrings.settingsHivePartitioningLabel()}
          showLabel={false}
          checked={hivePartitioningField.value}
          onChange={(e) => hivePartitioningField.onChange(e.target.checked)}
          name={hivePartitioningField.name}
          inputRef={hivePartitioningField.ref}
        />
      </EuiFormRow>
    </>
  );
}
