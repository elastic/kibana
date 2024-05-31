/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const SETTINGS_TITLE = i18n.translate(
  'xpack.elasticAssistant.assistant.settings.evaluationSettings.settingsTitle',
  {
    defaultMessage: 'Evaluation',
  }
);
export const SETTINGS_DESCRIPTION = i18n.translate(
  'xpack.elasticAssistant.assistant.settings.evaluationSettings.settingsDescription',
  {
    defaultMessage:
      'Run predictions and evaluations against test data sets using different models (connectors), agents, and evaluation schemes.',
  }
);

export const RUN_DETAILS_TITLE = i18n.translate(
  'xpack.elasticAssistant.assistant.settings.evaluationSettings.runDetailsTitle',
  {
    defaultMessage: '🏃 Run Details',
  }
);

export const RUN_DETAILS_DESCRIPTION = i18n.translate(
  'xpack.elasticAssistant.assistant.settings.evaluationSettings.runDetailsDescription',
  {
    defaultMessage: 'Configure test run details like project, run name, dataset, and output index',
  }
);

export const PREDICTION_DETAILS_TITLE = i18n.translate(
  'xpack.elasticAssistant.assistant.settings.evaluationSettings.predictionDetailsTitle',
  {
    defaultMessage: '🔮 Predictions',
  }
);

export const PREDICTION_DETAILS_DESCRIPTION = i18n.translate(
  'xpack.elasticAssistant.assistant.settings.evaluationSettings.predictionDetailsDescription',
  {
    defaultMessage:
      'Choose models (connectors) and corresponding agents the dataset should run against',
  }
);

export const EVALUATION_DETAILS_TITLE = i18n.translate(
  'xpack.elasticAssistant.assistant.settings.evaluationSettings.evaluationDetailsTitle',
  {
    defaultMessage: '🧮 Evaluation (Optional)',
  }
);

export const EVALUATION_DETAILS_DESCRIPTION = i18n.translate(
  'xpack.elasticAssistant.assistant.settings.evaluationSettings.evaluationDetailsDescription',
  {
    defaultMessage:
      'Evaluate prediction results using a specific model (connector) and evaluation criterion',
  }
);

export const PROJECT_LABEL = i18n.translate(
  'xpack.elasticAssistant.assistant.settings.evaluationSettings.projectLabel',
  {
    defaultMessage: 'Project',
  }
);

export const PROJECT_DESCRIPTION = i18n.translate(
  'xpack.elasticAssistant.assistant.settings.evaluationSettings.projectDescription',
  {
    defaultMessage: 'LangSmith project to write results to',
  }
);

export const PROJECT_PLACEHOLDER = i18n.translate(
  'xpack.elasticAssistant.assistant.settings.evaluationSettings.projectPlaceholder',
  {
    defaultMessage: '8.12 Testing',
  }
);

export const RUN_NAME_LABEL = i18n.translate(
  'xpack.elasticAssistant.assistant.settings.evaluationSettings.runNameLabel',
  {
    defaultMessage: 'Run name',
  }
);

export const RUN_NAME_DESCRIPTION = i18n.translate(
  'xpack.elasticAssistant.assistant.settings.evaluationSettings.runNameDescription',
  {
    defaultMessage: 'Name for this specific test run',
  }
);

export const RUN_NAME_PLACEHOLDER = i18n.translate(
  'xpack.elasticAssistant.assistant.settings.evaluationSettings.runNamePlaceholder',
  {
    defaultMessage: '8.12 ESQL Query Generation',
  }
);

export const CONNECTORS_LABEL = i18n.translate(
  'xpack.elasticAssistant.assistant.settings.evaluationSettings.connectorsLabel',
  {
    defaultMessage: 'Connectors / Models',
  }
);

export const CONNECTORS_DESCRIPTION = i18n.translate(
  'xpack.elasticAssistant.assistant.settings.evaluationSettings.connectorsDescription',
  {
    defaultMessage: 'Select whichever models you want to evaluate the dataset against',
  }
);

export const AGENTS_LABEL = i18n.translate(
  'xpack.elasticAssistant.assistant.settings.evaluationSettings.agentsLabel',
  {
    defaultMessage: 'Agents',
  }
);

export const AGENTS_DESCRIPTION = i18n.translate(
  'xpack.elasticAssistant.assistant.settings.evaluationSettings.agentsDescription',
  {
    defaultMessage: 'Select the agents (i.e. RAG algos) to evaluate the dataset against',
  }
);

export const EVALUATOR_MODEL_LABEL = i18n.translate(
  'xpack.elasticAssistant.assistant.settings.evaluationSettings.evaluatorModelLabel',
  {
    defaultMessage: 'Evaluator Model',
  }
);

export const EVALUATOR_MODEL_DESCRIPTION = i18n.translate(
  'xpack.elasticAssistant.assistant.settings.evaluationSettings.evaluatorModelDescription',
  {
    defaultMessage: 'Model to perform the final evaluation with',
  }
);

export const EVALUATION_TYPE_LABEL = i18n.translate(
  'xpack.elasticAssistant.assistant.settings.evaluationSettings.evaluationTypeLabel',
  {
    defaultMessage: 'Evaluation type',
  }
);

export const EVALUATION_TYPE_DESCRIPTION = i18n.translate(
  'xpack.elasticAssistant.assistant.settings.evaluationSettings.evaluationTypeDescription',
  {
    defaultMessage:
      'Type of evaluation to perform, e.g. "correctness" "esql-validator", or "custom" and provide your own evaluation prompt',
  }
);

