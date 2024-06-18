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
