/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { SML_RULE_TYPES } from '../../common/http_api/sml_rules';
import type {
  GetSmlRuleResponse,
  ListSmlRulesResponse,
  CreateOrUpdateSmlRuleResponse,
  DeleteSmlRuleResponse,
} from '../../common/http_api/sml_rules';
import { publicApiPath } from '../../common/constants';
import { AGENT_BUILDER_READ_SECURITY, AGENT_BUILDER_WRITE_SECURITY } from './route_security';
import { getHandlerWrapper } from './wrap_handler';
import { SmlRuleNotFoundError } from '../services/sml/sml_rule_service';
import type { RouteDependencies } from './types';

const smlRuleTypeSchema = schema.oneOf(
  SML_RULE_TYPES.map((t) => schema.literal(t)),
  {
    meta: {
      description:
        'The SML content type this rule applies to. Currently only `index` is supported.',
    },
  }
);

const smlRuleVariableSchema = schema.object(
  {
    type: schema.literal('esql', {
      meta: { description: 'Variable type. Only `esql` is supported.' },
    }),
    input: schema.string({
      meta: {
        description:
          'ES|QL query whose results are injected into the prompt template. Supports `${index_pattern}` substitution.',
      },
    }),
  },
  { meta: { description: 'An ES|QL query-based variable definition.' } }
);

export function registerSmlRuleRoutes({ router, getInternalServices, logger }: RouteDependencies) {
  const wrapHandler = getHandlerWrapper({ logger });

  // List rules for a type
  router.versioned
    .get({
      path: `${publicApiPath}/sml/{type}/rule`,
      security: AGENT_BUILDER_READ_SECURITY,
      access: 'public',
      summary: 'List SML rules',
      description:
        'List all SML rules for a given content type. Rules define how index metadata is summarized for the Semantic Metadata Layer.',
      options: {
        tags: ['sml', 'oas-tag:agent builder'],
        availability: {
          since: '9.2.0',
        },
      },
    })
    .addVersion(
      {
        version: '2023-10-31',
        validate: {
          request: {
            params: schema.object({
              type: smlRuleTypeSchema,
            }),
          },
        },
      },
      wrapHandler(async (ctx, request, response) => {
        const { smlRules } = getInternalServices();
        const rules = await smlRules.list({
          type: request.params.type,
          request,
        });
        return response.ok<ListSmlRulesResponse>({ body: { results: rules } });
      })
    );

  // Get rule by id
  router.versioned
    .get({
      path: `${publicApiPath}/sml/{type}/rule/{ruleId}`,
      security: AGENT_BUILDER_READ_SECURITY,
      access: 'public',
      summary: 'Get an SML rule by ID',
      description: 'Get a specific SML rule by its ID and content type.',
      options: {
        tags: ['sml', 'oas-tag:agent builder'],
        availability: {
          since: '9.2.0',
        },
      },
    })
    .addVersion(
      {
        version: '2023-10-31',
        validate: {
          request: {
            params: schema.object({
              type: smlRuleTypeSchema,
              ruleId: schema.string({
                meta: { description: 'The unique identifier of the SML rule.' },
              }),
            }),
          },
        },
      },
      wrapHandler(async (ctx, request, response) => {
        const { smlRules } = getInternalServices();
        try {
          const rule = await smlRules.get({
            type: request.params.type,
            ruleId: request.params.ruleId,
            request,
          });
          return response.ok<GetSmlRuleResponse>({ body: rule });
        } catch (error) {
          if (error instanceof SmlRuleNotFoundError) {
            return response.notFound({ body: { message: error.message } });
          }
          throw error;
        }
      })
    );

  // Create or update rule
  router.versioned
    .put({
      path: `${publicApiPath}/sml/{type}/rule/{ruleId}`,
      security: AGENT_BUILDER_WRITE_SECURITY,
      access: 'public',
      summary: 'Create or update an SML rule',
      description:
        'Create or update an SML rule that defines how indices matching a pattern are summarized. The rule specifies the prompt template, inference endpoint, and optional ES|QL-based variables.',
      options: {
        tags: ['sml', 'oas-tag:agent builder'],
        availability: {
          since: '9.2.0',
        },
      },
    })
    .addVersion(
      {
        version: '2023-10-31',
        validate: {
          request: {
            params: schema.object({
              type: smlRuleTypeSchema,
              ruleId: schema.string({
                meta: { description: 'The unique identifier for the SML rule.' },
              }),
            }),
            body: schema.object({
              name: schema.string({
                meta: { description: 'Human-readable name for the rule.' },
              }),
              index_pattern: schema.string({
                meta: {
                  description:
                    'Index pattern this rule applies to (e.g. `search-confluence-*` or `*`).',
                },
              }),
              prompt: schema.maybe(
                schema.string({
                  meta: {
                    description:
                      'Custom prompt template. Supports `${index_pattern}`, `${mappings}`, `${settings}`, `${field_caps}`, and `${variables.<name>}` substitutions.',
                  },
                })
              ),
              inference_id: schema.string({
                meta: {
                  description:
                    'The inference endpoint ID to use for chat completion (e.g. `my-llm-endpoint`).',
                },
              }),
              variables: schema.maybe(
                schema.recordOf(schema.string(), smlRuleVariableSchema, {
                  meta: {
                    description:
                      'Optional named variables whose ES|QL query results are injected into the prompt template.',
                  },
                })
              ),
            }),
          },
        },
      },
      wrapHandler(async (ctx, request, response) => {
        const { smlRules } = getInternalServices();
        const rule = await smlRules.createOrUpdate({
          type: request.params.type,
          ruleId: request.params.ruleId,
          body: request.body,
          request,
        });
        return response.ok<CreateOrUpdateSmlRuleResponse>({ body: rule });
      })
    );

  // Delete rule
  router.versioned
    .delete({
      path: `${publicApiPath}/sml/{type}/rule/{ruleId}`,
      security: AGENT_BUILDER_WRITE_SECURITY,
      access: 'public',
      summary: 'Delete an SML rule',
      description:
        'Delete an SML rule. Indices previously matched by this rule will fall back to the next matching or global rule.',
      options: {
        tags: ['sml', 'oas-tag:agent builder'],
        availability: {
          since: '9.2.0',
        },
      },
    })
    .addVersion(
      {
        version: '2023-10-31',
        validate: {
          request: {
            params: schema.object({
              type: smlRuleTypeSchema,
              ruleId: schema.string({
                meta: { description: 'The unique identifier of the SML rule to delete.' },
              }),
            }),
          },
        },
      },
      wrapHandler(async (ctx, request, response) => {
        const { smlRules } = getInternalServices();
        try {
          const result = await smlRules.delete({
            type: request.params.type,
            ruleId: request.params.ruleId,
            request,
          });
          return response.ok<DeleteSmlRuleResponse>({ body: result });
        } catch (error) {
          if (error instanceof SmlRuleNotFoundError) {
            return response.notFound({ body: { message: error.message } });
          }
          throw error;
        }
      })
    );
}
