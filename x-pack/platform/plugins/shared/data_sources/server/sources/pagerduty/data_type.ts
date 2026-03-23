/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { MCPAuthType } from '@kbn/connector-schemas/mcp';
import type { DataSource } from '@kbn/data-catalog-plugin';

export const pagerdutyDataSource: DataSource = {
  id: 'pagerduty',
  name: 'PagerDuty',
  description: i18n.translate('xpack.dataSources.pagerduty.description', {
    defaultMessage:
      'Connect to PagerDuty to access incidents, escalation policies, schedules, and related data.',
  }),

  iconType: '.pagerduty',

  stackConnectors: [
    {
      type: '.mcp',
      config: {
        serverUrl: 'https://mcp.pagerduty.com/mcp',
        hasAuth: true,
        authType: MCPAuthType.ApiKey,
        apiKeyHeaderName: 'Authorization',
        apiKeyHeaderValue: 'Token token={{apiKey}}',
      },
      importedTools: [
        { name: 'list_schedules' },
        { name: 'list_escalation_policies' },
        { name: 'list_incidents' },
        { name: 'list_oncalls' },
        { name: 'list_users' },
        { name: 'list_teams' },
        { name: 'get_schedule' },
        { name: 'get_incident' },
        { name: 'get_escalation_policy' },
        { name: 'get_team' },
        { name: 'get_user_data' },
      ],
    },
  ],

  workflows: {
    directory: __dirname + '/workflows',
  },
};
