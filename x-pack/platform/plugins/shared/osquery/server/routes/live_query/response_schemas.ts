/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

/**
 * Mirrors the query item shape from CreateLiveQueryResponse in create_live_query.gen.ts
 */
const liveQueryQueryItemSchema = schema.object(
  {
    action_id: schema.maybe(schema.string()),
    id: schema.maybe(schema.string()),
    query: schema.maybe(schema.string()),
    timeout: schema.maybe(schema.number()),
    ecs_mapping: schema.maybe(schema.nullable(schema.recordOf(schema.string(), schema.any()))),
    agents: schema.maybe(schema.arrayOf(schema.string())),
    saved_query_id: schema.maybe(schema.string()),
    version: schema.maybe(schema.string()),
    platform: schema.maybe(schema.string()),
  },
  { unknowns: 'allow' }
);

/**
 * Mirrors the query item shape from FindLiveQueryDetailsResponse in find_live_query.gen.ts
 * — extends the base query item with execution status fields.
 */
const liveQueryDetailsQueryItemSchema = schema.object(
  {
    action_id: schema.maybe(schema.string()),
    id: schema.maybe(schema.string()),
    query: schema.maybe(schema.string()),
    saved_query_id: schema.maybe(schema.nullable(schema.string())),
    ecs_mapping: schema.maybe(schema.nullable(schema.recordOf(schema.string(), schema.any()))),
    agents: schema.maybe(schema.arrayOf(schema.string())),
    docs: schema.maybe(schema.number()),
    failed: schema.maybe(schema.number()),
    pending: schema.maybe(schema.number()),
    responded: schema.maybe(schema.number()),
    successful: schema.maybe(schema.number()),
    status: schema.maybe(schema.string()),
  },
  { unknowns: 'allow' }
);

/**
 * Mirrors the items shape from FindLiveQueryResponse in find_live_query.gen.ts
 */
const findLiveQueryItemSchema = schema.object(
  {
    _source: schema.maybe(
      schema.object(
        {
          action_id: schema.maybe(schema.string()),
          expiration: schema.maybe(schema.string()),
          '@timestamp': schema.maybe(schema.string()),
          agents: schema.maybe(schema.arrayOf(schema.string())),
          user_id: schema.maybe(schema.string()),
          pack_id: schema.maybe(schema.string()),
          queries: schema.maybe(schema.arrayOf(liveQueryQueryItemSchema)),
          result_counts: schema.maybe(
            schema.object({
              total_rows: schema.maybe(schema.number()),
              // Single-query fields
              responded_agents: schema.maybe(schema.number()),
              // Pack-specific fields
              queries_with_results: schema.maybe(schema.number()),
              queries_total: schema.maybe(schema.number()),
              // Common fields
              successful_agents: schema.maybe(schema.number()),
              error_agents: schema.maybe(schema.number()),
            })
          ),
        },
        { unknowns: 'allow' }
      )
    ),
  },
  { unknowns: 'allow' }
);

/**
 * Mirrors the edge shape from GetLiveQueryResultsResponse in get_live_query_results.gen.ts
 */
const liveQueryResultEdgeSchema = schema.object(
  {
    _id: schema.maybe(schema.string()),
    _source: schema.maybe(schema.object({}, { unknowns: 'allow' })),
  },
  { unknowns: 'allow' }
);

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
      queries: schema.maybe(schema.arrayOf(liveQueryQueryItemSchema)),
    },
    { unknowns: 'allow' }
  ),
});

export const findLiveQueryResponseSchema = schema.object({
  data: schema.maybe(
    schema.object(
      {
        total: schema.maybe(schema.number()),
        items: schema.maybe(schema.arrayOf(findLiveQueryItemSchema)),
      },
      { unknowns: 'allow' }
    )
  ),
});

export const getLiveQueryDetailsResponseSchema = schema.object({
  data: schema.maybe(
    schema.object(
      {
        action_id: schema.maybe(schema.string()),
        expiration: schema.maybe(schema.string()),
        '@timestamp': schema.maybe(schema.string()),
        agents: schema.maybe(schema.arrayOf(schema.string())),
        user_id: schema.maybe(schema.string()),
        user_profile_uid: schema.maybe(schema.string()),
        pack_id: schema.maybe(schema.string()),
        pack_name: schema.maybe(schema.string()),
        prebuilt_pack: schema.maybe(schema.boolean()),
        tags: schema.maybe(schema.arrayOf(schema.string())),
        status: schema.maybe(schema.string()),
        queries: schema.maybe(schema.arrayOf(liveQueryDetailsQueryItemSchema)),
      },
      { unknowns: 'allow' }
    )
  ),
});

export const getLiveQueryResultsResponseSchema = schema.object({
  data: schema.maybe(
    schema.object(
      {
        total: schema.maybe(schema.number()),
        edges: schema.maybe(schema.arrayOf(liveQueryResultEdgeSchema)),
      },
      { unknowns: 'allow' }
    )
  ),
});

export const updateActionTagsResponseSchema = schema.object({
  data: schema.object({
    tags: schema.arrayOf(schema.string()),
  }),
});
