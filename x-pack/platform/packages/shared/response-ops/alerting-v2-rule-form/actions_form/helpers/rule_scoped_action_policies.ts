/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import { toSlugIdentifier } from '@kbn/std';
import { MAX_TAG_LENGTH } from '@kbn/alerting-v2-constants';
import type { PolicyMatcher } from '@kbn/alerting-v2-schemas';

const RULE_NOTIFICATION_TAG_PREFIX = 'notify-';
const MAX_SLUG_LENGTH = MAX_TAG_LENGTH - RULE_NOTIFICATION_TAG_PREFIX.length;

/**
 * Generates a tag for an untagged rule so a simple-action policy has something to match on.
 * Format: `notify-<slug-of-rule-name>`, truncated to MAX_TAG_LENGTH chars.
 * Falls back to a uuid suffix when the name slugifies to an empty string.
 */
export const buildRuleNotificationTag = (ruleName: string): string => {
  const slug = toSlugIdentifier(ruleName).slice(0, MAX_SLUG_LENGTH).replace(/-+$/, '');
  return `${RULE_NOTIFICATION_TAG_PREFIX}${slug || uuidv4()}`;
};

/**
 * Returns true when the rule already has a usable (non-blank) first tag that can serve
 * as the notification tag, false when a `notify-<slug>` tag needs to be generated.
 * Single source of truth for this predicate — used by both `resolveRuleNotificationTag`
 * and callers that write the tag back to the rule before creating action policies.
 */
export const ruleHasNotificationTag = (metadata: { tags?: string[] }): boolean =>
  Boolean(metadata.tags?.[0]?.trim());

/**
 * Returns the tag a simple-action policy should use as its matcher for the given rule.
 * When the rule already has tags, the first tag is reused (no tag is added to the rule).
 * When the rule has no tags, a new `notify-<slug>` tag is generated (the caller is responsible
 * for writing this tag to the rule's metadata before saving).
 */
export const resolveRuleNotificationTag = (metadata: { name: string; tags?: string[] }): string => {
  if (ruleHasNotificationTag(metadata)) return metadata.tags![0].trim();
  return buildRuleNotificationTag(metadata.name);
};

/**
 * The matcher the simple-action flow writes when linking a policy to a rule tag.
 */
export const buildRuleScopedMatcher = (tag: string): PolicyMatcher => ({ tags: [tag] });
