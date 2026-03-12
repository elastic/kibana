/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { AGENT_BUILDER_EXPERIMENTAL_FEATURES_SETTING_ID } from '@kbn/management-settings-ids';
import { skillCreateRequestSchema, skillUpdateRequestSchema } from '@kbn/agent-builder-common';
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
import { publicApiPath } from '../../common/constants';
import { internalToPublicDefinition, internalToPublicSummary } from '../services/skills/utils';
import { AGENT_BUILDER_READ_SECURITY, SKILLS_WRITE_SECURITY } from './route_security';

const REFERENCED_CONTENT_SCHEMA = schema.arrayOf(
  schema.object({
    name: schema.string({
      meta: { description: 'Name of the referenced content.' },
    }),
    relativePath: schema.string({
      meta: { description: 'Relative path of the referenced content.' },
    }),
    content: schema.string({
      meta: { description: 'Content of the reference.' },
    }),
  }),
  { maxSize: 100 }
);

const SKILL_ID_PARAMS_SCHEMA = schema.object({
  skillId: schema.string({
    meta: { description: 'The unique identifier of the skill.' },
  }),
});

const featureFlagConfig = {
  featureFlag: AGENT_BUILDER_EXPERIMENTAL_FEATURES_SETTING_ID,
};

export function registerSkillsRoutes({
  router,
  getInternalServices,
  logger,
  analyticsService,
}: RouteDependencies) {
  const wrapHandler = getHandlerWrapper({ logger });

  // list skills API
  router.versioned
    .get({
      path: `${publicApiPath}/skills`,
      security: AGENT_BUILDER_READ_SECURITY,
      access: 'public',
      summary: 'List skills',
      description: 'List all available skills (built-in and user-created).',
      options: {
        tags: ['skills', 'oas-tag:agent builder'],
        availability: {
          stability: 'experimental',
          since: '9.4.0',
        },
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
        const skills = await registry.list({ summaryOnly: true });
        const results = await Promise.all(skills.map(internalToPublicSummary));
        return response.ok<ListSkillsResponse>({
          body: { results },
        });
      }, featureFlagConfig)
    );

  // get skill by ID
  router.versioned
    .get({
      path: `${publicApiPath}/skills/{skillId}`,
      security: AGENT_BUILDER_READ_SECURITY,
      access: 'public',
      summary: 'Get a skill by id',
      description: 'Get a specific skill by ID.',
      options: {
        tags: ['skills', 'oas-tag:agent builder'],
        availability: {
          stability: 'experimental',
          since: '9.4.0',
        },
      },
    })
    .addVersion(
      {
        version: '2023-10-31',
        validate: {
          request: {
            params: SKILL_ID_PARAMS_SCHEMA,
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

        const publicSkill = await internalToPublicDefinition(skill);
        return response.ok<GetSkillResponse>({
          body: publicSkill,
        });
      }, featureFlagConfig)
    );

  // create skill
  router.versioned
    .post({
      path: `${publicApiPath}/skills`,
      security: SKILLS_WRITE_SECURITY,
      access: 'public',
      summary: 'Create a skill',
      description: 'Create a new user-defined skill.',
      options: {
        tags: ['skills', 'oas-tag:agent builder'],
        availability: {
          stability: 'experimental',
          since: '9.4.0',
        },
      },
    })
    .addVersion(
      {
        version: '2023-10-31',
        validate: {
          request: {
            body: schema.object({
              id: schema.string({
                meta: { description: 'Unique identifier for the skill.' },
              }),
              name: schema.string({
                meta: { description: 'Human-readable name for the skill.' },
              }),
              description: schema.string({
                meta: { description: 'Description of what the skill does.' },
              }),
              content: schema.string({
                meta: { description: 'Skill instructions content (markdown).' },
              }),
              referenced_content: schema.maybe(REFERENCED_CONTENT_SCHEMA),
              tool_ids: schema.arrayOf(
                schema.string({
                  meta: { description: 'Tool ID from the tool registry.' },
                }),
                {
                  defaultValue: [],
                  maxSize: 100,
                  meta: {
                    description: 'Tool IDs from the tool registry that this skill references.',
                  },
                }
              ),
            }),
          },
        },
      },
      wrapHandler(async (ctx, request, response) => {
        const parseResult = skillCreateRequestSchema.safeParse(request.body);
        if (!parseResult.success) {
          return response.badRequest({
            body: { message: parseResult.error.issues.map((e) => e.message).join('; ') },
          });
        }
        const createRequest: CreateSkillPayload = parseResult.data;
        const { skills: skillService, auditLogService } = getInternalServices();
        const registry = await skillService.getRegistry({ request });
        const skill = await registry.create(createRequest);
        analyticsService?.reportSkillCreated({ skillId: skill.id });
        auditLogService.logSkillCreated(request, { skillId: skill.id });
        const publicSkill = await internalToPublicDefinition(skill);
        return response.ok<CreateSkillResponse>({
          body: publicSkill,
        });
      }, featureFlagConfig)
    );

  // update skill
  router.versioned
    .put({
      path: `${publicApiPath}/skills/{skillId}`,
      security: SKILLS_WRITE_SECURITY,
      access: 'public',
      summary: 'Update a skill',
      description: 'Update an existing user-created skill.',
      options: {
        tags: ['skills', 'oas-tag:agent builder'],
        availability: {
          stability: 'experimental',
          since: '9.4.0',
        },
      },
    })
    .addVersion(
      {
        version: '2023-10-31',
        validate: {
          request: {
            params: SKILL_ID_PARAMS_SCHEMA,
            body: schema.object({
              name: schema.maybe(
                schema.string({
                  meta: { description: 'Updated name for the skill.' },
                })
              ),
              description: schema.maybe(
                schema.string({
                  meta: { description: 'Updated description.' },
                })
              ),
              content: schema.maybe(
                schema.string({
                  meta: { description: 'Updated skill instructions content.' },
                })
              ),
              referenced_content: schema.maybe(REFERENCED_CONTENT_SCHEMA),
              tool_ids: schema.maybe(
                schema.arrayOf(
                  schema.string({
                    meta: { description: 'Updated tool ID.' },
                  }),
                  {
                    maxSize: 100,
                    meta: { description: 'Updated tool IDs from the tool registry.' },
                  }
                )
              ),
            }),
          },
        },
      },
      wrapHandler(async (ctx, request, response) => {
        const parseResult = skillUpdateRequestSchema.safeParse(request.body);
        if (!parseResult.success) {
          return response.badRequest({
            body: { message: parseResult.error.issues.map((e) => e.message).join('; ') },
          });
        }
        const { skills: skillService, auditLogService } = getInternalServices();
        const { skillId } = request.params;
        const update: UpdateSkillPayload = parseResult.data;
        const registry = await skillService.getRegistry({ request });
        const skill = await registry.update(skillId, update);
        analyticsService?.reportSkillUpdated({ skillId: skill.id });
        auditLogService.logSkillUpdated(request, { skillId: skill.id });
        const publicSkill = await internalToPublicDefinition(skill);
        return response.ok<UpdateSkillResponse>({
          body: publicSkill,
        });
      }, featureFlagConfig)
    );

  // delete skill
  router.versioned
    .delete({
      path: `${publicApiPath}/skills/{skillId}`,
      security: SKILLS_WRITE_SECURITY,
      access: 'public',
      summary: 'Delete a skill',
      description: 'Delete a user-created skill by ID. This action cannot be undone.',
      options: {
        tags: ['skills', 'oas-tag:agent builder'],
        availability: {
          stability: 'experimental',
          since: '9.4.0',
        },
      },
    })
    .addVersion(
      {
        version: '2023-10-31',
        validate: {
          request: {
            params: SKILL_ID_PARAMS_SCHEMA,
          },
        },
      },
      wrapHandler(async (ctx, request, response) => {
        const { skillId } = request.params;
        const { skills: skillService, auditLogService } = getInternalServices();
        const registry = await skillService.getRegistry({ request });
        const success = await registry.delete(skillId);
        if (success) {
          analyticsService?.reportSkillDeleted({ skillId });
          auditLogService.logSkillDeleted(request, { skillId });
        }
        return response.ok<DeleteSkillResponse>({
          body: { success },
        });
      }, featureFlagConfig)
    );
}
