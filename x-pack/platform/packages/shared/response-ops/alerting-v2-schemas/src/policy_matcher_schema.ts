/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { MAX_KQL_LENGTH } from './constants';

export const POLICY_MATCHER_TAGS_DESCRIPTION =
  'Rule tags this policy should match. The policy applies to alerts from rules that have at least one of these tags. Omit or set to `null` if you do not want to filter by tags.';

export const POLICY_MATCHER_EXPRESSION_DESCRIPTION =
  'KQL query evaluated against alert data. Common fields include `rule.id`, `rule.name`, `rule.tags`, `episode_status`, and `severity`. Rule query columns live under `data.*` (for example `data.host.name`). Omit or set to `null` if you do not want an additional query.';

export const POLICY_MATCHER_DESCRIPTION =
  'Criteria that determine which alerts this policy notifies on. Set `tags` to match rules that have any of those tags, and/or `expression` to a KQL query against alert data. When both are omitted or empty, the policy matches all alerts.';

export const POLICY_MATCHER_UPDATE_DESCRIPTION =
  'Criteria that determine which alerts this policy notifies on. Set `tags` to match rules that have any of those tags, and/or `expression` to a KQL query against alert data. The matcher is replaced as a whole: omitted fields are not kept from the existing matcher. To change `tags` without dropping an existing `expression`, include that same `expression` value in the request. Set `matcher` to `null` to match all alerts.';

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
