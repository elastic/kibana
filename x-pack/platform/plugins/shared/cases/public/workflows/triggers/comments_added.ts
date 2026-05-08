/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import type { PublicTriggerDefinition } from '@kbn/workflows-extensions/public';
import {
  CommentsAddedTriggerId,
  commentsAddedTriggerCommonDefinition,
} from '../../../common/workflows/triggers';

export const commentsAddedTriggerPublicDefinition: PublicTriggerDefinition = {
  ...commentsAddedTriggerCommonDefinition,
  icon: React.lazy(() =>
    import('@elastic/eui/es/components/icon/assets/app_cases').then(({ icon }) => ({
      default: icon,
    }))
  ),
  title: i18n.translate('xpack.cases.workflowTriggers.commentsAdded.title', {
    defaultMessage: 'Cases - Comments added',
  }),
  description: i18n.translate('xpack.cases.workflowTriggers.commentsAdded.description', {
    defaultMessage: 'Emitted when one or more comments are added to a case.',
  }),
  documentation: {
    details: i18n.translate('xpack.cases.workflowTriggers.commentsAdded.documentation.details', {
      defaultMessage:
        'Emitted after comments are added to a case. The payload includes event.caseId, event.owner, event.commentIds. Use KQL on event.* for trigger conditions.',
    }),
    examples: [
      i18n.translate('xpack.cases.workflowTriggers.commentsAdded.documentation.exampleCaseFilter', {
        defaultMessage: `## Run only for Security cases
\`\`\`yaml
triggers:
  - type: {triggerId}
    on:
      condition: 'event.owner: "securitySolution"'
\`\`\``,
        values: {
          triggerId: CommentsAddedTriggerId,
        },
      }),
    ],
  },
};
