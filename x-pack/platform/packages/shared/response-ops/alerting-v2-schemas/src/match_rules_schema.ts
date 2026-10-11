/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { FIND_DEFAULT_PER_PAGE, FIND_MAX_RESULT_WINDOW, MAX_PER_PAGE } from './constants';
import { policyMatcherSchema } from './policy_matcher_schema';

export const matchRulesBodySchema = z
  .object({
    matcher: policyMatcherSchema
      .nullable()
      .optional()
      .describe(
        'The policy scope to match rules against. Only alert rules (`kind: alert`) can match, because signal rules never create alerts. A rule matches when its `metadata.routing_tags` include at least one of the tags in `matcher.tags`. `matcher.expression` is evaluated against each alert at dispatch time, so it does not narrow down the matching rules. When `matcher` is omitted, `null`, or has no tags, every alert rule matches.'
      ),
    page: z
      .number()
      .int()
      .min(1)
      .max(FIND_MAX_RESULT_WINDOW)
      .optional()
      .describe(
        `The page number to return. Defaults to 1. \`page * per_page\` cannot exceed ${FIND_MAX_RESULT_WINDOW}.`
      ),
    per_page: z
      .number()
      .int()
      .min(1)
      .max(MAX_PER_PAGE)
      .optional()
      .describe(`The number of rules to return per page. Defaults to ${FIND_DEFAULT_PER_PAGE}.`),
  })
  .strict()
  .refine(
    ({ page = 1, per_page = FIND_DEFAULT_PER_PAGE }) => page * per_page <= FIND_MAX_RESULT_WINDOW,
    { message: `page * per_page cannot exceed ${FIND_MAX_RESULT_WINDOW}.`, path: ['page'] }
  )
  .meta({ id: 'alerting_match_rules_request' });

export type MatchRulesBody = z.infer<typeof matchRulesBodySchema>;
