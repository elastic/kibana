/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import {
  EuiAccordion,
  EuiFormRow,
  EuiTitle,
  EuiText,
  EuiHorizontalRule,
  EuiSpacer,
  EuiComboBox,
  EuiButton,
  EuiTextArea,
  EuiFlexItem,
  EuiFlexGroup,
  EuiLink,
} from '@elastic/eui';

import { css } from '@emotion/react';
import { FormattedMessage } from '@kbn/i18n-react';
import type { PostEvaluateResponse } from '@kbn/elastic-assistant-common';
import { useAssistantContext } from '../../../assistant_context';
import { useLoadConnectors } from '../../../connectorland/use_load_connectors';

import { usePerformEvaluation } from '../../api/evaluate/use_perform_evaluation';
import { getApmLink, getDiscoverLink } from '../evaluation_settings/utils';
import { useEvaluationDetails } from '../evaluation_settings/evaluation_details/use_evaluation_details';
import { useRunDetails } from '../evaluation_settings/run_details/use_run_details';
import { useTraceOptions } from '../evaluation_settings/run_details/use_trace_options';
import { useDataset } from '../evaluation_settings/run_details/use_dataset';
import { usePredictionsDetails } from '../evaluation_settings/prediction_details/use_predictions_details';
import * as i18n from '../evaluation_settings/translations';
import { RunDetailsEditor } from '../evaluation_settings/run_details';
import { PredictionDetails } from '../evaluation_settings/prediction_details';
import {
  EVALUATION_DETAILS_TITLE,
  PREDICTION_DETAILS_TITLE,
  RUN_DETAILS_TITLE,
} from './translations';

const getSection = (title: string, description?: string) => (
  <>
    <EuiTitle size={'s'}>
      <h2>{title}</h2>
    </EuiTitle>
    <EuiSpacer size="xs" />
    {description && <EuiText size={'s'}>{description}</EuiText>}
    <EuiSpacer size="xs" />
  </>
);

