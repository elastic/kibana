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
      'Run predictions against LangSmith test data sets using different models (connectors) and graphs.',
  }
);

export const RUN_DETAILS_TITLE = i18n.translate(
  'xpack.elasticAssistant.assistant.settings.evaluationSettings.runDetailsTitle',
  {
    defaultMessage: 'Run Details',
  }
);

export const RUN_DETAILS_DESCRIPTION = i18n.translate(
  'xpack.elasticAssistant.assistant.settings.evaluationSettings.runDetailsDescription',
  {
    defaultMessage: 'Configure test run details like the run name and dataset.',
  }
);

export const PREDICTION_DETAILS_TITLE = i18n.translate(
  'xpack.elasticAssistant.assistant.settings.evaluationSettings.predictionDetailsTitle',
  {
    defaultMessage: 'Predictions',
  }
);

export const PREDICTION_DETAILS_DESCRIPTION = i18n.translate(
  'xpack.elasticAssistant.assistant.settings.evaluationSettings.predictionDetailsDescription',
  {
    defaultMessage:
      'Choose models (connectors) and corresponding graphs the dataset should run against.',
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
    defaultMessage: 'Name for this specific test run.',
  }
);

export const RUN_NAME_PLACEHOLDER = i18n.translate(
  'xpack.elasticAssistant.assistant.settings.evaluationSettings.runNamePlaceholder',
  {
    defaultMessage: '8.16 Streaming Regression',
  }
);

export const CONNECTORS_LABEL = i18n.translate(
  'xpack.elasticAssistant.assistant.settings.evaluationSettings.connectorsLabel',
  {
    defaultMessage: 'Connectors / Models',
  }
);

export const EVALUATOR_MODEL = i18n.translate(
  'xpack.elasticAssistant.assistant.settings.evaluationSettings.evaluatorModelLabel',
  {
    defaultMessage: 'Evaluator model (optional)',
  }
);

export const DEFAULT_MAX_ALERTS = i18n.translate(
  'xpack.elasticAssistant.assistant.settings.evaluationSettings.defaultMaxAlertsLabel',
  {
    defaultMessage: 'Default max alerts',
  }
);

export const EVALUATOR_MODEL_DESCRIPTION = i18n.translate(
  'xpack.elasticAssistant.assistant.settings.evaluationSettings.evaluatorModelDescription',
  {
    defaultMessage:
      'Judge the quality of all predictions using a single model. (Default: use the same model as the connector)',
  }
);

export const DEFAULT_MAX_ALERTS_DESCRIPTION = i18n.translate(
  'xpack.elasticAssistant.assistant.settings.evaluationSettings.defaultMaxAlertsDescription',
  {
    defaultMessage:
      'The default maximum number of alerts to send as context, which may be overridden by the Example input',
  }
);

export const CONNECTORS_DESCRIPTION = i18n.translate(
  'xpack.elasticAssistant.assistant.settings.evaluationSettings.connectorsDescription',
  {
    defaultMessage: 'Select models to evaluate the dataset against.',
  }
);

export const GRAPHS_LABEL = i18n.translate(
  'xpack.elasticAssistant.assistant.settings.evaluationSettings.graphsLabel',
  {
    defaultMessage: 'Graphs',
  }
);

export const GRAPHS_DESCRIPTION = i18n.translate(
  'xpack.elasticAssistant.assistant.settings.evaluationSettings.graphsDescription',
  {
    defaultMessage: 'Select the different graphs to evaluate the dataset against.',
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
      'URL for the Kibana APM app. Used to link to APM traces for evaluation results. Defaults to "{defaultUrlPath}".',
    values: {
      defaultUrlPath: '${basePath}/app/apm',
    },
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
    defaultMessage: 'LangSmith Project to write traces to.',
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
    defaultMessage: 'LangSmith Dataset',
  }
);

export const LANGSMITH_DATASET_DESCRIPTION = i18n.translate(
  'xpack.elasticAssistant.assistant.settings.evaluationSettings.langsmithDatasetDescription',
  {
    defaultMessage:
      'Name of dataset hosted on LangSmith to evaluate. Must manually enter on cloud environments.',
  }
);

export const LANGSMITH_DATASET_PLACEHOLDER = i18n.translate(
  'xpack.elasticAssistant.assistant.settings.evaluationSettings.langsmithDatasetPlaceholder',
  {
    defaultMessage: 'Select dataset...',
  }
);

export const PERFORM_EVALUATION = i18n.translate(
  'xpack.elasticAssistant.assistant.settings.evaluationSettings.performEvaluationTitle',
  {
    defaultMessage: 'Perform evaluation...',
  }
);
