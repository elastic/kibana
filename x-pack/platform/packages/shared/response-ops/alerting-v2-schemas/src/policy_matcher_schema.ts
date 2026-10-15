/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { MAX_TAG_LENGTH } from '@kbn/alerting-v2-constants';
import { MAX_KQL_LENGTH } from './constants';

/** Maximum number of tags that can be set on a policy matcher. */
export const POLICY_MATCHER_TAGS_MAX = 50;
/**
 * Matcher tags are compared against rule routing tags, so a longer one could never
 * match anything.
 */
export const POLICY_MATCHER_TAG_MAX_LENGTH = MAX_TAG_LENGTH;

// Only a PATCH accepts `null` on a matcher or its leaves, so each description comes in two
// flavours over a shared lead: following the PATCH wording on a create or replace is a 400.

const TAGS_LEAD =
  'Routing tags this policy should match. The policy applies to alerts from any rule whose `metadata.routing_tags` include at least one of these tags. An empty array is not accepted.';

export const POLICY_MATCHER_TAGS_DESCRIPTION = `${TAGS_LEAD} Omit \`matcher.tags\` to match on \`matcher.expression\` alone.`;

export const POLICY_MATCHER_TAGS_PATCH_DESCRIPTION = `${TAGS_LEAD} Omit \`matcher.tags\` to keep the stored tags, or set it to \`null\` to clear them and match on \`matcher.expression\` alone.`;

const EXPRESSION_LEAD =
  "A KQL query that's evaluated against each alert. Supported fields are: `alert_id`, `alert_status`, `group_hash`, `last_event_timestamp`, `severity`, and your rule's query output columns under `data.*` (for example, `data.host.name`). Referencing other fields won't work.";

export const POLICY_MATCHER_EXPRESSION_DESCRIPTION = `${EXPRESSION_LEAD} Omit \`matcher.expression\` to match on \`tags\` alone.`;

export const POLICY_MATCHER_EXPRESSION_PATCH_DESCRIPTION = `${EXPRESSION_LEAD} Omit \`matcher.expression\` to keep the stored expression, or set it to \`null\` to clear it and match on \`tags\` alone.`;

const MATCHER_LEAD =
  'Selects the alerts this policy applies to. Set `tags` to match alerts from rules with those routing tags. Set `expression` to a KQL query, which will be evaluated against each alert. <br/><br/> If you set both `tags` and `expression`, an alert must match the tags and the expression for the policy to apply.';

export const POLICY_MATCHER_DESCRIPTION = `${MATCHER_LEAD} At least one of \`tags\` and \`expression\` must be set, so an empty \`matcher\` is rejected. Omit \`matcher\` entirely for a catch-all policy that applies to all alerts.`;

export const POLICY_MATCHER_PATCH_DESCRIPTION = `${MATCHER_LEAD} Omit \`matcher\` to keep the stored matcher, or set it to \`null\` for a catch-all policy that applies to all alerts. An empty \`matcher\` names no leaf and so changes nothing; clearing the last of \`tags\` and \`expression\` clears the matcher itself, which is also a catch-all.`;

const MATCHER_AT_LEAST_ONE_MESSAGE =
  'matcher must set at least one of `tags`, `expression`; omit `matcher` for a catch-all policy.';

const namesAMatcherLeaf = (matcher: { tags?: string[]; expression?: string }): boolean =>
  matcher.tags !== undefined || matcher.expression !== undefined;

const matcherTagsSchema = z
  .array(z.string().min(1).max(POLICY_MATCHER_TAG_MAX_LENGTH))
  .min(1)
  .max(POLICY_MATCHER_TAGS_MAX);

const matcherExpressionSchema = z.string().max(MAX_KQL_LENGTH).trim().min(1);

export const policyMatcherSchema = z
  .object({
    tags: matcherTagsSchema.optional().describe(POLICY_MATCHER_TAGS_DESCRIPTION),
    expression: matcherExpressionSchema.optional().describe(POLICY_MATCHER_EXPRESSION_DESCRIPTION),
  })
  .strict()
  .refine(namesAMatcherLeaf, { message: MATCHER_AT_LEAST_ONE_MESSAGE });

export type PolicyMatcher = z.infer<typeof policyMatcherSchema>;

export const policyMatcherPatchSchema = z
  .object({
    tags: matcherTagsSchema.nullable().optional().describe(POLICY_MATCHER_TAGS_PATCH_DESCRIPTION),
    expression: matcherExpressionSchema
      .nullable()
      .optional()
      .describe(POLICY_MATCHER_EXPRESSION_PATCH_DESCRIPTION),
  })
  .strict();
