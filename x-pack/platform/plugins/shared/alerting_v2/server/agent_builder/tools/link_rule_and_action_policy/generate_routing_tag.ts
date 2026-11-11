/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHash } from 'crypto';

const MAX_SLUG_LENGTH = 40;
const ID_SUFFIX_LENGTH = 8;
const FALLBACK_PREFIX = 'rule';

const slugify = (value: string): string =>
  value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, MAX_SLUG_LENGTH)
    .replace(/-+$/g, '');

/**
 * Builds a routing tag from a readable slug of the rule name plus a short hash of the
 * full stable rule id (ids can be client-supplied, so a prefix of the id is not unique). The same rule always yields the same tag, even if it is renamed later
 * (the tag is only generated once and stored), and two rules with the same name do not collide.
 */
export const generateRoutingTag = ({
  ruleName,
  ruleId,
}: {
  ruleName?: string;
  ruleId: string;
}): string => {
  const suffix = createHash('sha256').update(ruleId).digest('hex').slice(0, ID_SUFFIX_LENGTH);
  const slug = slugify(ruleName ?? '') || FALLBACK_PREFIX;
  return `${slug}-${suffix}`;
};
