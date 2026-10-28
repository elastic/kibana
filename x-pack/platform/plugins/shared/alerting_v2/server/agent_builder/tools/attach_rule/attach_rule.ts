/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import type { KibanaRequest } from '@kbn/core/server';
import { lazySchema, z } from '@kbn/zod/v4';
import { ToolType } from '@kbn/agent-builder-common';
import { ATTACHMENT_REF_ACTOR } from '@kbn/agent-builder-common/attachments';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import type { BuiltinSkillBoundedTool } from '@kbn/agent-builder-server/skills';
import { ALERTING_TOOL_IDS } from '@kbn/alerting-v2-constants';
import { ruleAttachmentDataSchema } from '@kbn/alerting-v2-schemas';
import { ensureToolPrivilege } from '../../common/unauthorized_tool_result';
import { createAttachmentsClient } from '../../../lib/attachments_client';
import { ALERTING_LOG_CODES } from '../../../lib/errors/error_codes';
import type { RulesClient } from '../../../lib/rules_client';
import type { LoggerServiceContract } from '../../../lib/services/logger_service/logger_service';
import type { PrivilegeChecker } from '../../../lib/services/privilege_checker/privilege_checker';

const attachRuleSchema = lazySchema(() =>
  z.object({
    ruleId: z.string().min(1).max(256).describe('The id of the saved rule to attach.'),
  })
);

export interface AttachRuleToolDeps {
  logger: LoggerServiceContract;
  getRulesClient: (context: {
    request: KibanaRequest;
    spaceId: string;
  }) => Pick<RulesClient, 'getRule'>;
  getPrivilegeChecker: (context: { request: KibanaRequest }) => PrivilegeChecker;
}

export const attachRuleTool = ({
  logger,
  getRulesClient,
  getPrivilegeChecker,
}: AttachRuleToolDeps): BuiltinSkillBoundedTool<typeof attachRuleSchema> => ({
  id: ALERTING_TOOL_IDS.attachRule,
  type: ToolType.builtin,
  description: `Attach an existing, saved alerting V2 rule to the conversation so it can be inspected or edited. Returns the \`attachment_id\` to pass as \`ruleAttachmentId\` to ${ALERTING_TOOL_IDS.manageRule}. If the rule is already attached, returns the existing \`attachment_id\`. This tool does not modify the rule.`,
  schema: attachRuleSchema,
  handler: async ({ ruleId }, { request, spaceId, attachments }) => {
    const unauthorized = await ensureToolPrivilege({
      privilegeChecker: getPrivilegeChecker({ request }),
      feature: 'rules',
      level: 'read',
      action: 'attach rule',
    });
    if (unauthorized) {
      return unauthorized;
    }

    const { rules } = createAttachmentsClient(attachments);
    const existing = rules.list().find(({ origin }) => origin === ruleId);
    if (existing) {
      return {
        results: [
          {
            type: ToolResultType.other,
            data: {
              success: true,
              attachment_id: existing.id,
              message: `Rule "${ruleId}" is already attached as '${existing.id}'; it was not added again.`,
            },
          },
        ],
      };
    }

    try {
      const rule = await getRulesClient({ request, spaceId }).getRule({ id: ruleId });
      const data = ruleAttachmentDataSchema.parse(rule);
      const added = await rules.saveDraft(
        { ...rules.getDraft(), origin: ruleId },
        data,
        ATTACHMENT_REF_ACTOR.agent
      );

      return {
        results: [
          {
            type: ToolResultType.other,
            data: {
              success: true,
              attachment_id: added.id,
              message: `Rule "${ruleId}" attached as '${added.id}'. Use it as ruleAttachmentId in ${ALERTING_TOOL_IDS.manageRule}.`,
            },
          },
        ],
      };
    } catch (error) {
      const isNotFound = Boom.isBoom(error) && error.output.statusCode === 404;
      if (!isNotFound) {
        logger.warn({
          message: 'Failed to attach rule',
          code: ALERTING_LOG_CODES.AGENT_BUILDER_ATTACH_RULE_FAILED,
          labels: { rule_id: ruleId, space_id: spaceId },
          error,
        });
      }
      const message = error instanceof Error ? error.message : String(error);
      return {
        results: [
          {
            type: ToolResultType.error,
            data: {
              message: isNotFound
                ? `Rule "${ruleId}" was not found.`
                : `Failed to attach rule "${ruleId}": ${message}`,
            },
          },
        ],
      };
    }
  },
});
