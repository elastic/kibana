/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { IRouter } from '@kbn/core/server';
import {
  BOOST_DEFAULT_RULES_API_PATH,
  BOOST_MODE_API_PATH,
  BOOST_SIMPLE_DEFAULTS_API_PATH,
  BOOST_STATE_API_PATH,
  MANAGE_BOOST_PRIVILEGE,
  READ_BOOST_PRIVILEGE,
} from '../../common/constants';
import { PROFILE_NAME_MAX_LENGTH } from '../../common/validation';
import { getState, updateDefaultRule, updateMode, updateSimpleDefaults } from '../lib/boost_store';
import { toErrorResponse } from '../lib/errors';
import { getRequestClients } from './request_clients';
import { registerProfileRoutes } from './profiles';
import { registerRuleRoutes } from './rules';
import { registerPrototypeRoutes } from './prototype';

const simpleDefaultsSchema = schema.object({
  indices: schema.oneOf([
    schema.literal('on_demand'),
    schema.literal('performant'),
    schema.literal('high_availability'),
  ]),
  data_streams: schema.object({
    window: schema.oneOf([
      schema.literal('last_1_day'),
      schema.literal('last_3_days'),
      schema.literal('last_7_days'),
    ]),
  }),
});

const modeSchema = schema.object({
  mode: schema.oneOf([schema.literal('simple'), schema.literal('advanced')]),
});

const defaultRuleParamsSchema = schema.object({
  type: schema.oneOf([schema.literal('indices'), schema.literal('data_streams')]),
});

const defaultRuleBodySchema = schema.object({
  boost_profile: schema.string({ minLength: 1, maxLength: PROFILE_NAME_MAX_LENGTH }),
});

export const registerRoutes = (router: IRouter) => {
  router.get(
    {
      path: BOOST_STATE_API_PATH,
      security: { authz: { requiredPrivileges: [READ_BOOST_PRIVILEGE] } },
      validate: false,
    },
    async (context, _request, response) => {
      const { savedObjectsClient, esClient } = await getRequestClients(context);
      return response.ok({ body: await getState(savedObjectsClient, esClient) });
    }
  );

  router.put(
    {
      path: BOOST_SIMPLE_DEFAULTS_API_PATH,
      security: { authz: { requiredPrivileges: [MANAGE_BOOST_PRIVILEGE] } },
      validate: { body: simpleDefaultsSchema },
    },
    async (context, { body }, response) => {
      const { savedObjectsClient, esClient } = await getRequestClients(context);
      await updateSimpleDefaults(savedObjectsClient, body);
      return response.ok({ body: await getState(savedObjectsClient, esClient) });
    }
  );

  router.put(
    {
      path: BOOST_MODE_API_PATH,
      security: { authz: { requiredPrivileges: [MANAGE_BOOST_PRIVILEGE] } },
      validate: { body: modeSchema },
    },
    async (context, { body: { mode } }, response) => {
      const { savedObjectsClient, esClient } = await getRequestClients(context);
      await updateMode(savedObjectsClient, mode);
      return response.ok({ body: await getState(savedObjectsClient, esClient) });
    }
  );

  router.put(
    {
      path: `${BOOST_DEFAULT_RULES_API_PATH}/{type}`,
      security: { authz: { requiredPrivileges: [MANAGE_BOOST_PRIVILEGE] } },
      validate: { params: defaultRuleParamsSchema, body: defaultRuleBodySchema },
    },
    async (context, { params: { type }, body: { boost_profile: profileName } }, response) => {
      const { savedObjectsClient, esClient } = await getRequestClients(context);
      try {
        await updateDefaultRule(savedObjectsClient, type, profileName);
      } catch (error) {
        return toErrorResponse(response, error);
      }
      return response.ok({ body: await getState(savedObjectsClient, esClient) });
    }
  );

  registerProfileRoutes(router);
  registerRuleRoutes(router);
  registerPrototypeRoutes(router);
};
