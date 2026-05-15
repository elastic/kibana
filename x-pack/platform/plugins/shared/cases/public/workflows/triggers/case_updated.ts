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
  CaseUpdatedTriggerId,
  caseUpdatedTriggerCommonDefinition,
} from '../../../common/workflows/triggers';

export const caseUpdatedTriggerPublicDefinition: PublicTriggerDefinition = {
  ...caseUpdatedTriggerCommonDefinition,
  icon: React.lazy(() =>
    import('@elastic/eui/es/components/icon/assets/app_cases').then(({ icon }) => ({
      default: icon,
    }))
  ),
  title: i18n.translate('xpack.cases.workflowTriggers.caseUpdated.title', {
    defaultMessage: 'Cases - Case updated',
  }),
  description: i18n.translate('xpack.cases.workflowTriggers.caseUpdated.description', {
    defaultMessage: 'Emitted when a case is updated.',
  }),
  documentation: {
    details: i18n.translate('xpack.cases.workflowTriggers.caseUpdated.documentation.details', {
      defaultMessage:
        'Emitted after case updates. Use event.updatedFields to filter by which fields changed, event.caseId to match a specific case, and event.owner to scope by case owner.',
    }),
    examples: [
      i18n.translate('xpack.cases.workflowTriggers.caseUpdated.documentation.example', {
        defaultMessage: `## Run when Security case status changes
\`\`\`yaml
triggers:
  - type: {triggerId}
    on:
      condition: 'event.owner: "securitySolution" and event.updatedFields: "status"'
\`\`\``,
        values: {
          triggerId: CaseUpdatedTriggerId,
        },
      }),
    ],
  },
};
