/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { RouteDependencies } from '../types';
import { getHandlerWrapper } from '../wrap_handler';
import {
  SKILL_USED_BY_AGENTS_ERROR_CODE,
  type BulkDeleteSkillResponse,
  type BulkDeleteSkillResult,
  type ListSkillsResponse,
} from '../../../common/http_api/skills';
import { internalApiPath } from '../../../common/constants';
import { AGENT_BUILDER_READ_SECURITY, SKILLS_WRITE_SECURITY } from '../route_security';
import { internalToPublicSummary } from '../../services/skills/utils';
import { resolveAgentSkills } from '../../services/execution/run_agent/utils/select_skills';

const SKILL_ID_STRING = schema.string({ minLength: 1, maxLength: 512 });

export function registerInternalSkillsRoutes({
  router,
  getInternalServices,
  logger,
}: RouteDependencies) {
  const wrapHandler = getHandlerWrapper({ logger });

  // list skills for a specific agent
  router.get(
    {
      path: `${internalApiPath}/agents/{agentId}/_skills`,
      validate: {
        params: schema.object({
          agentId: schema.string(),
        }),
      },
      options: { access: 'internal' },
      security: AGENT_BUILDER_READ_SECURITY,
    },
    wrapHandler(async (ctx, request, response) => {
      const { agents: agentsService, skills: skillService } = getInternalServices();

      const agentRegistry = await agentsService.getRegistry({ request });
      const agent = await agentRegistry.get(request.params.agentId);

      const skillRegistry = await skillService.getRegistry({ request });

      const agentSkills = await resolveAgentSkills({
        skills: skillRegistry,
        agentConfiguration: agent.configuration,
      });

      const results = await Promise.all(agentSkills.map(internalToPublicSummary));

      return response.ok<ListSkillsResponse>({ body: { results } });
    })
  );

  router.post(
    {
      path: `${internalApiPath}/skills/_bulk_delete`,
      validate: {
        body: schema.object({
          ids: schema.arrayOf(SKILL_ID_STRING, { minSize: 1, maxSize: 1000 }),
          force: schema.boolean({ defaultValue: false }),
        }),
      },
      options: { access: 'internal' },
      security: SKILLS_WRITE_SECURITY,
    },
    wrapHandler(async (ctx, request, response) => {
      const { ids, force } = request.body;
      const {
        skills: skillService,
        agents: agentsService,
        auditLogService,
      } = getInternalServices();

      if (!force) {
        const { agents } = await agentsService.getAgentsUsingSkills({
          request,
          skillIds: ids,
        });
        if (agents.length > 0) {
          return response.conflict({
            body: {
              message:
                'One or more skills are used by agents. Use force=true to remove them from agents and delete.',
              attributes: {
                code: SKILL_USED_BY_AGENTS_ERROR_CODE,
                agents,
              },
            },
          });
        }
      } else {
        const { agents } = await agentsService.removeSkillRefsFromAgents({
          request,
          skillIds: ids,
        });
        for (const agent of agents) {
          auditLogService.logAgentUpdated(request, {
            agentId: agent.id,
            agentName: agent.name,
          });
        }
      }

      const registry = await skillService.getRegistry({ request });
      const deleteResults = await Promise.allSettled(ids.map((id) => registry.delete(id)));

      const results: BulkDeleteSkillResult[] = deleteResults.map((result, index) => {
        if (result.status !== 'fulfilled') {
          return {
            skillId: ids[index],
            success: false,
            reason: result.reason.toJSON?.() ?? {
              error: { message: 'Unknown error' },
            },
          };
        }

        return {
          skillId: ids[index],
          success: true,
        };
      });

      auditLogService.logBulkSkillDeleteResults(request, { ids, deleteResults });

      return response.ok<BulkDeleteSkillResponse>({
        body: { results },
      });
    })
  );
}
