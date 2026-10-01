/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import {
  EuiComboBox,
  EuiFieldText,
  EuiFilePicker,
  EuiFormRow,
  EuiRadioGroup,
  EuiSpacer,
  EuiTextArea,
  type EuiComboBoxOptionOption,
} from '@elastic/eui';
import { MAX_DATASET_DESCRIPTION_LENGTH, MAX_DATASET_NAME_LENGTH } from '@kbn/evals-common';
import type { ImportDatasetOption } from './lib';
import type { ImportDatasetMode } from './reducer';
import * as translations from './translations';

interface FileStepProps {
  datasetMode: ImportDatasetMode;
  datasetId: string;
  newDatasetName: string;
  newDatasetDescription: string;
  datasets: ImportDatasetOption[];
  isLoadingDatasets: boolean;
  isReadingFile: boolean;
  fileErrors?: string[];
  onDatasetModeChange: (mode: ImportDatasetMode) => void;
  onDatasetIdChange: (datasetId: string) => void;
  onNewDatasetNameChange: (name: string) => void;
  onNewDatasetDescriptionChange: (description: string) => void;
  onFileChange: (fileList: FileList | null) => void;
}

export const FileStep = ({
  datasetMode,
  datasetId,
  newDatasetName,
  newDatasetDescription,
  datasets,
  isLoadingDatasets,
  isReadingFile,
  fileErrors,
  onDatasetModeChange,
  onDatasetIdChange,
  onNewDatasetNameChange,
  onNewDatasetDescriptionChange,
  onFileChange,
}: FileStepProps) => {
  const datasetOptions = useMemo<Array<EuiComboBoxOptionOption<string>>>(
    () => datasets.map(({ id, name }) => ({ label: name, value: id })),
    [datasets]
  );
  const selectedOptions = useMemo(
    () => datasetOptions.filter(({ value }) => value === datasetId),
    [datasetId, datasetOptions]
  );

  return (
    <>
      <EuiFormRow label={translations.DESTINATION_LABEL}>
        <EuiRadioGroup
          name="evalsImportDatasetDestination"
          idSelected={datasetMode}
          options={[
            { id: 'existing', label: translations.EXISTING_DATASET_OPTION_LABEL },
            { id: 'new', label: translations.NEW_DATASET_OPTION_LABEL },
          ]}
          onChange={(id) => onDatasetModeChange(id as ImportDatasetMode)}
        />
      </EuiFormRow>

      {datasetMode === 'existing' ? (
        <EuiFormRow label={translations.DATASET_LABEL} fullWidth>
          <EuiComboBox
            fullWidth
            isLoading={isLoadingDatasets}
            options={datasetOptions}
            selectedOptions={selectedOptions}
            singleSelection={{ asPlainText: true }}
            placeholder={translations.DATASET_PLACEHOLDER}
            onChange={(options) => onDatasetIdChange(options[0]?.value ?? '')}
          />
        </EuiFormRow>
      ) : (
        <>
          <EuiFormRow label={translations.NEW_DATASET_NAME_LABEL} fullWidth>
            <EuiFieldText
              fullWidth
              maxLength={MAX_DATASET_NAME_LENGTH}
              value={newDatasetName}
              onChange={(event) => onNewDatasetNameChange(event.target.value)}
            />
          </EuiFormRow>
          <EuiFormRow label={translations.NEW_DATASET_DESCRIPTION_LABEL} fullWidth>
            <EuiTextArea
              fullWidth
              maxLength={MAX_DATASET_DESCRIPTION_LENGTH}
              value={newDatasetDescription}
              onChange={(event) => onNewDatasetDescriptionChange(event.target.value)}
            />
          </EuiFormRow>
        </>
      )}

      <EuiSpacer size="m" />
      <EuiFormRow
        label={translations.FILE_LABEL}
        isInvalid={fileErrors !== undefined}
        error={fileErrors}
        fullWidth
      >
        <EuiFilePicker
          accept=".csv,.jsonl,.ndjson"
          initialPromptText={translations.FILE_PICKER_PROMPT}
          isInvalid={fileErrors !== undefined}
          isLoading={isReadingFile}
          onChange={onFileChange}
          fullWidth
        />
      </EuiFormRow>
    </>
  );
};
