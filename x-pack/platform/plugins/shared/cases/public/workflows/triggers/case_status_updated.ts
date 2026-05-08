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
  CaseStatusUpdatedTriggerId,
  caseStatusUpdatedTriggerCommonDefinition,
} from '../../../common/workflows/triggers';

export const caseStatusUpdatedTriggerPublicDefinition: PublicTriggerDefinition = {
  ...caseStatusUpdatedTriggerCommonDefinition,
  icon: React.lazy(() =>
    import('@elastic/eui/es/components/icon/assets/app_cases').then(({ icon }) => ({
      default: icon,
    }))
  ),
  title: i18n.translate('xpack.cases.workflowTriggers.caseStatusUpdated.title', {
    defaultMessage: 'Cases - Case status updated',
  }),
  description: i18n.translate('xpack.cases.workflowTriggers.caseStatusUpdated.description', {
    defaultMessage: 'Emitted when a case status is updated.',
  }),
  documentation: {
    details: i18n.translate(
      'xpack.cases.workflowTriggers.caseStatusUpdated.documentation.details',
      {
        defaultMessage:
          'Emitted after case status updates. Includes the current and previous status.',
      }
    ),
    examples: [
      i18n.translate('xpack.cases.workflowTriggers.caseStatusUpdated.documentation.example', {
        defaultMessage: `## Run when Security case is closed
\`\`\`yaml
triggers:
  - type: {triggerId}
    on:
      condition: 'event.owner: "securitySolution" and event.status: "closed"'
\`\`\``,
        values: {
          triggerId: CaseStatusUpdatedTriggerId,
        },
      }),
    ],
  },
};
