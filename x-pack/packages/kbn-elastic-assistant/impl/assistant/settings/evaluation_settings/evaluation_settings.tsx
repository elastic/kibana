/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  euiPaletteComplementary,
  EuiFormRow,
  EuiTitle,
  EuiText,
  EuiHorizontalRule,
  EuiSpacer,
  EuiComboBox,
  EuiButton,
  EuiComboBoxOptionOption,
  EuiTextArea,
  EuiFieldText,
} from '@elastic/eui';

import * as i18n from './translations';
import { useAssistantContext } from '../../../assistant_context';
import { useLoadConnectors } from '../../../connectorland/use_load_connectors';
import { getGenAiConfig } from '../../../connectorland/helpers';
import { PRECONFIGURED_CONNECTOR } from '../../../connectorland/translations';
import { usePerformEvaluation } from './use_perform_evaluation';

const DEFAULT_AGENTS = ['DefaultAgentExecutor', 'OpenAIFunctionsExecutor'];
const DEFAULT_EVAL_TYPES = ['correctness', 'esql-validator', 'custom'];

interface Props {
  onEvaluationSettingsChange?: () => void;
}

/**
 * Evaluation Settings -- experimental feature toggled dev ui for evaluating models
 */
export const EvaluationSettings: React.FC<Props> = React.memo(({ onEvaluationSettingsChange }) => {
  const { http } = useAssistantContext();
  const { data: connectors } = useLoadConnectors({ http });
  const { mutate: performEvaluation, isLoading: isPerformingEvaluation } = usePerformEvaluation({
    http,
  });

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
  const visColorsBehindText = euiPaletteComplementary(connectors?.length ?? 0);
  const modelOptions = useMemo(() => {
    return (
      connectors?.map((connector, index) => {
        const apiProvider = getGenAiConfig(connector)?.apiProvider;
        const connectorDetails = connector.isPreconfigured ? PRECONFIGURED_CONNECTOR : apiProvider;
        return {
          key: connector.id,
          label: `${connector.name} (${connectorDetails})`,
          color: visColorsBehindText[index],
        };
      }) ?? []
    );
  }, [connectors, visColorsBehindText]);

  // Agents
  const [selectedAgentOptions, setSelectedAgentOptions] = useState<
    Array<EuiComboBoxOptionOption<string>>
  >([]);
  const onAgentOptionsChange = useCallback(
    (agentOptions: Array<EuiComboBoxOptionOption<string>>) => {
      setSelectedAgentOptions(agentOptions);
    },
    [setSelectedAgentOptions]
  );
  const onAgentOptionsCreate = useCallback(
    (searchValue: string) => {
      const normalizedSearchValue = searchValue.trim();

      if (!normalizedSearchValue) {
        return;
      }

      setSelectedAgentOptions([...selectedAgentOptions, { label: normalizedSearchValue }]);
    },
    [selectedAgentOptions]
  );
  const agentOptions = useMemo(() => {
    return DEFAULT_AGENTS.map((label) => ({ label }));
  }, []);

  // Evaluation Type
  const [selectedEvaluationType, setSelectedEvaluationType] = useState<
    Array<EuiComboBoxOptionOption<string>>
  >([]);
  const onEvaluationTypeChange = useCallback(
    (evaluationType: Array<EuiComboBoxOptionOption<string>>) => {
      setSelectedEvaluationType(evaluationType);
    },
    [setSelectedEvaluationType]
  );
  const onEvaluationTypeOptionsCreate = useCallback(
    (searchValue: string) => {
      const normalizedSearchValue = searchValue.trim();

      if (!normalizedSearchValue) {
        return;
      }

      setSelectedEvaluationType([{ label: normalizedSearchValue }]);
    },
    [setSelectedEvaluationType]
  );
  const evaluationTypeOptions = useMemo(() => {
    return DEFAULT_EVAL_TYPES.map((label) => ({ label }));
  }, []);

  // Eval Model
  const [selectedEvaluatorModelOptions, setSelectedEvaluatorModelOptions] = useState<
    Array<EuiComboBoxOptionOption<string>>
  >([]);
  const onEvaluatorModelOptionsChange = useCallback(
    (selectedOptions: Array<EuiComboBoxOptionOption<string>>) => {
      setSelectedEvaluatorModelOptions(selectedOptions);
    },
    [setSelectedEvaluatorModelOptions]
  );

  // Output Index
  const [outputIndex, setOutputIndex] = useState('.kibana-elastic-ai-assistant-evaluation-results');
  const onOutputIndexChange = useCallback(
    (e) => {
      setOutputIndex(e.target.value);
    },
    [setOutputIndex]
  );

  // Eval Prompt
  const sampleEvalPrompt: string = `For the below input: \n\n{{input}} \n\na prediction: \n\n{{prediction}} \n\nwas made. How's it stack up against this reference: \n\n{{reference}} \n\nReturn output in a succinct sentence ranking on a simple grading rubric focused on correctness.`;
  const [evalPrompt, setEvalPrompt] = useState<string>(sampleEvalPrompt);
  const onEvalPromptChange = useCallback(
    (e) => {
      setEvalPrompt(e.target.value);
    },
    [setEvalPrompt]
  );

  // Dataset
  const sampleDataset = [
    {
      input:
        'I want to see a query for metrics-apm*, filtering on metricset.name:transaction and metricset.interval:1m, showing the average duration (via transaction.duration.histogram), in 50 buckets. Only return the ESQL query, and do not wrap in a codeblock.',
      reference:
        'FROM metrics-apm*\n| WHERE metricset.name == ""transaction"" AND metricset.interval == ""1m""\n| EVAL bucket = AUTO_BUCKET(transaction.duration.histogram, 50, <start-date>, <end-date>)\n| STATS avg_duration = AVG(transaction.duration.histogram) BY bucket',
    },
  ];
  const [datasetText, setDatasetText] = useState<string>(JSON.stringify(sampleDataset, null, 2));
  const onDatasetTextChange = useCallback(
    (e) => {
      setDatasetText(e.target.value);
    },
    [setDatasetText]
  );

  // Perform Evaluation Button
  const handlePerformEvaluation = useCallback(() => {
    const evalParams = {
      models: selectedModelOptions.flatMap((option) => option.key ?? []),
      agents: selectedAgentOptions.map((option) => option.label),
      dataset: datasetText,
      evalModel: selectedEvaluatorModelOptions.flatMap((option) => option.key ?? []),
      evalPrompt,
      evaluationType: selectedEvaluationType.map((option) => option.label),
      outputIndex,
    };
    performEvaluation(evalParams);
  }, [
    datasetText,
    evalPrompt,
    outputIndex,
    performEvaluation,
    selectedAgentOptions,
    selectedEvaluationType,
    selectedEvaluatorModelOptions,
    selectedModelOptions,
  ]);

  return (
    <>
      <EuiTitle size={'s'}>
        <h2>{i18n.SETTINGS_TITLE}</h2>
      </EuiTitle>
      <EuiSpacer size="xs" />
      <EuiText size={'s'}>{i18n.SETTINGS_DESCRIPTION}</EuiText>
      <EuiHorizontalRule margin={'s'} />

      <EuiFormRow
        display="rowCompressed"
        label={i18n.CONNECTORS_LABEL}
        helpText={i18n.CONNECTORS_DESCRIPTION}
      >
        <EuiComboBox
          aria-label={'model-selector'}
          compressed
          options={modelOptions}
          selectedOptions={selectedModelOptions}
          onChange={onModelOptionsChange}
        />
      </EuiFormRow>

      <EuiFormRow
        display="rowCompressed"
        label={i18n.AGENTS_LABEL}
        helpText={i18n.AGENTS_DESCRIPTION}
      >
        <EuiComboBox
          aria-label={'agent-selector'}
          compressed
          onCreateOption={onAgentOptionsCreate}
          options={agentOptions}
          selectedOptions={selectedAgentOptions}
          onChange={onAgentOptionsChange}
        />
      </EuiFormRow>

      <EuiFormRow
        display="rowCompressed"
        label={i18n.EVALUATOR_MODEL_LABEL}
        helpText={i18n.EVALUATOR_MODEL_DESCRIPTION}
      >
        <EuiComboBox
          aria-label={'evaluation-type-select'}
          compressed
          options={modelOptions}
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

      <EuiFormRow
        display="rowCompressed"
        label={i18n.EVALUATION_PROMPT_LABEL}
        fullWidth
        helpText={i18n.EVALUATION_PROMPT_DESCRIPTION}
      >
        <EuiTextArea
          aria-label={'evaluation-prompt-textarea'}
          compressed
          disabled={selectedEvaluationType[0]?.label !== 'custom'}
          fullWidth
          onChange={onEvalPromptChange}
          value={evalPrompt}
        />
      </EuiFormRow>

      <EuiFormRow
        display="rowCompressed"
        label={i18n.EVALUATOR_DATASET_LABEL}
        fullWidth
        helpText={i18n.EVALUATOR_DATASET_DESCRIPTION}
      >
        <EuiTextArea
          aria-label={'evaluation-dataset-textarea'}
          compressed
          fullWidth
          onChange={onDatasetTextChange}
          value={datasetText}
        />
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

      <EuiButton
        size="s"
        type="submit"
        isLoading={isPerformingEvaluation}
        onClick={handlePerformEvaluation}
        fill
      >
        {i18n.PERFORM_EVALUATION}
      </EuiButton>
    </>
  );
});

EvaluationSettings.displayName = 'EvaluationSettings';