export const EvaluationSettingsManagement: React.FC = React.memo(() => {
  const { actionTypeRegistry, basePath, http, setTraceOptions, traceOptions } =
    useAssistantContext();
  const { data: connectors } = useLoadConnectors({ http });
  const {
    data: evalResponse,
    mutate: performEvaluation,
    isLoading: isPerformingEvaluation,
  } = usePerformEvaluation({
    http,
  });

  // Run Details
  const runDetailsSettings = useRunDetails();
  /** Trace Options **/
  const tracedOptionsSettings = useTraceOptions({ setTraceOptions, traceOptions });
  /** Dataset **/
  const datasetSettings = useDataset();
  // Predictions
  const predictionsSettings = usePredictionsDetails({
    http,
    connectors,
    actionTypeRegistry,
  });

  const {
    selectedEvaluationType,
    onEvaluationTypeChange,
    onEvaluationTypeOptionsCreate,
    evaluationTypeOptions,
    selectedEvaluatorModelOptions,
    onEvaluatorModelOptionsChange,
    evalPrompt,
    onEvalPromptChange,
  } = useEvaluationDetails();

  // Required fields by eval API
  const isPerformEvaluationDisabled =
    predictionsSettings.selectedModelOptions.length === 0 ||
    predictionsSettings.selectedAgentOptions.length === 0 ||
    runDetailsSettings.outputIndex.length === 0;

  // Perform Evaluation Button
  const handlePerformEvaluation = useCallback(async () => {
    const evalParams = {
      models: predictionsSettings.selectedModelOptions.flatMap((option) => option.key ?? []),
      agents: predictionsSettings.selectedAgentOptions.map((option) => option.label),
      dataset: datasetSettings.useLangSmithDataset ? undefined : datasetSettings.datasetText,
      datasetName: datasetSettings.useLangSmithDataset ? datasetSettings.datasetName : undefined,
      evalModel: selectedEvaluatorModelOptions.flatMap((option) => option.key ?? []),
      evalPrompt,
      evaluationType: selectedEvaluationType.map((option) => option.label),
      outputIndex: runDetailsSettings.outputIndex,
      projectName: runDetailsSettings.projectName,
      runName: runDetailsSettings.runName,
    };
    performEvaluation(evalParams);
  }, [
    datasetSettings.datasetName,
    datasetSettings.datasetText,
    datasetSettings.useLangSmithDataset,
    evalPrompt,
    performEvaluation,
    predictionsSettings.selectedAgentOptions,
    predictionsSettings.selectedModelOptions,
    runDetailsSettings.outputIndex,
    runDetailsSettings.projectName,
    runDetailsSettings.runName,
    selectedEvaluationType,
    selectedEvaluatorModelOptions,
  ]);

  const discoverLink = useMemo(
    () => getDiscoverLink(basePath, (evalResponse as PostEvaluateResponse)?.evaluationId ?? ''),
    [basePath, evalResponse]
  );

  const apmLink = useMemo(
    () => getApmLink(basePath, (evalResponse as PostEvaluateResponse)?.evaluationId ?? ''),
    [basePath, evalResponse]
  );

  const runDetailsSection = useMemo(
    () => getSection(RUN_DETAILS_TITLE, i18n.RUN_DETAILS_DESCRIPTION),
    []
  );
  const predictionDetailsSection = useMemo(
    () => getSection(PREDICTION_DETAILS_TITLE, i18n.PREDICTION_DETAILS_DESCRIPTION),
    []
  );
  const evalDetailsSection = useMemo(() => getSection(EVALUATION_DETAILS_TITLE), []);

  const buttonCss = css`
    &:hover {
      text-decoration: none;
    }
  `;

  return (
    <>
      <EuiTitle size={'s'}>
        <h2>{i18n.SETTINGS_TITLE}</h2>
      </EuiTitle>
      <EuiSpacer size="xs" />
      <EuiText size={'s'}>{i18n.SETTINGS_DESCRIPTION}</EuiText>
      <EuiHorizontalRule margin={'s'} />
      {/* Run Details*/}
      <EuiAccordion
        id={RUN_DETAILS_TITLE}
        arrowDisplay={'right'}
        buttonContent={runDetailsSection}
        buttonProps={{ css: buttonCss }}
        element="fieldset"
        initialIsOpen={true}
      >
        <RunDetailsEditor
          runDetailsSettings={runDetailsSettings}
          datasetSettings={datasetSettings}
          traceOptionsSettings={tracedOptionsSettings}
        />
      </EuiAccordion>
      <EuiHorizontalRule margin={'s'} />
      {/* Prediction Details*/}
      <EuiAccordion
        id={PREDICTION_DETAILS_TITLE}
        arrowDisplay={'right'}
        buttonContent={predictionDetailsSection}
        buttonProps={{ css: buttonCss }}
        element="fieldset"
        initialIsOpen={true}
      >
        <PredictionDetails predictionsSettings={predictionsSettings} />
      </EuiAccordion>
      <EuiHorizontalRule margin={'s'} />
      {/* Evaluation Details*/}
      <EuiAccordion
        id={EVALUATION_DETAILS_TITLE}
        arrowDisplay={'right'}
        element="fieldset"
        buttonProps={{ css: buttonCss }}
        buttonContent={evalDetailsSection}
        initialIsOpen={true}
      >
        <EuiFormRow
          display="rowCompressed"
          label={i18n.EVALUATION_PROMPT_LABEL}
          fullWidth
          helpText={i18n.EVALUATION_PROMPT_DESCRIPTION}
        >
          <EuiTextArea
            aria-label={'evaluation-prompt-textarea'}
            compressed
            css={css`
              min-height: 330px;
            `}
            disabled={selectedEvaluationType[0]?.label !== 'custom'}
            fullWidth
            onChange={onEvalPromptChange}
            value={evalPrompt}
          />
        </EuiFormRow>
      </EuiAccordion>
      <EuiHorizontalRule margin="s" />
      <EuiFlexGroup alignItems="flexStart" direction="column" gutterSize="m">
        <EuiFlexItem grow={false}>
          <EuiButton
            type="submit"
            isDisabled={isPerformEvaluationDisabled}
            isLoading={isPerformingEvaluation}
            onClick={handlePerformEvaluation}
            iconType="plusInCircle"
            fill
          >
            {i18n.PERFORM_EVALUATION}
          </EuiButton>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiText color={'subdued'} size={'xs'}>
            <FormattedMessage
              defaultMessage="Fun Facts: Watch the Kibana server logs for progress, and view results in {discover} / {apm} once complete. Will take (many) minutes depending on dataset, and closing this dialog will cancel the evaluation!"
              id="xpack.elasticAssistant.assistant.settings.evaluationSettingsManagement.evaluatorFunFactText"
              values={{
                discover: (
                  <EuiLink external href={discoverLink} target="_blank">
                    {i18n.EVALUATOR_FUN_FACT_DISCOVER_LINK}
                  </EuiLink>
                ),
                apm: (
                  <EuiLink external href={apmLink} target="_blank">
                    {i18n.EVALUATOR_FUN_FACT_APM_LINK}
                  </EuiLink>
                ),
              }}
            />
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFormRow
            display="rowCompressed"
            label={i18n.EVALUATOR_MODEL_LABEL}
            helpText={i18n.EVALUATOR_MODEL_DESCRIPTION}
          >
            <EuiComboBox
              aria-label={'evaluation-type-select'}
              compressed
              options={predictionsSettings.modelOptions}
              selectedOptions={selectedEvaluatorModelOptions}
              singleSelection={{ asPlainText: true }}
              onChange={onEvaluatorModelOptionsChange}
            />
          </EuiFormRow>

          <EuiFormRow
            display="rowCompressed"
            label={i18n.EVALUATION_TYPE_LABEL}
            helpText={i18n.EVALUATION_TYPE_DESCRIPTION}
          >
            <EuiComboBox
              aria-label={'evaluation-type-select'}
              compressed
              onChange={onEvaluationTypeChange}
              onCreateOption={onEvaluationTypeOptionsCreate}
              options={evaluationTypeOptions}
              selectedOptions={selectedEvaluationType}
              singleSelection={{ asPlainText: true }}
            />
          </EuiFormRow>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="s" />
    </>
  );
});
EvaluationSettingsManagement.displayName = 'EvaluationSettingsManagement';
