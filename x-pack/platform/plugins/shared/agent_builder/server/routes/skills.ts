/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AGENT_BUILDER_EXPERIMENTAL_FEATURES_SETTING_ID } from '@kbn/management-settings-ids';
import type { RouteDependencies } from './types';
import { getHandlerWrapper } from './wrap_handler';
import type {
  ListSkillsResponse,
  GetSkillResponse,
  DeleteSkillResponse,
  CreateSkillPayload,
  UpdateSkillPayload,
  CreateSkillResponse,
  UpdateSkillResponse,
} from '../../common/http_api/skills';
import { apiPrivileges } from '../../common/features';
import { publicApiPath } from '../../common/constants';
import { skillIdParamSchema, createSkillBodySchema, updateSkillBodySchema } from './skills_schemas';
import { builtinSkillToPublicDefinition } from '../services/skills/utils';

const featureFlagConfig = {
  featureFlag: AGENT_BUILDER_EXPERIMENTAL_FEATURES_SETTING_ID,
};

export function registerSkillsRoutes({ router, getInternalServices, logger }: RouteDependencies) {
  const wrapHandler = getHandlerWrapper({ logger });

  // list skills API
  router.versioned
    .get({
      path: `${publicApiPath}/skills`,
      security: {
        authz: { requiredPrivileges: [apiPrivileges.readAgentBuilder] },
      },
      access: 'public',
      summary: 'List skills',
      description: 'List all available skills (built-in and user-created).',
      options: {
        tags: ['skills', 'oas-tag:agent builder'],
      },
    })
    .addVersion(
      {
        version: '2023-10-31',
        validate: false,
      },
      wrapHandler(async (ctx, request, response) => {
        const { skills: skillService } = getInternalServices();
        const registry = await skillService.getRegistry({ request });
        const skills = await registry.list();
        return response.ok<ListSkillsResponse>({
          body: {
            results: skills,
          },
        });
      }, featureFlagConfig)
    );

  // get skill by ID
  router.versioned
    .get({
      path: `${publicApiPath}/skills/{skillId}`,
      security: {
        authz: { requiredPrivileges: [apiPrivileges.readAgentBuilder] },
      },
      access: 'public',
      summary: 'Get a skill by id',
      description: 'Get a specific skill by ID.',
      options: {
        tags: ['skills', 'oas-tag:agent builder'],
      },
    })
    .addVersion(
      {
        version: '2023-10-31',
        validate: {
          request: {
            params: skillIdParamSchema,
          },
        },
      },
      wrapHandler(async (ctx, request, response) => {
        const { skillId } = request.params;
        const { skills: skillService } = getInternalServices();
        const registry = await skillService.getRegistry({ request });
        const skill = await registry.get(skillId);
        if (!skill) {
          return response.notFound({
            body: { message: `Skill with id '${skillId}' not found` },
          });
        }

        const publicSkill: GetSkillResponse =
          'readonly' in skill ? (skill as GetSkillResponse) : builtinSkillToPublicDefinition(skill);

        return response.ok<GetSkillResponse>({
          body: publicSkill,
        });
      }, featureFlagConfig)
    );

  // create skill
  router.versioned
    .post({
      path: `${publicApiPath}/skills`,
      security: {
        authz: { requiredPrivileges: [apiPrivileges.manageAgentBuilder] },
      },
      access: 'public',
      summary: 'Create a skill',
      description: 'Create a new user-defined skill.',
      options: {
        tags: ['skills', 'oas-tag:agent builder'],
      },
    })
    .addVersion(
      {
        version: '2023-10-31',
        validate: {
          request: {
            body: createSkillBodySchema,
          },
        },
      },
      wrapHandler(async (ctx, request, response) => {
        const { skills: skillService } = getInternalServices();
        const createRequest: CreateSkillPayload = request.body;
        const registry = await skillService.getRegistry({ request });
        const skill = await registry.create(createRequest);
        return response.ok<CreateSkillResponse>({
          body: skill,
        });
      }, featureFlagConfig)
    );

  // update skill
  router.versioned
    .put({
      path: `${publicApiPath}/skills/{skillId}`,
      security: {
        authz: { requiredPrivileges: [apiPrivileges.manageAgentBuilder] },
      },
      access: 'public',
      summary: 'Update a skill',
      description: 'Update an existing user-created skill.',
      options: {
        tags: ['skills', 'oas-tag:agent builder'],
      },
    })
    .addVersion(
      {
        version: '2023-10-31',
        validate: {
          request: {
            params: skillIdParamSchema,
            body: updateSkillBodySchema,
          },
        },
      },
      wrapHandler(async (ctx, request, response) => {
        const { skills: skillService } = getInternalServices();
        const { skillId } = request.params;
        const update: UpdateSkillPayload = request.body;
        const registry = await skillService.getRegistry({ request });
        const skill = await registry.update(skillId, update);
        return response.ok<UpdateSkillResponse>({
          body: skill,
        });
      }, featureFlagConfig)
    );

  // delete skill
  router.versioned
    .delete({
      path: `${publicApiPath}/skills/{skillId}`,
      security: {
        authz: { requiredPrivileges: [apiPrivileges.manageAgentBuilder] },
      },
      access: 'public',
      summary: 'Delete a skill',
      description: 'Delete a user-created skill by ID. This action cannot be undone.',
      options: {
        tags: ['skills', 'oas-tag:agent builder'],
      },
    })
    .addVersion(
      {
        version: '2023-10-31',
        validate: {
          request: {
            params: skillIdParamSchema,
          },
        },
      },
      wrapHandler(async (ctx, request, response) => {
        const { skillId } = request.params;
        const { skills: skillService } = getInternalServices();
        const registry = await skillService.getRegistry({ request });
        const success = await registry.delete(skillId);
        return response.ok<DeleteSkillResponse>({
          body: { success },
        });
      }, featureFlagConfig)
    );
}
