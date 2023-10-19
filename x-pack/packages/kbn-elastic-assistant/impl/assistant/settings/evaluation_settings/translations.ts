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
      'Not-so-secret dev UI for evaluating sample datasets against models/agents/more...',
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

export const EVALUATOR_DATASET_LABEL = i18n.translate(
  'xpack.elasticAssistant.assistant.settings.evaluationSettings.evaluatorDatasetLabel',
  {
    defaultMessage: 'Dataset',
  }
);

export const EVALUATOR_DATASET_DESCRIPTION = i18n.translate(
  'xpack.elasticAssistant.assistant.settings.evaluationSettings.evaluatorDatasetDescription',
  {
    defaultMessage:
      'Sample data set to evaluate. Array of objects with "input" and "references" properties',
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
    defaultMessage: 'click here',
  }
);
