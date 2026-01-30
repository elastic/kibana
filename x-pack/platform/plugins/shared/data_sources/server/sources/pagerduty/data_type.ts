/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { DataSource } from '@kbn/data-catalog-plugin';
import {
  generateListEscalationPoliciesWorkflow,
  generateListIncidentsWorkflow,
  generateListSchedulesWorkflow,
  generateListOnCallsWorkflow,
  generateDownloadWorkflow,
  generateSearchWorkflow,
} from './workflows';

export const pagerdutyDataSource: DataSource = {
  id: 'pagerduty',
  name: 'PagerDuty',
  description: i18n.translate('xpack.dataSources.pagerduty.description', {
    defaultMessage:
      'Connect to PagerDuty to access incidents, escalation policies, schedules, and related data.',
  }),

  iconType: '.pagerduty-v2',

  stackConnector: {
    type: '.pagerduty-v2',
    config: {},
  },

  generateWorkflows(stackConnectorId: string) {
    return [
      {
        content: generateDownloadWorkflow(stackConnectorId),
        shouldGenerateABTool: true,
      },
      {
        content: generateSearchWorkflow(stackConnectorId),
        shouldGenerateABTool: true,
      },
      {
        content: generateListEscalationPoliciesWorkflow(stackConnectorId),
        shouldGenerateABTool: false,
      },
      { content: generateListIncidentsWorkflow(stackConnectorId), shouldGenerateABTool: true },
      { content: generateListSchedulesWorkflow(stackConnectorId), shouldGenerateABTool: false },
      { content: generateListOnCallsWorkflow(stackConnectorId), shouldGenerateABTool: true },
    ];
  },
};
