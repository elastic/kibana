/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  EuiAccordion,
  euiPaletteComplementary,
  EuiFormRow,
  EuiTitle,
  EuiText,
  EuiHorizontalRule,
  EuiSpacer,
  EuiComboBox,
  EuiButton,
  EuiComboBoxOptionOption,
  EuiComboBoxSingleSelectionShape,
  EuiTextColor,
  EuiFieldText,
  EuiFieldNumber,
  EuiFlexItem,
  EuiFlexGroup,
  EuiLink,
  EuiPanel,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { FormattedMessage } from '@kbn/i18n-react';
import type {
  GetEvaluateResponse,
  PostEvaluateRequestBodyInput,
} from '@kbn/elastic-assistant-common';
import { isEmpty } from 'lodash/fp';

import * as i18n from './translations';
import { useAssistantContext } from '../../../assistant_context';
import { DEFAULT_ATTACK_DISCOVERY_MAX_ALERTS } from '../../../assistant_context/constants';
import { useLoadConnectors } from '../../../connectorland/use_load_connectors';
import { getActionTypeTitle, getGenAiConfig } from '../../../connectorland/helpers';
import { PRECONFIGURED_CONNECTOR } from '../../../connectorland/translations';
import { usePerformEvaluation } from '../../api/evaluate/use_perform_evaluation';
import { useEvaluationData } from '../../api/evaluate/use_evaluation_data';

const AS_PLAIN_TEXT: EuiComboBoxSingleSelectionShape = { asPlainText: true };

/**
 * Evaluation Settings -- development-only feature for evaluating models
 */
