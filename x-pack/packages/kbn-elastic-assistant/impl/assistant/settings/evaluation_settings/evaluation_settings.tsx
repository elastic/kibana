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
  EuiTextArea,
  EuiTextColor,
  EuiFieldText,
  EuiFlexItem,
  EuiFlexGroup,
  EuiLink,
} from '@elastic/eui';

import { css } from '@emotion/react';
import { FormattedMessage } from '@kbn/i18n-react';
import * as i18n from './translations';
import { useAssistantContext } from '../../../assistant_context';
import { useLoadConnectors } from '../../../connectorland/use_load_connectors';
import { getActionTypeTitle, getGenAiConfig } from '../../../connectorland/helpers';
import { PRECONFIGURED_CONNECTOR } from '../../../connectorland/translations';
import { usePerformEvaluation } from './use_perform_evaluation';

/**
 * See AGENT_EXECUTOR_MAP in `x-pack/plugins/elastic_assistant/server/routes/evaluate/post_evaluate.ts`
 * for the agent name -> executor mapping
 */
const DEFAULT_AGENTS = ['DefaultAgentExecutor', 'OpenAIFunctionsExecutor'];
const DEFAULT_EVAL_TYPES_OPTIONS = [
  { label: 'correctness' },
  { label: 'esql-validator', disabled: true },
  { label: 'custom', disabled: true },
];

interface Props {
  onEvaluationSettingsChange?: () => void;
}

/**
 * Evaluation Settings -- development-only feature for evaluating models
 */
