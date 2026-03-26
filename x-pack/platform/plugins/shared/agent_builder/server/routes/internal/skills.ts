/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { RouteDependencies } from '../types';
import { getHandlerWrapper } from '../wrap_handler';
import type { ListSkillsResponse } from '../../../common/http_api/skills';
import { internalApiPath } from '../../../common/constants';
import { AGENT_BUILDER_READ_SECURITY } from '../route_security';
import { internalToPublicSummary } from '../../services/skills/utils';
import { resolveAgentSkills } from '../../services/agents/modes/utils/select_skills';

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
}
