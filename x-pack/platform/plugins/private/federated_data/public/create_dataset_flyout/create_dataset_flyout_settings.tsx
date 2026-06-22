/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import { EuiButtonEmpty, EuiFormRow, EuiSelect, EuiSpacer, useGeneratedHtmlId } from '@elastic/eui';
import type { Control } from 'react-hook-form';
import { useController } from 'react-hook-form';

import { createDatasetFlyoutStrings } from './create_dataset_flyout_i18n';
import type { CreateDatasetFormValues } from './create_dataset_flyout_form_state';

export function CreateDatasetFlyoutSettings({
  control,
}: {
  control: Control<CreateDatasetFormValues>;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const contentId = useGeneratedHtmlId({ prefix: 'createDatasetFlyoutOptionalSettings' });

  return (
    <>
      <EuiSpacer size="m" />
      <EuiButtonEmpty
        size="s"
        flush="left"
        iconType={isOpen ? 'arrowDown' : 'arrowRight'}
        aria-expanded={isOpen}
        aria-controls={contentId}
        onClick={() => setIsOpen((value) => !value)}
        data-test-subj="createDatasetFlyoutOptionalSettingsToggle"
      >
        {isOpen
          ? createDatasetFlyoutStrings.optionalSettingsHide()
          : createDatasetFlyoutStrings.optionalSettingsShow()}
      </EuiButtonEmpty>
      <div id={contentId} hidden={!isOpen}>
        <EuiSpacer size="s" />
        <CreateDatasetFlyoutFileSettings control={control} />
      </div>
    </>
  );
}

function CreateDatasetFlyoutFileSettings({
  control,
}: {
  control: Control<CreateDatasetFormValues>;
}) {
  const { field: errorModeField } = useController({
    name: 'settings.error_mode',
    control,
  });

  const { field: partitionDetectionField } = useController({
    name: 'settings.partition_detection',
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
    </>
  );
}
