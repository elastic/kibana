/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { queryIntSchema } from './common';

export const ACTION_POLICY_ROUTING_TAGS_SEARCH_MAX_LENGTH = 256;
export const ACTION_POLICY_ROUTING_TAGS_DEFAULT_POLICIES_PER_TAG = 5;
export const ACTION_POLICY_ROUTING_TAGS_MAX_POLICIES_PER_TAG = 20;

/** Query parameters for the action policy routing tags API. */
export const actionPolicyRoutingTagsParamsSchema = z
  .object({
    search: z
      .string()
      .max(ACTION_POLICY_ROUTING_TAGS_SEARCH_MAX_LENGTH)
      .optional()
      .describe(
        'Case-sensitive prefix to filter routing tags by. Returns the most-used routing tags when omitted.'
      ),
    policies_per_tag: queryIntSchema({
      min: 1,
      max: ACTION_POLICY_ROUTING_TAGS_MAX_POLICIES_PER_TAG,
    })
      .default(ACTION_POLICY_ROUTING_TAGS_DEFAULT_POLICIES_PER_TAG)
      .describe(
        'The maximum number of action policies to list for each routing tag. Defaults to 5.'
      ),
  })
  .strict();

export type ActionPolicyRoutingTagsParams = z.infer<typeof actionPolicyRoutingTagsParamsSchema>;

export const actionPolicyRoutingTagPolicySchema = z
  .object({
    id: z.string().describe('The action policy identifier.'),
    name: z.string().describe('The action policy name.'),
  })
  .describe('An action policy that uses a routing tag.');

export const actionPolicyRoutingTagItemSchema = z
  .object({
    tag: z.string().describe('The routing tag.'),
    policy_count: z
      .number()
      .int()
      .min(1)
      .describe(
        'The number of action policies in the space whose `matcher.tags` include the routing tag. Not limited by `policies_per_tag`.'
      ),
    policies: z
      .array(actionPolicyRoutingTagPolicySchema)
      .describe(
        'Up to `policies_per_tag` action policies that use the routing tag, enabled policies first and then by name.'
      ),
  })
  .describe('A routing tag and the action policies that use it.');

export type ActionPolicyRoutingTagItem = z.infer<typeof actionPolicyRoutingTagItemSchema>;

/** Action policy routing tags response schema. */
export const actionPolicyRoutingTagsResponseSchema = z
  .object({
    items: z
      .array(actionPolicyRoutingTagItemSchema)
      .describe(
        'The most-used routing tags, ordered by the number of enabled policies that use them, then by the total number of policies, then by name.'
      ),
    total_tags: z
      .number()
      .int()
      .min(0)
      .describe(
        'The number of distinct routing tags that match `search`, before the list in `items` is limited.'
      ),
    is_truncated: z
      .boolean()
      .describe(
        'Whether the space holds more action policies than were scanned, meaning the results may be incomplete.'
      ),
  })
  .describe('Routing tags used by action policies, with the policies that use them.')
  .meta({ id: 'alerting_action_policy_routing_tags_response' });

export type ActionPolicyRoutingTagsResponse = z.infer<typeof actionPolicyRoutingTagsResponseSchema>;
