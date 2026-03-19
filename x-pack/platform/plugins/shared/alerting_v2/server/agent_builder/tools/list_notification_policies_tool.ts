/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { ToolType, ToolResultType } from '@kbn/agent-builder-common';
import { internalNamespaces } from '@kbn/agent-builder-common/base/namespaces';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server';
import type { ScopedServicesFactory } from '../scoped_services';

const listNotificationPoliciesSchema = z.object({
  page: z.number().optional().describe('Page number (1-based). Defaults to 1.'),
  perPage: z.number().optional().describe('Results per page. Defaults to 20.'),
});

export const listNotificationPoliciesTool = (
  getScopedServices: ScopedServicesFactory
): BuiltinToolDefinition<typeof listNotificationPoliciesSchema> => ({
  id: `${internalNamespaces.alertingV2}.list_notification_policies`,
  type: ToolType.builtin,
  description:
    'List notification policies that control how and when alerts dispatch actions (e.g. email, Slack, PagerDuty). Returns policy summaries including matchers, action connectors, throttling and suppression settings.',
  tags: ['alerting'],
  schema: listNotificationPoliciesSchema,
  handler: async ({ page, perPage }, { request }) => {
    const { notificationPolicyClient } = await getScopedServices(request);
    const result = await notificationPolicyClient.findNotificationPolicies({
      page: page ?? 1,
      perPage: perPage ?? 20,
    });

    return {
      results: [
        {
          type: ToolResultType.other,
          data: result,
        },
      ],
    };
  },
});
