/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { IRouter } from '@kbn/core/server';
import { BOOST_RULES_API_PATH, MANAGE_BOOST_PRIVILEGE } from '../../common/constants';
import type { IndexPatternError, ProfileNameError } from '../../common/validation';
import {
  INDEX_PATTERN_MAX_LENGTH,
  MAX_RULE_PRIORITY,
  PROFILE_NAME_MAX_LENGTH,
  getIndexPatternError,
  getRuleNameError,
} from '../../common/validation';
import { createRule, deleteRule, getState, updateRule } from '../lib/boost_store';
import { toErrorResponse } from '../lib/errors';
import { getRequestClients } from './request_clients';

const RULE_NAME_MESSAGES: Record<ProfileNameError, string> = {
  required: 'must not be empty',
  too_long: `must be at most ${PROFILE_NAME_MAX_LENGTH} characters`,
  invalid_characters:
    'must contain only lowercase letters, numbers, hyphens, and underscores, and start with a letter or number',
  already_exists: 'is already in use',
};

const INDEX_PATTERN_MESSAGES: Record<IndexPatternError, string> = {
  required: 'must not be empty',
  too_long: `must be at most ${INDEX_PATTERN_MAX_LENGTH} characters`,
  invalid_characters: 'must be a single name or pattern, without commas or spaces',
};

const ruleNameSchema = schema.string({
  maxLength: PROFILE_NAME_MAX_LENGTH,
  validate: (name) => {
    const error = getRuleNameError(name);
    return error && RULE_NAME_MESSAGES[error];
  },
});

const ruleSchema = schema.object({
  name: ruleNameSchema,
  index_pattern: schema.string({
    maxLength: INDEX_PATTERN_MAX_LENGTH,
    validate: (pattern) => {
      const error = getIndexPatternError(pattern);
      return error && INDEX_PATTERN_MESSAGES[error];
    },
  }),
  boost_profile: schema.string({ minLength: 1, maxLength: PROFILE_NAME_MAX_LENGTH }),
  // Matches Elasticsearch, which defaults a missing priority to 0.
  priority: schema.number({
    defaultValue: 0,
    min: 0,
    max: MAX_RULE_PRIORITY,
    validate: (priority) =>
      Number.isInteger(priority) ? undefined : 'priority must be a whole number',
  }),
});

const ruleNameParamsSchema = schema.object({
  name: schema.string({ maxLength: PROFILE_NAME_MAX_LENGTH }),
});

export const registerRuleRoutes = (router: IRouter) => {
  router.post(
    {
      path: BOOST_RULES_API_PATH,
      security: { authz: { requiredPrivileges: [MANAGE_BOOST_PRIVILEGE] } },
      validate: { body: ruleSchema },
    },
    async (context, { body }, response) => {
      try {
        const { savedObjectsClient, esClient } = await getRequestClients(context);
        await createRule(savedObjectsClient, body);
        return response.ok({ body: await getState(savedObjectsClient, esClient) });
      } catch (error) {
        return toErrorResponse(response, error);
      }
    }
  );

  router.put(
    {
      path: `${BOOST_RULES_API_PATH}/{name}`,
      security: { authz: { requiredPrivileges: [MANAGE_BOOST_PRIVILEGE] } },
      validate: { params: ruleNameParamsSchema, body: ruleSchema },
    },
    async (context, { params: { name }, body }, response) => {
      try {
        const { savedObjectsClient, esClient } = await getRequestClients(context);
        await updateRule(savedObjectsClient, name, body);
        return response.ok({ body: await getState(savedObjectsClient, esClient) });
      } catch (error) {
        return toErrorResponse(response, error);
      }
    }
  );

  router.delete(
    {
      path: `${BOOST_RULES_API_PATH}/{name}`,
      security: { authz: { requiredPrivileges: [MANAGE_BOOST_PRIVILEGE] } },
      validate: { params: ruleNameParamsSchema },
    },
    async (context, { params: { name } }, response) => {
      try {
        const { savedObjectsClient, esClient } = await getRequestClients(context);
        await deleteRule(savedObjectsClient, name);
        return response.ok({ body: await getState(savedObjectsClient, esClient) });
      } catch (error) {
        return toErrorResponse(response, error);
      }
    }
  );
};
