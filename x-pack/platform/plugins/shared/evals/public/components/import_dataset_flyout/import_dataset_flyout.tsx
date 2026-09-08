/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useReducer, useState } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiStepsHorizontal,
  EuiTitle,
} from '@elastic/eui';
import { getErrorMessage } from '../../utils/get_error_message';
import { useCreateDataset, useDatasets, useImportExamples } from '../../hooks/use_evals_api';
import { applyMapping, chunkExamples, parseCsv, parseJsonl, suggestMapping } from './lib';
import { FileStep } from './file_step';
import { MapStep } from './map_step';
import {
  canAdvance,
  createInitialState,
  importWizardReducer,
  type ImportFileFormat,
  type ImportWizardStep,
} from './reducer';
import { ResultStep } from './result_step';
import * as translations from './translations';
import { ValidateStep } from './validate_step';

const MAX_FILE_SIZE = 50 * 1024 * 1024;

const detectFormat = (fileName: string): ImportFileFormat | undefined => {
  const normalizedName = fileName.toLowerCase();
  if (normalizedName.endsWith('.csv')) {
    return 'csv';
  }
  if (normalizedName.endsWith('.jsonl') || normalizedName.endsWith('.ndjson')) {
    return 'jsonl';
  }
};

const parseFile = (contents: string, format: ImportFileFormat) =>
  format === 'csv' ? parseCsv(contents) : parseJsonl(contents);

const getStepStatus = (step: ImportWizardStep, currentStep: ImportWizardStep) => {
  const order: ImportWizardStep[] = ['file', 'map', 'validate', 'result'];
  const stepIndex = order.indexOf(step);
  const currentIndex = order.indexOf(currentStep);
  if (stepIndex < currentIndex) {
    return 'complete' as const;
  }
  if (stepIndex === currentIndex) {
    return 'current' as const;
  }
  return 'incomplete' as const;
};

export interface ImportDatasetFlyoutProps {
  onClose: () => void;
  initialDatasetId?: string;
}

