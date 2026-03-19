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

const getRuleSchema = z.object({
  ruleId: z.string().describe('The ID of the rule to retrieve.'),
});

export const getRuleTool = (
  getScopedServices: ScopedServicesFactory
): BuiltinToolDefinition<typeof getRuleSchema> => ({
  id: `${internalNamespaces.alertingV2}.get_rule`,
  type: ToolType.builtin,
  description:
    'Retrieve full details of a single alerting rule by ID, including its ES|QL query, schedule, grouping, recovery policy, and state transition configuration.',
  tags: ['alerting'],
  schema: getRuleSchema,
  handler: async ({ ruleId }, { request }) => {
    const { rulesClient } = await getScopedServices(request);
    const rule = await rulesClient.getRule({ id: ruleId });

    return {
      results: [
        {
          type: ToolResultType.other,
          data: rule,
        },
      ],
    };
  },
});
