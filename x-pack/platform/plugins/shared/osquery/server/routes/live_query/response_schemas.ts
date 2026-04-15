/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

export const createLiveQueryResponseSchema = schema.object({
  data: schema.object(
    {
      action_id: schema.string(),
      '@timestamp': schema.maybe(schema.string()),
      expiration: schema.maybe(schema.string()),
      type: schema.maybe(schema.string()),
      input_type: schema.maybe(schema.string()),
      agent_ids: schema.maybe(schema.arrayOf(schema.string())),
      agent_all: schema.maybe(schema.boolean()),
      agent_platforms: schema.maybe(schema.arrayOf(schema.string())),
      agent_policy_ids: schema.maybe(schema.arrayOf(schema.string())),
      agents: schema.maybe(schema.arrayOf(schema.string())),
      user_id: schema.maybe(schema.string()),
      pack_id: schema.maybe(schema.nullable(schema.string())),
      metadata: schema.maybe(schema.nullable(schema.any())),
      queries: schema.maybe(schema.arrayOf(schema.any())),
    },
    { unknowns: 'allow' }
  ),
});

export const findLiveQueryResponseSchema = schema.object({
  data: schema.object(
    {
      total: schema.maybe(schema.number()),
      items: schema.maybe(schema.arrayOf(schema.any())),
    },
    { unknowns: 'allow' }
  ),
});

export const getLiveQueryDetailsResponseSchema = schema.object({
  data: schema.object(
    {
      action_id: schema.maybe(schema.string()),
      expiration: schema.maybe(schema.string()),
      '@timestamp': schema.maybe(schema.string()),
      agents: schema.maybe(schema.arrayOf(schema.string())),
      user_id: schema.maybe(schema.string()),
      status: schema.maybe(schema.string()),
      queries: schema.maybe(schema.arrayOf(schema.any())),
    },
    { unknowns: 'allow' }
  ),
});

export const getLiveQueryResultsResponseSchema = schema.object({
  data: schema.object(
    {
      total: schema.maybe(schema.number()),
      edges: schema.maybe(schema.arrayOf(schema.any())),
    },
    { unknowns: 'allow' }
  ),
});

export const updateActionTagsResponseSchema = schema.object({
  data: schema.object({
    tags: schema.arrayOf(schema.string()),
  }),
});
