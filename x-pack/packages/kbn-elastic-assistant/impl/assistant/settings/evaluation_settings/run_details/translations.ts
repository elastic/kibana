/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';

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
