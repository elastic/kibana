/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const COMMON_KNOWLEDGE = i18n.translate(
  'xpack.stackConnectors.components.helloWorld.commonKnowledgeFieldLabel',
  {
    defaultMessage:
      'What is some common knowledge you want the connector to return with every request?',
  }
);
export const SECRET_LABEL = i18n.translate(
  'xpack.stackConnectors.components.helloWorld.secretFieldLabel',
  {
    defaultMessage: 'Weather Api Key for https://www.weatherapi.com/',
  }
);
export const QUESTION_REQUIRED = i18n.translate(
  'xpack.stackConnectors.components.helloWorld.requiredQuestionTextField',
  {
    defaultMessage: 'Question is required.',
  }
);

export const ACTION_REQUIRED = i18n.translate(
  'xpack.stackConnectors.components.helloWorld.requiredActionText',
  {
    defaultMessage: 'Action is required.',
  }
);

export const INVALID_ACTION = i18n.translate(
  'xpack.stackConnectors.components.helloWorld.invalidActionText',
  {
    defaultMessage: 'Invalid action name.',
  }
);