export const ImportDatasetFlyout = ({ onClose, initialDatasetId }: ImportDatasetFlyoutProps) => {
  const [state, dispatch] = useReducer(importWizardReducer, initialDatasetId, createInitialState);
  const [fileError, setFileError] = useState<string>();
  const { data: datasetsResponse, isLoading: isLoadingDatasets } = useDatasets({
    page: 1,
    perPage: 1000,
  });
  const createDataset = useCreateDataset();
  const importExamples = useImportExamples();

  const steps = useMemo(
    () => [
      {
        title: translations.FILE_STEP_TITLE,
        status: getStepStatus('file', state.step),
        onClick: () => {},
      },
      {
        title: translations.MAP_STEP_TITLE,
        status: getStepStatus('map', state.step),
        onClick: () => {},
      },
      {
        title: translations.VALIDATE_STEP_TITLE,
        status: getStepStatus('validate', state.step),
        onClick: () => {},
      },
      {
        title: translations.RESULT_STEP_TITLE,
        status: getStepStatus('result', state.step),
        onClick: () => {},
      },
    ],
    [state.step]
  );

  const onFileChange = async (fileList: FileList | null) => {
    const file = fileList?.item(0);
    setFileError(undefined);
    if (!file) {
      dispatch({ type: 'clearFile' });
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      dispatch({ type: 'clearFile' });
      setFileError(translations.FILE_TOO_LARGE_ERROR);
      return;
    }

    const format = detectFormat(file.name);
    if (!format) {
      dispatch({ type: 'clearFile' });
      setFileError(translations.UNSUPPORTED_FILE_ERROR);
      return;
    }

    try {
      const contents = await file.text();
      const preview = parseFile(contents, format);
      if (preview.columns.length === 0 || preview.rows.length === 0) {
        dispatch({ type: 'clearFile' });
        setFileError(translations.EMPTY_FILE_ERROR);
        return;
      }
      dispatch({
        type: 'selectFile',
        file: { name: file.name, size: file.size, contents, format },
        preview,
        mapping: suggestMapping(preview.columns),
      });
    } catch {
      dispatch({ type: 'clearFile' });
      setFileError(translations.READ_FILE_ERROR);
    }
  };

  const validateFile = () => {
    if (!state.file || !canAdvance(state)) {
      return;
    }

    const parsed = parseFile(state.file.contents, state.file.format);
    const mapped = applyMapping(parsed.rows, state.mapping);
    dispatch({
      type: 'validationReady',
      examples: mapped.examples,
      errors: [...parsed.errors, ...mapped.errors].sort(
        (first, second) => first.rowNumber - second.rowNumber
      ),
    });
  };

  const runImport = async () => {
    if (!canAdvance(state)) {
      return;
    }

    dispatch({ type: 'importStarted' });
    let datasetId = state.datasetId;
    let added = 0;
    let skippedDuplicates = 0;
    let failed = 0;
    const errors: string[] = [];

    try {
      if (state.datasetMode === 'new') {
        const response = await createDataset.mutateAsync({
          name: state.newDatasetName.trim(),
          description: state.newDatasetDescription,
        });
        datasetId = response.dataset_id;
      }

      for (const examples of chunkExamples(state.examples)) {
        try {
          const response = await importExamples.mutateAsync({ datasetId, body: { examples } });
          added += response.added;
          skippedDuplicates += response.skipped_duplicates;
        } catch (error) {
          failed += examples.length;
          errors.push(getErrorMessage(error));
        }
      }
    } catch (error) {
      failed = state.examples.length;
      errors.push(getErrorMessage(error));
    }

    dispatch({
      type: 'importFinished',
      result: { added, skippedDuplicates, failed, errors },
    });
  };

  const primaryButton = (() => {
    if (state.step === 'result') {
      return (
        <EuiButton fill onClick={onClose}>
          {translations.CLOSE_BUTTON_LABEL}
        </EuiButton>
      );
    }
    if (state.step === 'validate') {
      return (
        <EuiButton
          fill
          isLoading={state.isImporting}
          disabled={!canAdvance(state)}
          onClick={runImport}
        >
          {translations.getImportButtonLabel(state.examples.length)}
        </EuiButton>
      );
    }
    return (
      <EuiButton
        fill
        disabled={!canAdvance(state)}
        onClick={() => {
          if (state.step === 'file') {
            dispatch({ type: 'next' });
          } else {
            validateFile();
          }
        }}
      >
        {translations.NEXT_BUTTON_LABEL}
      </EuiButton>
    );
  })();

  return (
    <EuiFlyout
      ownFocus
      size="m"
      onClose={() => {
        if (!state.isImporting) {
          onClose();
        }
      }}
      aria-labelledby="evalsImportDatasetFlyoutTitle"
    >
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2 id="evalsImportDatasetFlyoutTitle">{translations.FLYOUT_TITLE}</h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <EuiStepsHorizontal size="s" steps={steps} />
        <EuiSpacer size="l" />

        {state.step === 'file' ? (
          <FileStep
            datasetMode={state.datasetMode}
            datasetId={state.datasetId}
            newDatasetName={state.newDatasetName}
            newDatasetDescription={state.newDatasetDescription}
            datasets={datasetsResponse?.datasets ?? []}
            isLoadingDatasets={isLoadingDatasets}
            fileError={fileError}
            onDatasetModeChange={(mode) => dispatch({ type: 'setDatasetMode', mode })}
            onDatasetIdChange={(datasetId) => dispatch({ type: 'setDatasetId', datasetId })}
            onNewDatasetNameChange={(name) => dispatch({ type: 'setNewDatasetName', name })}
            onNewDatasetDescriptionChange={(description) =>
              dispatch({ type: 'setNewDatasetDescription', description })
            }
            onFileChange={onFileChange}
          />
        ) : null}
        {state.step === 'map' ? (
          <MapStep
            columns={state.columns}
            rows={state.previewRows}
            mapping={state.mapping}
            onMappingChange={(column, destination) =>
              dispatch({ type: 'setMapping', column, destination })
            }
          />
        ) : null}
        {state.step === 'validate' ? (
          <ValidateStep validCount={state.examples.length} errors={state.validationErrors} />
        ) : null}
        {state.step === 'result' && state.result ? <ResultStep result={state.result} /> : null}
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            {state.step === 'result' ? null : (
              <EuiButtonEmpty disabled={state.isImporting} onClick={onClose}>
                {translations.CANCEL_BUTTON_LABEL}
              </EuiButtonEmpty>
            )}
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup responsive={false} gutterSize="s">
              {state.step === 'map' || state.step === 'validate' ? (
                <EuiFlexItem grow={false}>
                  <EuiButtonEmpty
                    disabled={state.isImporting}
                    onClick={() => dispatch({ type: 'back' })}
                  >
                    {translations.BACK_BUTTON_LABEL}
                  </EuiButtonEmpty>
                </EuiFlexItem>
              ) : null}
              <EuiFlexItem grow={false}>{primaryButton}</EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};
