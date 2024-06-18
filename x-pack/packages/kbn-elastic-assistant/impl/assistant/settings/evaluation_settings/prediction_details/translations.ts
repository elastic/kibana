/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';

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
