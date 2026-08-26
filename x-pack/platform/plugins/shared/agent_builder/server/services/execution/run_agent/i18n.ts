/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

const thinkingMessages = [
  i18n.translate('xpack.agentBuilder.agents.progress.thinking.message_1', {
    defaultMessage: 'Thinking about my next action',
  }),
  i18n.translate('xpack.agentBuilder.agents.progress.thinking.message_2', {
    defaultMessage: 'Planning my next step',
  }),
  i18n.translate('xpack.agentBuilder.agents.progress.thinking.message_3', {
    defaultMessage: 'Consulting my tools',
  }),
  i18n.translate('xpack.agentBuilder.agents.progress.thinking.message_4', {
    defaultMessage: 'Analyzing the request',
  }),
  i18n.translate('xpack.agentBuilder.agents.progress.thinking.message_5', {
    defaultMessage: 'Deciding what to do next',
  }),
];

const answeringMessages = [
  i18n.translate('xpack.agentBuilder.agents.progress.answering.message_1', {
    defaultMessage: 'Summarizing my findings',
  }),
  i18n.translate('xpack.agentBuilder.agents.progress.answering.message_2', {
    defaultMessage: 'Putting it all together',
  }),
  i18n.translate('xpack.agentBuilder.agents.progress.answering.message_3', {
    defaultMessage: 'Synthesizing the results',
  }),
  i18n.translate('xpack.agentBuilder.agents.progress.answering.message_4', {
    defaultMessage: 'Composing the final answer',
  }),
  i18n.translate('xpack.agentBuilder.agents.progress.answering.message_5', {
    defaultMessage: 'Drafting the response',
  }),
];

const getRandomMessage = (messages: string[]): string => {
  return messages[Math.floor(Math.random() * messages.length)];
};

export const getRandomThinkingMessage = (): string => getRandomMessage(thinkingMessages);
export const getRandomAnsweringMessage = (): string => getRandomMessage(answeringMessages);