export const EvaluationSettings: React.FC = React.memo(() => {
  const { actionTypeRegistry, http, setTraceOptions, toasts, traceOptions } = useAssistantContext();
  const { data: connectors } = useLoadConnectors({ http, inferenceEnabled: true });
  const { mutate: performEvaluation, isLoading: isPerformingEvaluation } = usePerformEvaluation({
    http,
    toasts,
  });
  const { data: evalData } = useEvaluationData({ http });
  const defaultGraphs = useMemo(() => (evalData as GetEvaluateResponse)?.graphs ?? [], [evalData]);
  const datasets = useMemo(() => (evalData as GetEvaluateResponse)?.datasets ?? [], [evalData]);

  // Run Details
  // Run Name
  const [runName, setRunName] = useState<string | undefined>();
  const onRunNameChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setRunName(e.target.value);
    },
    [setRunName]
  );
  /** Trace Options **/
  const [showTraceOptions, setShowTraceOptions] = useState(false);
  const onApmUrlChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setTraceOptions({ ...traceOptions, apmUrl: e.target.value });
    },
    [setTraceOptions, traceOptions]
  );
  const onLangSmithProjectChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setTraceOptions({ ...traceOptions, langSmithProject: e.target.value });
    },
    [setTraceOptions, traceOptions]
  );
  const onLangSmithApiKeyChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setTraceOptions({ ...traceOptions, langSmithApiKey: e.target.value });
    },
    [setTraceOptions, traceOptions]
  );
  /** Dataset **/
  const [selectedDatasetOptions, setSelectedDatasetOptions] = useState<
    Array<EuiComboBoxOptionOption<string>>
  >([]);
  const datasetOptions = useMemo(() => {
    return datasets.map((label) => ({ label }));
  }, [datasets]);
  const onDatasetOptionsChange = useCallback(
    (selectedOptions: Array<EuiComboBoxOptionOption<string>>) => {
      setSelectedDatasetOptions(selectedOptions);
    },
    [setSelectedDatasetOptions]
  );
  const onDatasetCreateOption = useCallback(
    (searchValue: string) => {
      const normalizedSearchValue = searchValue.trim().toLowerCase();
      if (!normalizedSearchValue) {
        return;
      }
      const newOption = {
        label: searchValue,
      };

      setSelectedDatasetOptions([newOption]);
    },
    [setSelectedDatasetOptions]
  );

  // Predictions
  // Connectors / Models
  const [selectedModelOptions, setSelectedModelOptions] = useState<
    Array<EuiComboBoxOptionOption<string>>
  >([]);
  const onModelOptionsChange = useCallback(
    (selectedOptions: Array<EuiComboBoxOptionOption<string>>) => {
      setSelectedModelOptions(selectedOptions);
    },
    [setSelectedModelOptions]
  );

  const [selectedEvaluatorModel, setSelectedEvaluatorModel] = useState<
    Array<EuiComboBoxOptionOption<string>>
  >([]);

  const onSelectedEvaluatorModelChange = useCallback(
    (selected: Array<EuiComboBoxOptionOption<string>>) => setSelectedEvaluatorModel(selected),
    []
  );

  const [size, setSize] = useState<string>(`${DEFAULT_ATTACK_DISCOVERY_MAX_ALERTS}`);

  const visColorsBehindText = euiPaletteComplementary(connectors?.length ?? 0);
  const modelOptions = useMemo(() => {
    return (
      connectors?.map((c, index) => {
        const apiProvider = getGenAiConfig(c)?.apiProvider;
        const connectorTypeTitle =
          apiProvider ?? getActionTypeTitle(actionTypeRegistry.get(c.actionTypeId));
        const connectorDetails = c.isPreconfigured ? PRECONFIGURED_CONNECTOR : connectorTypeTitle;
        return {
          key: c.id,
          label: `${c.name} (${connectorDetails})`,
          color: visColorsBehindText[index],
        };
      }) ?? []
    );
  }, [actionTypeRegistry, connectors, visColorsBehindText]);

  // Graphs
  const [selectedGraphOptions, setSelectedGraphOptions] = useState<
    Array<EuiComboBoxOptionOption<string>>
  >([]);
  const onGraphOptionsChange = useCallback(
    (graphOptions: Array<EuiComboBoxOptionOption<string>>) => {
      setSelectedGraphOptions(graphOptions);
    },
    [setSelectedGraphOptions]
  );
  const onGraphOptionsCreate = useCallback(
    (searchValue: string) => {
      const normalizedSearchValue = searchValue.trim();

      if (!normalizedSearchValue) {
        return;
      }

      setSelectedGraphOptions([...selectedGraphOptions, { label: normalizedSearchValue }]);
    },
    [selectedGraphOptions]
  );
  const graphOptions = useMemo(() => {
    return defaultGraphs.map((label) => ({ label }));
  }, [defaultGraphs]);

  // Required fields by eval API
  const isPerformEvaluationDisabled =
    selectedModelOptions.length === 0 || selectedGraphOptions.length === 0;

  // Perform Evaluation Button
  const handlePerformEvaluation = useCallback(async () => {
    const evaluatorConnectorId =
      selectedEvaluatorModel[0]?.key != null
        ? { evaluatorConnectorId: selectedEvaluatorModel[0].key }
        : {};

    const langSmithApiKey = isEmpty(traceOptions.langSmithApiKey)
      ? undefined
      : traceOptions.langSmithApiKey;

    const langSmithProject = isEmpty(traceOptions.langSmithProject)
      ? undefined
      : traceOptions.langSmithProject;

    const evalParams: PostEvaluateRequestBodyInput = {
      connectorIds: selectedModelOptions.flatMap((option) => option.key ?? []).sort(),
      graphs: selectedGraphOptions.map((option) => option.label).sort(),
      datasetName: selectedDatasetOptions[0]?.label,
      ...evaluatorConnectorId,
      langSmithApiKey,
      langSmithProject,
      runName,
      size: Number(size),
    };
    performEvaluation(evalParams);
  }, [
    performEvaluation,
    runName,
    selectedDatasetOptions,
    selectedEvaluatorModel,
    selectedGraphOptions,
    selectedModelOptions,
    size,
    traceOptions.langSmithApiKey,
    traceOptions.langSmithProject,
  ]);

  const getSection = (title: string, description: string) => (
    <div>
      <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
        <EuiFlexItem>
          <EuiTitle size="xs">
            <h3>{title}</h3>
          </EuiTitle>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiText size="s">
        <p>
          <EuiTextColor color="subdued">{description}</EuiTextColor>
        </p>
      </EuiText>
    </div>
  );

  const runDetailsSection = useMemo(
    () => getSection(i18n.RUN_DETAILS_TITLE, i18n.RUN_DETAILS_DESCRIPTION),
    []
  );
  const predictionDetailsSection = useMemo(
    () => getSection(i18n.PREDICTION_DETAILS_TITLE, i18n.PREDICTION_DETAILS_DESCRIPTION),
    []
  );

  const buttonCss = css`
    &:hover {
      text-decoration: none;
    }
  `;

  return (
    <EuiPanel hasShadow={false} hasBorder paddingSize="l">
      <EuiText size={'m'}>{i18n.SETTINGS_DESCRIPTION}</EuiText>
      <EuiHorizontalRule margin={'s'} />
      {/* Run Details*/}
      <EuiAccordion
        id={i18n.RUN_DETAILS_TITLE}
        arrowDisplay={'right'}
        buttonContent={runDetailsSection}
        buttonProps={{ paddingSize: 's', css: buttonCss }}
        element="fieldset"
        initialIsOpen={true}
        paddingSize="s"
      >
        <EuiFormRow
          display="rowCompressed"
          label={i18n.RUN_NAME_LABEL}
          helpText={i18n.RUN_NAME_DESCRIPTION}
        >
          <EuiFieldText
            aria-label={i18n.RUN_NAME_LABEL}
            compressed
            onChange={onRunNameChange}
            placeholder={i18n.RUN_NAME_PLACEHOLDER}
            value={runName}
          />
        </EuiFormRow>
        <EuiFormRow
          display="rowCompressed"
          label={i18n.EVALUATOR_DATASET_LABEL}
          fullWidth
          helpText={i18n.LANGSMITH_DATASET_DESCRIPTION}
        >
          <EuiComboBox
            aria-label={i18n.EVALUATOR_DATASET_LABEL}
            placeholder={i18n.LANGSMITH_DATASET_PLACEHOLDER}
            singleSelection={{ asPlainText: true }}
            options={datasetOptions}
            selectedOptions={selectedDatasetOptions}
            onChange={onDatasetOptionsChange}
            onCreateOption={onDatasetCreateOption}
            compressed={true}
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
                aria-label={i18n.APM_URL_LABEL}
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
                aria-label={i18n.LANGSMITH_PROJECT_LABEL}
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
                aria-label={i18n.LANGSMITH_API_KEY_LABEL}
              />
            </EuiFormRow>
          </>
        )}
      </EuiAccordion>
      <EuiHorizontalRule margin={'s'} />
      {/* Prediction Details*/}
      <EuiAccordion
        id={i18n.PREDICTION_DETAILS_TITLE}
        arrowDisplay={'right'}
        buttonContent={predictionDetailsSection}
        buttonProps={{ paddingSize: 's', css: buttonCss }}
        element="fieldset"
        initialIsOpen={true}
        paddingSize="s"
      >
        <EuiFormRow
          display="rowCompressed"
          label={i18n.CONNECTORS_LABEL}
          helpText={i18n.CONNECTORS_DESCRIPTION}
        >
          <EuiComboBox
            aria-label={i18n.CONNECTORS_LABEL}
            compressed
            options={modelOptions}
            selectedOptions={selectedModelOptions}
            onChange={onModelOptionsChange}
          />
        </EuiFormRow>

        <EuiFormRow
          display="rowCompressed"
          label={i18n.GRAPHS_LABEL}
          helpText={i18n.GRAPHS_DESCRIPTION}
        >
          <EuiComboBox
            aria-label={i18n.GRAPHS_LABEL}
            compressed
            onCreateOption={onGraphOptionsCreate}
            options={graphOptions}
            selectedOptions={selectedGraphOptions}
            onChange={onGraphOptionsChange}
          />
        </EuiFormRow>

        <EuiFormRow
          display="rowCompressed"
          helpText={i18n.EVALUATOR_MODEL_DESCRIPTION}
          label={i18n.EVALUATOR_MODEL}
        >
          <EuiComboBox
            aria-label={i18n.EVALUATOR_MODEL}
            compressed
            onChange={onSelectedEvaluatorModelChange}
            options={modelOptions}
            selectedOptions={selectedEvaluatorModel}
            singleSelection={AS_PLAIN_TEXT}
          />
        </EuiFormRow>

        <EuiFormRow
          display="rowCompressed"
          helpText={i18n.DEFAULT_MAX_ALERTS_DESCRIPTION}
          label={i18n.DEFAULT_MAX_ALERTS}
        >
          <EuiFieldNumber onChange={(e) => setSize(e.target.value)} value={size} />
        </EuiFormRow>
      </EuiAccordion>
      <EuiHorizontalRule margin={'s'} />
      <EuiFlexGroup alignItems="center">
        <EuiFlexItem grow={false}>
          <EuiButton
            size="s"
            type="submit"
            isDisabled={isPerformEvaluationDisabled}
            isLoading={isPerformingEvaluation}
            onClick={handlePerformEvaluation}
            fill
          >
            {i18n.PERFORM_EVALUATION}
          </EuiButton>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiText color={'subdued'} size={'xs'}>
            <FormattedMessage
              defaultMessage="Closing this dialog will cancel the evaluation. You can watch the Kibana server logs for progress. Can take many minutes for large datasets."
              id="xpack.elasticAssistant.assistant.settings.evaluationSettings.evaluatorFunFactText"
            />
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="s" />
    </EuiPanel>
  );
});

EvaluationSettings.displayName = 'EvaluationSettings';
