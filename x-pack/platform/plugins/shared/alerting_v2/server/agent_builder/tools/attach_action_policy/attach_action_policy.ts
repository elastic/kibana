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
import { actionPolicyAttachmentDataSchema } from '@kbn/alerting-v2-schemas';
import { ensureToolPrivilege } from '../../common/unauthorized_tool_result';
import { createAttachmentsClient } from '../../../lib/attachments_client';
import { ALERTING_LOG_CODES } from '../../../lib/errors/error_codes';
import type { ActionPolicyClient } from '../../../lib/action_policy_client';
import type { LoggerServiceContract } from '../../../lib/services/logger_service/logger_service';
import type { PrivilegeChecker } from '../../../lib/services/privilege_checker/privilege_checker';

const attachActionPolicySchema = lazySchema(() =>
  z.object({
    policyId: z.string().min(1).max(256).describe('The id of the saved action policy to attach.'),
  })
);

export interface AttachActionPolicyToolDeps {
  logger: LoggerServiceContract;
  getActionPolicyClient: (context: {
    request: KibanaRequest;
    spaceId: string;
  }) => Pick<ActionPolicyClient, 'getActionPolicy'>;
  getPrivilegeChecker: (context: { request: KibanaRequest }) => PrivilegeChecker;
}

export const attachActionPolicyTool = ({
  logger,
  getActionPolicyClient,
  getPrivilegeChecker,
}: AttachActionPolicyToolDeps): BuiltinSkillBoundedTool<typeof attachActionPolicySchema> => ({
  id: ALERTING_TOOL_IDS.attachActionPolicy,
  type: ToolType.builtin,
  description: `Attach an existing, saved alerting V2 action policy to the conversation so it can be inspected or edited. Returns the \`attachment_id\` to pass as \`actionPolicyAttachmentId\` to ${ALERTING_TOOL_IDS.manageActionPolicy}. If the policy is already attached, returns the existing \`attachment_id\`. This tool does not modify the policy.`,
  schema: attachActionPolicySchema,
  handler: async ({ policyId }, { request, spaceId, attachments }) => {
    const unauthorized = await ensureToolPrivilege({
      privilegeChecker: getPrivilegeChecker({ request }),
      feature: 'actionPolicies',
      level: 'read',
      action: 'attach action policy',
    });
    if (unauthorized) {
      return unauthorized;
    }

    const { actionPolicies } = createAttachmentsClient(attachments);
    const existing = actionPolicies.list().find(({ origin }) => origin === policyId);
    if (existing) {
      return {
        results: [
          {
            type: ToolResultType.other,
            data: {
              success: true,
              attachment_id: existing.id,
              message: `Action policy "${policyId}" is already attached as '${existing.id}'; it was not added again.`,
            },
          },
        ],
      };
    }

    try {
      const policy = await getActionPolicyClient({ request, spaceId }).getActionPolicy({
        id: policyId,
      });
      const data = actionPolicyAttachmentDataSchema.parse(policy);
      const added = await actionPolicies.saveDraft(
        { ...actionPolicies.getDraft(), origin: policyId },
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
              message: `Action policy "${policyId}" attached as '${added.id}'. Use it as actionPolicyAttachmentId in ${ALERTING_TOOL_IDS.manageActionPolicy}.`,
            },
          },
        ],
      };
    } catch (error) {
      const isNotFound = Boom.isBoom(error) && error.output.statusCode === 404;
      if (!isNotFound) {
        logger.warn({
          message: 'Failed to attach action policy',
          code: ALERTING_LOG_CODES.AGENT_BUILDER_ATTACH_ACTION_POLICY_FAILED,
          labels: { policy_id: policyId, space_id: spaceId },
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
                ? `Action policy "${policyId}" was not found.`
                : `Failed to attach action policy "${policyId}": ${message}`,
            },
          },
        ],
      };
    }
  },
});
