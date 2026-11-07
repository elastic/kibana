/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { SystemTemplateDefinition } from '@kbn/cases-plugin/server';

/**
 * The template AlertZero ships for the cases it opens. Its strings are stored in each space when
 * the template is first written, so they use the server's locale at that time.
 */
export const getAiInvestigationTemplate = (): SystemTemplateDefinition => ({
  id: 'ai-investigation',
  name: i18n.translate('xpack.agenticInvestigations.casesBridge.systemTemplate.name', {
    defaultMessage: 'AI investigation',
  }),
  description: i18n.translate('xpack.agenticInvestigations.casesBridge.systemTemplate.description', {
    defaultMessage:
      'For cases opened from AlertZero investigations: check what the agent found, then record the outcome.',
  }),
  tags: ['alertzero'],
  taskList: {
    id: 'ai-investigation-review',
    name: i18n.translate('xpack.agenticInvestigations.casesBridge.systemTemplate.taskListName', {
      defaultMessage: 'AI investigation review',
    }),
    description: i18n.translate(
      'xpack.agenticInvestigations.casesBridge.systemTemplate.taskListDescription',
      { defaultMessage: "Review the agent's work on the linked investigations before closing." }
    ),
    tasks: [
      {
        title: i18n.translate('xpack.agenticInvestigations.casesBridge.systemTemplate.verifyTask', {
          defaultMessage: 'Verify the AI verdict',
        }),
        required: false,
      },
      {
        title: i18n.translate('xpack.agenticInvestigations.casesBridge.systemTemplate.reviewTask', {
          defaultMessage: 'Review the linked investigations',
        }),
        required: false,
      },
      {
        title: i18n.translate('xpack.agenticInvestigations.casesBridge.systemTemplate.outcomeTask', {
          defaultMessage: 'Record the outcome',
        }),
        required: true,
      },
    ],
  },
  statuses: [
    {
      key: 'awaiting_analyst',
      label: i18n.translate(
        'xpack.agenticInvestigations.casesBridge.systemTemplate.awaitingAnalyst',
        { defaultMessage: 'Awaiting analyst' }
      ),
      category: 'open',
      pausesTimeTracking: true,
    },
  ],
});
