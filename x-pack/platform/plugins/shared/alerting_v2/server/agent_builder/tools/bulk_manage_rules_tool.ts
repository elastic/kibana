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

const bulkManageRulesSchema = z.object({
  action: z
    .enum(['enable', 'disable', 'delete'])
    .describe('The bulk action to perform on the matched rules.'),
  ids: z.array(z.string()).min(1).describe('List of rule IDs to perform the action on.'),
});

export const bulkManageRulesTool = (
  getScopedServices: ScopedServicesFactory
): BuiltinToolDefinition<typeof bulkManageRulesSchema> => ({
  id: `${internalNamespaces.alertingV2}.bulk_manage_rules`,
  type: ToolType.builtin,
  description: 'Bulk enable, disable, or delete multiple alerting rules at once by ID.',
  tags: ['alerting'],
  schema: bulkManageRulesSchema,
  confirmation: { askUser: 'always' },
  handler: async ({ action, ids }, { request, events }) => {
    const { rulesClient } = await getScopedServices(request);

    events.reportProgress(`Performing bulk ${action} on ${ids.length} rules...`);

    const successes: string[] = [];
    const errors: Array<{ id: string; error: string }> = [];

    for (const id of ids) {
      try {
        switch (action) {
          case 'enable':
            await rulesClient.enableRule({ id });
            break;
          case 'disable':
            await rulesClient.disableRule({ id });
            break;
          case 'delete':
            await rulesClient.deleteRule({ id });
            break;
        }
        successes.push(id);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        errors.push({ id, error: message });
      }
    }

    return {
      results: [
        {
          type: ToolResultType.other,
          data: {
            message: `Bulk ${action} completed: ${successes.length} succeeded, ${errors.length} failed.`,
            successes,
            errors,
          },
        },
      ],
    };
  },
});
