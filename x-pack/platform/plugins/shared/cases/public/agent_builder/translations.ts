/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const ADD_TO_CHAT = i18n.translate('xpack.cases.agentBuilder.addToChatButtonLabel', {
  defaultMessage: 'Add to chat',
});

export const CHAT_ACTIONS_ARIA_LABEL = i18n.translate(
  'xpack.cases.agentBuilder.chatActionsAriaLabel',
  {
    defaultMessage: 'Case chat actions',
  }
);

export const SUMMARIZE_CASE = i18n.translate('xpack.cases.agentBuilder.summarizeCaseButtonLabel', {
  defaultMessage: 'Summarize case',
});

export const SUMMARIZE_CASE_PROMPT = i18n.translate(
  'xpack.cases.agentBuilder.summarizeCasePrompt',
  {
    defaultMessage:
      'Summarize the attached case and recommend next steps. Include key case details, related alerts and observables, recent activity, and any follow-up actions that would help an analyst continue the investigation.',
  }
);
