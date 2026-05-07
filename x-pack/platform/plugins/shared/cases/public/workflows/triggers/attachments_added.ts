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
  AttachmentsAddedTriggerId,
  attachmentsAddedTriggerCommonDefinition,
} from '../../../common/workflows/triggers';

export const attachmentsAddedTriggerPublicDefinition: PublicTriggerDefinition = {
  ...attachmentsAddedTriggerCommonDefinition,
  icon: React.lazy(() =>
    import('@elastic/eui/es/components/icon/assets/app_cases').then(({ icon }) => ({
      default: icon,
    }))
  ),
  title: i18n.translate('xpack.cases.workflowTriggers.attachmentsAdded.title', {
    defaultMessage: 'Cases - Attachments added',
  }),
  description: i18n.translate('xpack.cases.workflowTriggers.attachmentsAdded.description', {
    defaultMessage: 'Emitted when one or more attachments of the same type are added to a case.',
  }),
  documentation: {
    details: i18n.translate('xpack.cases.workflowTriggers.attachmentsAdded.documentation.details', {
      defaultMessage:
        'Emitted after attachments are added to a case, once per attachment type involved. The payload includes event.caseId, event.owner, event.attachmentIds (all IDs added in that operation for this type), and event.attachmentType (e.g. "comment", "alert"). Use KQL on event.* for trigger conditions.',
    }),
    examples: [
      i18n.translate(
        'xpack.cases.workflowTriggers.attachmentsAdded.documentation.exampleCaseFilter',
        {
          defaultMessage: `## Run only for Security cases
\`\`\`yaml
triggers:
  - type: {triggerId}
    on:
      condition: 'event.owner: "securitySolution"'
\`\`\``,
          values: {
            triggerId: AttachmentsAddedTriggerId,
          },
        }
      ),
      i18n.translate(
        'xpack.cases.workflowTriggers.attachmentsAdded.documentation.exampleTypeFilter',
        {
          defaultMessage: `## Run only when a comment is added
\`\`\`yaml
triggers:
  - type: {triggerId}
    on:
      condition: 'event.attachmentType: "comment"'
\`\`\``,
          values: {
            triggerId: AttachmentsAddedTriggerId,
          },
        }
      ),
    ],
  },
};
