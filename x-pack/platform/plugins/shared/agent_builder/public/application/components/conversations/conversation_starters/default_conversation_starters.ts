/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { ConversationStarter } from '@kbn/agent-builder-common';

/**
 * The starters shown on the default Elastic AI agent when nothing more specific exists. Each one
 * must be something the agent can do out of the box. The copy is a placeholder until product
 * confirms it.
 */
export const DEFAULT_CONVERSATION_STARTERS: readonly ConversationStarter[] = [
  {
    label: i18n.translate('xpack.agentBuilder.conversationStarters.default.whatCanYouHelpWith', {
      defaultMessage: 'What can you help me with?',
    }),
  },
  {
    label: i18n.translate('xpack.agentBuilder.conversationStarters.default.whatDataDoIHave', {
      defaultMessage: 'What data do I have?',
    }),
  },
  {
    label: i18n.translate('xpack.agentBuilder.conversationStarters.default.investigateAnIssue', {
      defaultMessage: 'Help me investigate an issue',
    }),
  },
];
