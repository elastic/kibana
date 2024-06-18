/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiFormRow,
  EuiText,
  EuiTextArea,
  EuiFieldText,
  EuiFlexItem,
  EuiFlexGroup,
  EuiLink,
} from '@elastic/eui';

import { css } from '@emotion/react';

import * as i18n from './translations';
import { DatasetToggleButton } from './data_set_toggle_button';
import { RunDetailsSettings } from './use_run_details';
import { DataSetSettings } from './use_dataset';
import { TraceOptionsSettings } from './use_trace_options';

/**
 * Evaluation Settings -- development-only feature for evaluating models
 */
interface Props {
  runDetailsSettings: RunDetailsSettings;
  datasetSettings: DataSetSettings;
  traceOptionsSettings: TraceOptionsSettings;
}

export const RunDetailsEditor: React.FC<Props> = React.memo(
  ({ runDetailsSettings, datasetSettings, traceOptionsSettings }) => {
    const {
      projectName,
      onProjectNameChange,
      runName,
      onRunNameChange,
      outputIndex,
      onOutputIndexChange,
    } = runDetailsSettings;

    const {
      onUseLangSmith,
      onUseCustom,
      useLangSmithDataset,
      datasetName,
      onDatasetNameChange,
      datasetText,
      onDatasetTextChange,
    } = datasetSettings;

    const {
      showTraceOptions,
      setShowTraceOptions,
      traceOptions,
      onApmUrlChange,
      onLangSmithProjectChange,
      onLangSmithApiKeyChange,
    } = traceOptionsSettings;

    return (
      <>
        <EuiFlexGroup>
          <EuiFlexItem>
            <EuiFormRow
              display="rowCompressed"
              label={i18n.PROJECT_LABEL}
              helpText={i18n.PROJECT_DESCRIPTION}
            >
              <EuiFieldText
                aria-label="project-textfield"
                compressed
                onChange={onProjectNameChange}
                placeholder={i18n.PROJECT_PLACEHOLDER}
                value={projectName}
              />
            </EuiFormRow>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiFormRow
              display="rowCompressed"
              label={i18n.RUN_NAME_LABEL}
              helpText={i18n.RUN_NAME_DESCRIPTION}
            >
              <EuiFieldText
                aria-label="run-name-textfield"
                compressed
                onChange={onRunNameChange}
                placeholder={i18n.RUN_NAME_PLACEHOLDER}
                value={runName}
              />
            </EuiFormRow>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiFormRow
          display="rowCompressed"
          label={
            <DatasetToggleButton
              useLangSmithDataset={useLangSmithDataset}
              onUseLangSmith={onUseLangSmith}
              onUseCustom={onUseCustom}
            />
          }
          fullWidth
          helpText={
            useLangSmithDataset
              ? i18n.LANGSMITH_DATASET_DESCRIPTION
              : i18n.CUSTOM_DATASET_DESCRIPTION
          }
        >
          {useLangSmithDataset ? (
            <EuiFieldText
              aria-label="dataset-name-textfield"
              compressed
              onChange={onDatasetNameChange}
              placeholder={i18n.LANGSMITH_DATASET_PLACEHOLDER}
              value={datasetName}
            />
          ) : (
            <EuiTextArea
              aria-label={'evaluation-dataset-textarea'}
              compressed
              css={css`
                min-height: 300px;
              `}
              fullWidth
              onChange={onDatasetTextChange}
              value={datasetText}
            />
          )}
        </EuiFormRow>
        <EuiFormRow
          display="rowCompressed"
          label={i18n.EVALUATOR_OUTPUT_INDEX_LABEL}
          fullWidth
          helpText={i18n.EVALUATOR_OUTPUT_INDEX_DESCRIPTION}
        >
          <EuiFieldText
            value={outputIndex}
            onChange={onOutputIndexChange}
            aria-label="evaluation-output-index-textfield"
          />
        </EuiFormRow>
        <EuiText
          size={'xs'}
          css={css`
            margin-top: 16px;
          `}
        >
          <EuiLink color={'primary'} onClick={() => setShowTraceOptions(!showTraceOptions)}>
            {i18n.SHOW_TRACE_OPTIONS}
          </EuiLink>
        </EuiText>
        {showTraceOptions && (
          <>
            <EuiFormRow
              display="rowCompressed"
              label={i18n.APM_URL_LABEL}
              fullWidth
              helpText={i18n.APM_URL_DESCRIPTION}
              css={css`
                margin-top: 16px;
              `}
            >
              <EuiFieldText
                value={traceOptions.apmUrl}
                onChange={onApmUrlChange}
                aria-label="apm-url-textfield"
              />
            </EuiFormRow>
            <EuiFormRow
              display="rowCompressed"
              label={i18n.LANGSMITH_PROJECT_LABEL}
              fullWidth
              helpText={i18n.LANGSMITH_PROJECT_DESCRIPTION}
            >
              <EuiFieldText
                value={traceOptions.langSmithProject}
                onChange={onLangSmithProjectChange}
                aria-label="langsmith-project-textfield"
              />
            </EuiFormRow>
            <EuiFormRow
              display="rowCompressed"
              label={i18n.LANGSMITH_API_KEY_LABEL}
              fullWidth
              helpText={i18n.LANGSMITH_API_KEY_DESCRIPTION}
            >
              <EuiFieldText
                value={traceOptions.langSmithApiKey}
                onChange={onLangSmithApiKeyChange}
                aria-label="langsmith-api-key-textfield"
              />
            </EuiFormRow>
          </>
        )}
      </>
    );
  }
);

RunDetailsEditor.displayName = 'RunDetailsEditor';