export const EvaluationSettings: React.FC<Props> = React.memo(({ onEvaluationSettingsChange }) => {
  const { actionTypeRegistry, basePath, http } = useAssistantContext();
  const { data: connectors } = useLoadConnectors({ http });
  const { mutate: performEvaluation, isLoading: isPerformingEvaluation } = usePerformEvaluation({
    http,
  });

  // Run Details
  // Project Name
  const [projectName, setProjectName] = useState();
  const onProjectNameChange = useCallback(
    (e) => {
      setProjectName(e.target.value);
    },
    [setProjectName]
  );
  // Run Name
  const [runName, setRunName] = useState();
  const onRunNameChange = useCallback(
    (e) => {
      setRunName(e.target.value);
    },
    [setRunName]
  );
  // Local Output Index
  const [outputIndex, setOutputIndex] = useState('.kibana-elastic-ai-assistant-evaluation-results');
  const onOutputIndexChange = useCallback(
    (e) => {
      setOutputIndex(e.target.value);
    },
    [setOutputIndex]
  );
  // Dataset
  const [useLangSmithDataset, setUseLangSmithDataset] = useState(true);
  const datasetToggleButton = useMemo(() => {
    return (
      <EuiText
        size={'xs'}
        css={css`
          margin-top: 16px;
        `}
      >
        {i18n.EVALUATOR_DATASET_LABEL}
        {' ('}
        <EuiLink
          color={useLangSmithDataset ? 'primary' : 'text'}
          onClick={() => setUseLangSmithDataset(true)}
        >
          {i18n.LANGSMITH_DATASET_LABEL}
        </EuiLink>
        {' / '}
        <EuiLink
          color={useLangSmithDataset ? 'text' : 'primary'}
          onClick={() => setUseLangSmithDataset(false)}
        >
          {i18n.CUSTOM_DATASET_LABEL}
        </EuiLink>
        {')'}
      </EuiText>
    );
  }, [useLangSmithDataset]);
  const [datasetName, setDatasetName] = useState<string>();
  const onDatasetNameChange = useCallback(
    (e) => {
      setDatasetName(e.target.value);
    },
    [setDatasetName]
  );
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

  // Evaluation
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
    return DEFAULT_EVAL_TYPES_OPTIONS;
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

  // Eval Prompt
  const sampleEvalPrompt: string = `For the below input: \n\n{{input}} \n\na prediction: \n\n{{prediction}} \n\nwas made. How's it stack up against this reference: \n\n{{reference}} \n\nReturn output in a succinct sentence ranking on a simple grading rubric focused on correctness.`;
  const [evalPrompt, setEvalPrompt] = useState<string>(sampleEvalPrompt);
  const onEvalPromptChange = useCallback(
    (e) => {
      setEvalPrompt(e.target.value);
    },
    [setEvalPrompt]
  );

  // Required fields by eval API
  const isPerformEvaluationDisabled =
    selectedModelOptions.length === 0 ||
    selectedAgentOptions.length === 0 ||
    outputIndex.length === 0;

  // Perform Evaluation Button
  const handlePerformEvaluation = useCallback(() => {
    const evalParams = {
      models: selectedModelOptions.flatMap((option) => option.key ?? []),
      agents: selectedAgentOptions.map((option) => option.label),
      dataset: useLangSmithDataset ? undefined : datasetText,
      datasetName: useLangSmithDataset ? datasetName : undefined,
      evalModel: selectedEvaluatorModelOptions.flatMap((option) => option.key ?? []),
      evalPrompt,
      evaluationType: selectedEvaluationType.map((option) => option.label),
      outputIndex,
      projectName,
      runName,
    };
    performEvaluation(evalParams);
  }, [
    datasetName,
    datasetText,
    evalPrompt,
    outputIndex,
    performEvaluation,
    projectName,
    runName,
    selectedAgentOptions,
    selectedEvaluationType,
    selectedEvaluatorModelOptions,
    selectedModelOptions,
    useLangSmithDataset,
  ]);

  const discoverLink = `${basePath}/app/discover#/?_g=(filters:!(),refreshInterval:(pause:!t,value:60000),time:(from:now-7d%2Fd,to:now))&_a=(columns:!('@timestamp',evaluationId,totalAgents,totalInput,totalRequests,input,reference,prediction,evaluation.value,evaluation.reasoning,predictionResponse.value.connector_id),filters:!(),grid:(columns:('@timestamp':(width:212),evaluationId:(width:285),totalAgents:(width:111),totalInput:(width:98),totalRequests:(width:121))),index:'6d9ba861-a76b-4d31-90f4-dfb8f01b78bd',interval:auto,query:(esql:'from%20.kibana-elastic-ai-assistant-evaluation-results%20%0A%7C%20keep%20@timestamp,%20evaluationId,%20totalAgents,%20totalInput,%20totalRequests,%20input,%20reference,%20prediction,%20evaluation.value,%20evaluation.reasoning,%20predictionResponse.value.connector_id%0A%7C%20sort%20@timestamp%20desc%0A%7C%20limit%20100%0A%0A%0A'),sort:!(!('@timestamp',desc)))`;

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
  const evalDetailsSection = useMemo(
    () => getSection(i18n.EVALUATION_DETAILS_TITLE, i18n.EVALUATION_DETAILS_DESCRIPTION),
    []
  );

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
        id={i18n.RUN_DETAILS_TITLE}
        arrowDisplay={'right'}
        buttonContent={runDetailsSection}
        buttonProps={{ paddingSize: 's', css: buttonCss }}
        element="fieldset"
        initialIsOpen={true}
        paddingSize="s"
      >
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
          label={datasetToggleButton}
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
      </EuiAccordion>
      <EuiHorizontalRule margin={'s'} />
      {/* Evaluation Details*/}
      <EuiAccordion
        id={i18n.EVALUATION_DETAILS_TITLE}
        arrowDisplay={'right'}
        element="fieldset"
        buttonProps={{ paddingSize: 's', css: buttonCss }}
        buttonContent={evalDetailsSection}
        paddingSize="s"
      >
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
      </EuiAccordion>
      <EuiHorizontalRule />
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
              defaultMessage="Fun Facts: Watch the Kibana server logs for progress, and {funFacts} to view the results in Discover once complete. Will take (many) minutes depending on dataset, and closing this dialog will cancel the evaluation!"
              id="xpack.elasticAssistant.assistant.settings.evaluationSettings.evaluatorFunFactText"
              values={{
                funFacts: (
                  <EuiLink external href={discoverLink} target="_blank">
                    {i18n.EVALUATOR_FUN_FACT_DISCOVER_LINK}
                  </EuiLink>
                ),
              }}
            />
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="s" />
    </>
  );
});

EvaluationSettings.displayName = 'EvaluationSettings';
