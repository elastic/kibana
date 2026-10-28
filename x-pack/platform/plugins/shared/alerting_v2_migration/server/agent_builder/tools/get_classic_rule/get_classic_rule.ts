/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import type { KibanaRequest, Logger } from '@kbn/core/server';
import { lazySchema, z } from '@kbn/zod/v4';
import { ToolType } from '@kbn/agent-builder-common';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import type { BuiltinSkillBoundedTool } from '@kbn/agent-builder-server/skills';
import type { RulesClient as ClassicRulesClient } from '@kbn/alerting-plugin/server';
import { ALERTING_TOOL_IDS } from '@kbn/alerting-v2-constants';
import { MIGRATION_LOG_CODES } from '../../../lib/log_codes';

const getClassicRuleSchema = lazySchema(() =>
  z.object({
    id: z.string().min(1).max(1024).describe('The id of the classic (v1) alerting rule.'),
  })
);

export interface GetClassicRuleToolDeps {
  logger: Logger;
  getClassicRulesClient: (request: KibanaRequest) => Promise<Pick<ClassicRulesClient, 'get'>>;
  isMigratable: (ruleTypeId: string) => boolean;
}

const errorResult = (message: string) => ({
  results: [{ type: ToolResultType.error, data: { message } }],
});

export const getClassicRuleTool = ({
  logger,
  getClassicRulesClient,
  isMigratable,
}: GetClassicRuleToolDeps): BuiltinSkillBoundedTool<typeof getClassicRuleSchema> => ({
  id: ALERTING_TOOL_IDS.getClassicRule,
  type: ToolType.builtin,
  description: `Fetch a classic (v1) alerting rule by id, including its rule type, consumer, schedule, params, and actions, and whether its rule type can be migrated to a universal alerting rule.

The rule is read with the current user's classic alerting privileges: the user must be able to read rules of the rule's type for its consumer in the current space. This tool is read-only.`,
  schema: getClassicRuleSchema,
  handler: async ({ id }, { request, spaceId }) => {
    try {
      const rulesClient = await getClassicRulesClient(request);
      const rule = await rulesClient.get({ id });

      return {
        results: [
          {
            type: ToolResultType.other,
            data: {
              id: rule.id,
              name: rule.name,
              ruleTypeId: rule.alertTypeId,
              consumer: rule.consumer,
              enabled: rule.enabled,
              tags: rule.tags,
              schedule: rule.schedule,
              params: rule.params,
              actions: rule.actions,
              alertDelay: rule.alertDelay,
              artifacts: rule.artifacts,
              migratable: isMigratable(rule.alertTypeId),
            },
          },
        ],
      };
    } catch (error) {
      if (Boom.isBoom(error) && error.output.statusCode === 403) {
        return errorResult(`Unauthorized to read classic rule "${id}": ${error.message}`);
      }
      if (Boom.isBoom(error) && error.output.statusCode === 404) {
        return errorResult(`Classic rule "${id}" was not found in the current space.`);
      }

      const message = error instanceof Error ? error.message : String(error);
      logger.warn(`Failed to fetch classic rule: ${message}`, {
        labels: {
          rule_id: id,
          space_id: spaceId,
          code: MIGRATION_LOG_CODES.AGENT_BUILDER_GET_CLASSIC_RULE_FAILED,
        },
      });
      return errorResult(`Failed to fetch classic rule "${id}": ${message}`);
    }
  },
});
