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

const toggleRuleSchema = z.object({
  ruleId: z.string().describe('The ID of the rule to enable or disable.'),
  enabled: z.boolean().describe('Set to true to enable, false to disable.'),
});

export const toggleRuleTool = (
  getScopedServices: ScopedServicesFactory
): BuiltinToolDefinition<typeof toggleRuleSchema> => ({
  id: `${internalNamespaces.alertingV2}.toggle_rule`,
  type: ToolType.builtin,
  description:
    'Enable or disable a single alerting rule. A simpler alternative to a full update when you just need to change the enabled state.',
  tags: ['alerting'],
  schema: toggleRuleSchema,
  handler: async ({ ruleId, enabled }, { request }) => {
    const { rulesClient } = await getScopedServices(request);

    const rule = enabled
      ? await rulesClient.enableRule({ id: ruleId })
      : await rulesClient.disableRule({ id: ruleId });

    return {
      results: [
        {
          type: ToolResultType.other,
          data: {
            message: `Rule "${rule.metadata.name}" has been ${enabled ? 'enabled' : 'disabled'}.`,
            rule,
          },
        },
      ],
    };
  },
});
