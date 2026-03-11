/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { PublicTriggerDefinition } from '@kbn/workflows-extensions/public';
import {
  CommentAddedTriggerId,
  commentAddedTriggerCommonDefinition,
} from '../../../common/workflows/triggers';

export const commentAddedTriggerPublicDefinition: PublicTriggerDefinition = {
  ...commentAddedTriggerCommonDefinition,
  title: i18n.translate('xpack.cases.workflowTriggers.commentAdded.title', {
    defaultMessage: 'Cases - Comment added',
  }),
  description: i18n.translate('xpack.cases.workflowTriggers.commentAdded.description', {
    defaultMessage: 'Emitted when a comment is added to a case.',
  }),
  documentation: {
    details: i18n.translate('xpack.cases.workflowTriggers.commentAdded.documentation.details', {
      defaultMessage:
        'Emitted after a new comment is attached to a case. Use event.commentType and event.case fields in trigger conditions.',
    }),
    examples: [
      i18n.translate('xpack.cases.workflowTriggers.commentAdded.documentation.example', {
        defaultMessage: `## Run for user comments
\`\`\`yaml
triggers:
  - type: {triggerId}
    on:
      condition: 'event.commentType: "user"'
\`\`\``,
        values: {
          triggerId: CommentAddedTriggerId,
        },
      }),
    ],
  },
  snippets: {
    condition: 'event.commentType: "user"',
  },
};
