/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { IRouter } from '@kbn/core/server';
import {
  BOOST_PROFILES_API_PATH,
  MANAGE_BOOST_PRIVILEGE,
  MAX_BOOST,
  MIN_BOOST,
} from '../../common/constants';
import type { BoostRangeError, MaxAgeError, ProfileNameError } from '../../common/validation';
import {
  getBoostRangeError,
  getMaxAgeError,
  getProfileNameError,
  isPinnedWithoutPrewarm,
  MAX_AGE_MAX_DAYS,
  parseMaxAge,
  PROFILE_NAME_MAX_LENGTH,
} from '../../common/validation';
import { createProfile, deleteProfile, getState, updateProfile } from '../lib/boost_store';
import { toErrorResponse } from '../lib/errors';
import { getRequestClients } from './request_clients';

const PROFILE_NAME_MESSAGES: Record<ProfileNameError, string> = {
  required: 'must not be empty',
  too_long: `must be at most ${PROFILE_NAME_MAX_LENGTH} characters`,
  invalid_characters:
    'must contain only lowercase letters, numbers, hyphens, and underscores, and start with a letter or number',
  already_exists: 'is already in use',
};

const BOOST_RANGE_MESSAGES: Record<BoostRangeError, string> = {
  min_required: 'min_boost is required',
  max_required: 'max_boost is required',
  min_out_of_range: `min_boost must be between ${MIN_BOOST} and ${MAX_BOOST}`,
  max_out_of_range: `max_boost must be between ${MIN_BOOST} and ${MAX_BOOST}`,
  max_not_positive: 'max_boost must be greater than 0',
  max_below_min: 'max_boost must be greater than or equal to min_boost',
};

const MAX_AGE_MESSAGES: Record<MaxAgeError, string> = {
  required: 'max_age is required, in whole days or hours (for example 7d or 12h)',
  out_of_range: `max_age must be a whole number of days or hours, from 1h up to ${MAX_AGE_MAX_DAYS}d`,
  below_previous_period: "max_age must not be shorter than the previous period's max_age",
};

const nameSchema = schema.string({
  maxLength: PROFILE_NAME_MAX_LENGTH,
  validate: (name) => {
    const error = getProfileNameError(name);
    return error && PROFILE_NAME_MESSAGES[error];
  },
});

const boostRangeValidator = ({
  min_boost: min,
  max_boost: max,
}: {
  min_boost: number;
  max_boost: number;
}) => {
  const error = getBoostRangeError(min, max);
  return error && BOOST_RANGE_MESSAGES[error];
};

const periodSchema = schema.object(
  {
    min_boost: schema.number(),
    max_boost: schema.number(),
    max_age: schema.string({ maxLength: 16 }),
  },
  { validate: boostRangeValidator }
);

const backgroundPeriodSchema = schema.object(
  { min_boost: schema.number(), max_boost: schema.number() },
  { validate: boostRangeValidator }
);

const indicesProfileSchema = schema.object(
  {
    type: schema.literal('indices'),
    name: nameSchema,
    min_boost: schema.number(),
    max_boost: schema.number(),
    high_availability: schema.oneOf([schema.literal('one_extra_copy'), schema.literal('none')]),
    prewarm: schema.boolean(),
    pinned: schema.boolean(),
  },
  {
    validate: (profile) =>
      boostRangeValidator(profile) ??
      (isPinnedWithoutPrewarm(profile) ? 'pinned requires prewarm' : undefined),
  }
);

const dataStreamsProfileSchema = schema.object(
  {
    type: schema.literal('data_streams'),
    name: nameSchema,
    recent: periodSchema,
    standard: periodSchema,
    background: backgroundPeriodSchema,
  },
  {
    validate: ({ recent, standard }) => {
      const recentMaxAge = parseMaxAge(recent.max_age);
      const recentError = getMaxAgeError(recentMaxAge);
      if (recentError) {
        return `[recent]: ${MAX_AGE_MESSAGES[recentError]}`;
      }
      const standardError = getMaxAgeError(parseMaxAge(standard.max_age), recentMaxAge);
      return standardError && `[standard]: ${MAX_AGE_MESSAGES[standardError]}`;
    },
  }
);

const profileSchema = schema.oneOf([indicesProfileSchema, dataStreamsProfileSchema]);

const profileNameParamsSchema = schema.object({
  name: schema.string({ maxLength: PROFILE_NAME_MAX_LENGTH }),
});

export const registerProfileRoutes = (router: IRouter) => {
  router.post(
    {
      path: BOOST_PROFILES_API_PATH,
      security: { authz: { requiredPrivileges: [MANAGE_BOOST_PRIVILEGE] } },
      validate: { body: profileSchema },
    },
    async (context, { body }, response) => {
      try {
        const { savedObjectsClient, esClient } = await getRequestClients(context);
        await createProfile(savedObjectsClient, body);
        return response.ok({ body: await getState(savedObjectsClient, esClient) });
      } catch (error) {
        return toErrorResponse(response, error);
      }
    }
  );

  router.put(
    {
      path: `${BOOST_PROFILES_API_PATH}/{name}`,
      security: { authz: { requiredPrivileges: [MANAGE_BOOST_PRIVILEGE] } },
      validate: { params: profileNameParamsSchema, body: profileSchema },
    },
    async (context, { params: { name }, body }, response) => {
      try {
        const { savedObjectsClient, esClient } = await getRequestClients(context);
        await updateProfile(savedObjectsClient, name, body);
        return response.ok({ body: await getState(savedObjectsClient, esClient) });
      } catch (error) {
        return toErrorResponse(response, error);
      }
    }
  );

  router.delete(
    {
      path: `${BOOST_PROFILES_API_PATH}/{name}`,
      security: { authz: { requiredPrivileges: [MANAGE_BOOST_PRIVILEGE] } },
      validate: { params: profileNameParamsSchema },
    },
    async (context, { params: { name } }, response) => {
      try {
        const { savedObjectsClient, esClient } = await getRequestClients(context);
        await deleteProfile(savedObjectsClient, name);
        return response.ok({ body: await getState(savedObjectsClient, esClient) });
      } catch (error) {
        return toErrorResponse(response, error);
      }
    }
  );
};
