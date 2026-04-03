/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { RouteDependencies } from './types';
import { getHandlerWrapper } from './wrap_handler';
import { publicApiPath } from '../../common/constants';
import { AGENT_BUILDER_READ_SECURITY, AGENT_BUILDER_WRITE_SECURITY } from './route_security';
import type {
  GetSmlRuleResponse,
  ListSmlRulesResponse,
  CreateOrUpdateSmlRuleResponse,
  DeleteSmlRuleResponse,
} from '../../common/http_api/sml_rules';

/**
 * Validation schema for a single variable definition.
 *
 * Uses `schema.oneOf` with discriminated objects per variable type.
 * To add a new variable type, add a new `schema.object` branch here.
 */
const VARIABLE_SCHEMA = schema.oneOf([
  schema.object({
    type: schema.literal('index'),
    input: schema.oneOf(
      [schema.literal('_mapping'), schema.literal('_settings'), schema.literal('_field_caps')],
      {
        meta: {
          description:
            'The index metadata endpoint to fetch. Supported values: _mapping, _settings, _field_caps.',
        },
      }
    ),
    params: schema.maybe(
      schema.recordOf(schema.string(), schema.string(), {
        meta: { description: 'Optional parameters for the index metadata request.' },
      })
    ),
  }),
  schema.object({
    type: schema.literal('esql'),
    input: schema.string({
      minLength: 1,
      meta: { description: 'The ES|QL query to execute.' },
    }),
    params: schema.maybe(
      schema.recordOf(schema.string(), schema.string(), {
        meta: { description: 'Optional parameters for the ES|QL query.' },
      })
    ),
  }),
]);

/**
 * Validation schema for the SML rule body (create or update).
 */
const RULE_BODY_SCHEMA = schema.object({
  name: schema.string({
    minLength: 1,
    meta: { description: 'Display name for the rule.' },
  }),
  type: schema.literal('index'),
  index_pattern: schema.string({
    minLength: 1,
    meta: { description: 'Elasticsearch index pattern this rule applies to.' },
  }),
  inference_id: schema.string({
    minLength: 1,
    meta: { description: 'ID of the configured chat completion inference endpoint.' },
  }),
  prompt: schema.string({
    minLength: 1,
    meta: {
      description:
        'Prompt template. Use ${variables.<name>} syntax to reference defined variables.',
    },
  }),
  variables: schema.recordOf(schema.string(), VARIABLE_SCHEMA, {
    meta: {
      description:
        'Map of named variable definitions. Each variable has a type and input, and is referenced in the prompt via ${variables.<name>}.',
    },
  }),
});

const RULE_ID_PARAMS_SCHEMA = schema.object({
  ruleId: schema.string({
    meta: { description: 'The unique identifier of the SML rule.' },
  }),
});

export function registerSmlRulesRoutes({
  router,
  coreSetup,
  getInternalServices,
  logger,
}: RouteDependencies) {
  const wrapHandler = getHandlerWrapper({ logger });

  // Create or update an SML rule
  router.versioned
    .post({
      path: `${publicApiPath}/sml/rule/{ruleId}`,
      security: AGENT_BUILDER_WRITE_SECURITY,
      access: 'public',
      summary: 'Create or update an SML rule',
      description:
        'Create a new SML rule or update an existing one. Rules define how Elasticsearch indices should be summarized by an LLM.',
      options: {
        tags: ['sml-rules', 'oas-tag:agent builder'],
        availability: { since: '9.2.0' },
      },
    })
    .addVersion(
      {
        version: '2023-10-31',
        validate: {
          request: {
            params: RULE_ID_PARAMS_SCHEMA,
            body: RULE_BODY_SCHEMA,
          },
        },
      },
      wrapHandler(async (ctx, request, response) => {
        const { smlRules } = getInternalServices();
        const [coreStart] = await coreSetup.getStartServices();
        const esClient = coreStart.elasticsearch.client.asScoped(request).asInternalUser;
        const rule = await smlRules.createOrUpdate(request.params.ruleId, request.body, esClient);
        return response.ok<CreateOrUpdateSmlRuleResponse>({ body: rule });
      })
    );

  // List all SML rules
  router.versioned
    .get({
      path: `${publicApiPath}/sml/rule`,
      security: AGENT_BUILDER_READ_SECURITY,
      access: 'public',
      summary: 'List all SML rules',
      description: 'Retrieve all registered SML rules.',
      options: {
        tags: ['sml-rules', 'oas-tag:agent builder'],
        availability: { since: '9.2.0' },
      },
    })
    .addVersion(
      {
        version: '2023-10-31',
        validate: false,
      },
      wrapHandler(async (ctx, request, response) => {
        const { smlRules } = getInternalServices();
        const [coreStart] = await coreSetup.getStartServices();
        const esClient = coreStart.elasticsearch.client.asScoped(request).asInternalUser;
        const rules = await smlRules.list(esClient);
        return response.ok<ListSmlRulesResponse>({ body: { results: rules } });
      })
    );

  // Get a single SML rule by ID
  router.versioned
    .get({
      path: `${publicApiPath}/sml/rule/{ruleId}`,
      security: AGENT_BUILDER_READ_SECURITY,
      access: 'public',
      summary: 'Get an SML rule by ID',
      description: 'Retrieve a specific SML rule by its unique identifier.',
      options: {
        tags: ['sml-rules', 'oas-tag:agent builder'],
        availability: { since: '9.2.0' },
      },
    })
    .addVersion(
      {
        version: '2023-10-31',
        validate: {
          request: {
            params: RULE_ID_PARAMS_SCHEMA,
          },
        },
      },
      wrapHandler(async (ctx, request, response) => {
        const { smlRules } = getInternalServices();
        const [coreStart] = await coreSetup.getStartServices();
        const esClient = coreStart.elasticsearch.client.asScoped(request).asInternalUser;
        const rule = await smlRules.get(request.params.ruleId, esClient);
        return response.ok<GetSmlRuleResponse>({ body: rule });
      })
    );

  // Delete an SML rule
  router.versioned
    .delete({
      path: `${publicApiPath}/sml/rule/{ruleId}`,
      security: AGENT_BUILDER_WRITE_SECURITY,
      access: 'public',
      summary: 'Delete an SML rule',
      description: 'Delete an SML rule by its unique identifier. This action cannot be undone.',
      options: {
        tags: ['sml-rules', 'oas-tag:agent builder'],
        availability: { since: '9.2.0' },
      },
    })
    .addVersion(
      {
        version: '2023-10-31',
        validate: {
          request: {
            params: RULE_ID_PARAMS_SCHEMA,
          },
        },
      },
      wrapHandler(async (ctx, request, response) => {
        const { smlRules } = getInternalServices();
        const [coreStart] = await coreSetup.getStartServices();
        const esClient = coreStart.elasticsearch.client.asScoped(request).asInternalUser;
        const success = await smlRules.delete(request.params.ruleId, esClient);
        return response.ok<DeleteSmlRuleResponse>({ body: { success } });
      })
    );
}
