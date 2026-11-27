/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { ConversationStarter } from '@kbn/agent-builder-common';

/**
 * The starters shown on the default Elastic AI agent when neither the app nor the solution of the
 * space has any. The label is the title on the card and the prompt is what a click sends. Each one
 * must be something the agent can do out of the box.
 */
export const DEFAULT_CONVERSATION_STARTERS: readonly ConversationStarter[] = [
  {
    label: i18n.translate('xpack.agentBuilder.conversationStarters.default.whatsInDeployment', {
      defaultMessage: 'What’s in this deployment?',
    }),
    prompt: i18n.translate(
      'xpack.agentBuilder.conversationStarters.default.whatsInDeployment.prompt',
      {
        defaultMessage:
          'Summarize the data in this deployment: what indices and data streams exist, and what are they used for?',
      }
    ),
  },
  {
    label: i18n.translate('xpack.agentBuilder.conversationStarters.default.investigateErrors', {
      defaultMessage: 'Investigate errors',
    }),
    prompt: i18n.translate(
      'xpack.agentBuilder.conversationStarters.default.investigateErrors.prompt',
      {
        defaultMessage: 'Find errors or unusual activity in my logs from the last 24 hours.',
      }
    ),
  },
  {
    label: i18n.translate('xpack.agentBuilder.conversationStarters.default.buildDashboard', {
      defaultMessage: 'Build a dashboard',
    }),
    prompt: i18n.translate(
      'xpack.agentBuilder.conversationStarters.default.buildDashboard.prompt',
      {
        defaultMessage: 'Build a dashboard to monitor the most important trends in my data.',
      }
    ),
  },
];
