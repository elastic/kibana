/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import { lazySchema, z } from '@kbn/zod/v4';
import { ToolType } from '@kbn/agent-builder-common';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import type { BuiltinSkillBoundedTool } from '@kbn/agent-builder-server/skills';
import { ACTION_POLICY_AUTHORING_SKILL_ID, ALERTING_TOOL_IDS } from '@kbn/alerting-v2-constants';
import { ensureToolPrivilege } from '../../common/unauthorized_tool_result';
import { formatMatcher } from '../../common/format_matcher';
import { ALERTING_LOG_CODES } from '../../../lib/errors/error_codes';
import type { ActionPolicyClient } from '../../../lib/action_policy_client';
import type { LoggerServiceContract } from '../../../lib/services/logger_service/logger_service';
import type { PrivilegeChecker } from '../../../lib/services/privilege_checker/privilege_checker';

const DEFAULT_PER_PAGE = 20;
const MAX_PER_PAGE = 50;

const findActionPoliciesSchema = lazySchema(() =>
  z.object({
    search: z
      .string()
      .max(512)
      .optional()
      .describe(
        '(optional) Keywords matched against the policy name and description only. Omit to list all policies.'
      ),
    page: z
      .number()
      .int()
      .min(1)
      .optional()
      .describe('(optional) The page to return. Defaults to 1.'),
    perPage: z
      .number()
      .int()
      .min(1)
      .max(MAX_PER_PAGE)
      .optional()
      .describe(
        `(optional) Policies per page, up to ${MAX_PER_PAGE}. Defaults to ${DEFAULT_PER_PAGE}.`
      ),
  })
);

export interface FindActionPoliciesToolDeps {
  logger: LoggerServiceContract;
  getActionPolicyClient: (context: {
    request: KibanaRequest;
    spaceId: string;
  }) => Pick<ActionPolicyClient, 'findActionPolicies'>;
  getPrivilegeChecker: (context: { request: KibanaRequest }) => PrivilegeChecker;
}

export const findActionPoliciesTool = ({
  logger,
  getActionPolicyClient,
  getPrivilegeChecker,
}: FindActionPoliciesToolDeps): BuiltinSkillBoundedTool<typeof findActionPoliciesSchema> => ({
  id: ALERTING_TOOL_IDS.findActionPolicies,
  type: ToolType.builtin,
  description: `Find alerting V2 action policies (notification policies) in the current space, optionally by keywords. Returns a page of policies with their id, name, enabled state, matcher, grouping mode, and destination count, plus the total. This tool is read-only. To create, inspect in detail, or modify a policy, load the ${ACTION_POLICY_AUTHORING_SKILL_ID} skill.`,
  schema: findActionPoliciesSchema,
  handler: async ({ search, page, perPage }, { request, spaceId }) => {
    const unauthorized = await ensureToolPrivilege({
      privilegeChecker: getPrivilegeChecker({ request }),
      feature: 'actionPolicies',
      level: 'read',
      action: 'find action policies',
    });
    if (unauthorized) {
      return unauthorized;
    }

    try {
      const response = await getActionPolicyClient({ request, spaceId }).findActionPolicies({
        ...(search ? { search } : {}),
        page,
        perPage: perPage ?? DEFAULT_PER_PAGE,
        sortField: 'name',
      });

      return {
        results: [
          {
            type: ToolResultType.other,
            data: {
              total: response.total,
              page: response.page,
              perPage: response.perPage,
              items: response.items.map(
                ({ id, name, description, enabled, matcher, grouping, destinations }) => ({
                  id,
                  name,
                  ...(description ? { description } : {}),
                  enabled,
                  matcher: matcher ? formatMatcher(matcher) : '{}',
                  groupingMode: grouping?.mode,
                  destinationCount: destinations.length,
                })
              ),
            },
          },
        ],
      };
    } catch (error) {
      logger.warn({
        message: 'Failed to find action policies',
        code: ALERTING_LOG_CODES.AGENT_BUILDER_FIND_ACTION_POLICIES_FAILED,
        labels: { space_id: spaceId },
        error,
      });
      const message = error instanceof Error ? error.message : String(error);
      return {
        results: [
          {
            type: ToolResultType.error,
            data: { message: `Failed to find action policies: ${message}` },
          },
        ],
      };
    }
  },
});