export const EVALUATION_PROMPT_LABEL = i18n.translate(
  'xpack.elasticAssistant.assistant.settings.evaluationSettings.evaluationPromptLabel',
  {
    defaultMessage: 'Evaluation prompt',
  }
);

export const EVALUATION_PROMPT_DESCRIPTION = i18n.translate(
  'xpack.elasticAssistant.assistant.settings.evaluationSettings.evaluationPromptDescription',
  {
    defaultMessage:
      'Prompt template given `input`, `reference` and `prediction` template variables',
  }
);
export const EVALUATOR_OUTPUT_INDEX_LABEL = i18n.translate(
  'xpack.elasticAssistant.assistant.settings.evaluationSettings.evaluatorOutputIndexLabel',
  {
    defaultMessage: 'Output index',
  }
);

export const EVALUATOR_OUTPUT_INDEX_DESCRIPTION = i18n.translate(
  'xpack.elasticAssistant.assistant.settings.evaluationSettings.evaluatorOutputIndexDescription',
  {
    defaultMessage:
      'Index to write results to. Must be prefixed with ".kibana-elastic-ai-assistant-"',
  }
);

export const SHOW_TRACE_OPTIONS = i18n.translate(
  'xpack.elasticAssistant.assistant.settings.evaluationSettings.showTraceOptionsLabel',
  {
    defaultMessage: 'Show Trace Options (for internal use only)',
  }
);

export const APM_URL_LABEL = i18n.translate(
  'xpack.elasticAssistant.assistant.settings.evaluationSettings.apmUrlLabel',
  {
    defaultMessage: 'APM URL',
  }
);

export const APM_URL_DESCRIPTION = i18n.translate(
  'xpack.elasticAssistant.assistant.settings.evaluationSettings.apmUrlDescription',
  {
    defaultMessage:
      'URL for the Kibana APM app. Used to link to APM traces for evaluation results. Defaults to "$\\{basePath\\}/app/apm"',
  }
);

export const LANGSMITH_PROJECT_LABEL = i18n.translate(
  'xpack.elasticAssistant.assistant.settings.evaluationSettings.langSmithProjectLabel',
  {
    defaultMessage: 'LangSmith Project',
  }
);

export const LANGSMITH_PROJECT_DESCRIPTION = i18n.translate(
  'xpack.elasticAssistant.assistant.settings.evaluationSettings.langSmithProjectDescription',
  {
    defaultMessage: 'LangSmith Project to write traces to',
  }
);

export const LANGSMITH_API_KEY_LABEL = i18n.translate(
  'xpack.elasticAssistant.assistant.settings.evaluationSettings.langSmithApiKeyLabel',
  {
    defaultMessage: 'LangSmith API Key',
  }
);

export const LANGSMITH_API_KEY_DESCRIPTION = i18n.translate(
  'xpack.elasticAssistant.assistant.settings.evaluationSettings.langSmithApiKeyDescription',
  {
    defaultMessage:
      'API Key for writing traces to LangSmith. Stored in Session Storage. Close tab to clear session.',
  }
);

export const EVALUATOR_DATASET_LABEL = i18n.translate(
  'xpack.elasticAssistant.assistant.settings.evaluationSettings.evaluatorDatasetLabel',
  {
    defaultMessage: 'Dataset',
  }
);

export const LANGSMITH_DATASET_LABEL = i18n.translate(
  'xpack.elasticAssistant.assistant.settings.evaluationSettings.langsmithDatasetLabel',
  {
    defaultMessage: 'LangSmith',
  }
);

export const LANGSMITH_DATASET_DESCRIPTION = i18n.translate(
  'xpack.elasticAssistant.assistant.settings.evaluationSettings.langsmithDatasetDescription',
  {
    defaultMessage: 'Name of dataset hosted on LangSmith to evaluate',
  }
);

export const LANGSMITH_DATASET_PLACEHOLDER = i18n.translate(
  'xpack.elasticAssistant.assistant.settings.evaluationSettings.langsmithDatasetPlaceholder',
  {
    defaultMessage: 'ESQL Query Generation',
  }
);

export const CUSTOM_DATASET_LABEL = i18n.translate(
  'xpack.elasticAssistant.assistant.settings.evaluationSettings.customDatasetLabel',
  {
    defaultMessage: 'Custom',
  }
);

export const CUSTOM_DATASET_DESCRIPTION = i18n.translate(
  'xpack.elasticAssistant.assistant.settings.evaluationSettings.customDatasetDescription',
  {
    defaultMessage:
      'Custom dataset to evaluate. Array of objects with "input" and "references" properties',
  }
);

export const PERFORM_EVALUATION = i18n.translate(
  'xpack.elasticAssistant.assistant.settings.evaluationSettings.performEvaluationTitle',
  {
    defaultMessage: 'Perform evaluation...',
  }
);

export const EVALUATOR_FUN_FACT_DISCOVER_LINK = i18n.translate(
  'xpack.elasticAssistant.assistant.settings.evaluationSettings.evaluatorFunFactDiscoverLinkText',
  {
    defaultMessage: 'Discover',
  }
);
export const EVALUATOR_FUN_FACT_APM_LINK = i18n.translate(
  'xpack.elasticAssistant.assistant.settings.evaluationSettings.evaluatorFunFactApmLinkText',
  {
    defaultMessage: 'APM',
  }
);
