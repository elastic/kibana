/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { StarterPrompt } from '../../common/types';

export const defaultStarterPrompts: StarterPrompt[] = [
  {
    title: i18n.translate(
      'xpack.observabilityAiAssistant.app.starterPrompts.exampleQuestions.title',
      { defaultMessage: 'Suggest' }
    ),
    prompt: i18n.translate(
      'xpack.observabilityAiAssistant.app.starterPrompts.exampleQuestions.prompt',
      {
        defaultMessage: 'Give me examples of questions I can ask here.',
      }
    ),
    icon: 'sparkles',
    scopes: ['all'],
  },
  {
    title: i18n.translate(
      'xpack.observabilityAiAssistant.app.starterPrompts.explainThisPage.title',
      { defaultMessage: 'Explain' }
    ),
    prompt: i18n.translate(
      'xpack.observabilityAiAssistant.app.starterPrompts.explainThisPage.prompt',
      {
        defaultMessage: 'Can you explain this page?',
      }
    ),
    icon: 'inspect',
    scopes: ['all'],
  },
  {
    title: i18n.translate('xpack.observabilityAiAssistant.app.starterPrompts.doIHaveAlerts.title', {
      defaultMessage: 'Alerts',
    }),
    prompt: i18n.translate(
      'xpack.observabilityAiAssistant.app.starterPrompts.doIHaveAlerts.prompt',
      {
        defaultMessage: 'Do I have any alerts?',
      }
    ),
    icon: 'bell',
    scopes: ['observability'],
  },
  {
    title: i18n.translate('xpack.observabilityAiAssistant.app.starterPrompts.whatAreSlos.title', {
      defaultMessage: 'SLOs',
    }),
    prompt: i18n.translate('xpack.observabilityAiAssistant.app.starterPrompts.whatAreSlos.prompt', {
      defaultMessage: 'What are SLOs?',
    }),
    icon: 'bullseye',
    scopes: ['observability'],
  },
];
