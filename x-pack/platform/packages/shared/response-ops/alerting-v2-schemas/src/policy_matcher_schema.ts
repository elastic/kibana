/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { MAX_KQL_LENGTH } from './constants';

export const POLICY_MATCHER_TAGS_DESCRIPTION =
  "Rule tags this policy should match. The policy applies to alerts from any rule that has at least one of these tags. `matcher.tags` is separate from the policy's own `tags` field, which is used to organize and filter action policies. Omit `matcher.tags` or set it to `null` to match on `matcher.expression` alone.";

export const POLICY_MATCHER_EXPRESSION_DESCRIPTION =
  "A KQL query evaluated against each alert. You can query `episode_id`, `episode_status`, `group_hash`, `last_event_timestamp`, `severity`, `rule.id`, `rule.name`, `rule.tags`, and your rule's query output columns under `data.*` (for example, `data.host.name`). A query that references any other field never matches, and no error is returned. Omit `matcher.expression` or set it to `null` to match on `matcher.tags` alone.";

export const POLICY_MATCHER_DESCRIPTION =
  'Selects the alerts this policy applies to. Set `tags` to match alerts from rules that have those tags, or `expression` to a KQL query evaluated against each alert. If you set both, an alert must match the tags and the expression. If you set neither, the policy applies to all alerts.';

export const POLICY_MATCHER_UPDATE_DESCRIPTION =
  'Selects the alerts this policy applies to. Set `tags` to match alerts from rules that have those tags, or `expression` to a KQL query evaluated against each alert. If you set both, an alert must match the tags and the expression. Updating `matcher` replaces it entirely: to change `tags` without dropping `expression`, resend the current `expression` value. Set `matcher` to `null` to apply to all alerts.';

export const policyMatcherSchema = z.object({
  tags: z
    .array(z.string().min(1).max(256))
    .max(50)
    .nullable()
    .optional()
    .describe(POLICY_MATCHER_TAGS_DESCRIPTION),
  expression: z
    .string()
    .max(MAX_KQL_LENGTH)
    .nullable()
    .optional()
    .describe(POLICY_MATCHER_EXPRESSION_DESCRIPTION),
});

export type PolicyMatcher = z.infer<typeof policyMatcherSchema>;
