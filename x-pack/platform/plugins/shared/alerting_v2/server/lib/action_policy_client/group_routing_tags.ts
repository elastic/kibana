/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ActionPolicyRoutingTagItem } from '@kbn/alerting-v2-schemas';
import type { ActionPolicyRoutingTagSource } from '../services/action_policy_saved_object_service/types';

interface TaggedPolicy {
  id: string;
  name: string;
  enabled: boolean;
}

const compareText = (a: string, b: string): number => {
  if (a === b) return 0;
  return a < b ? -1 : 1;
};

const comparePoliciesEnabledFirstThenName = (a: TaggedPolicy, b: TaggedPolicy): number => {
  if (a.enabled !== b.enabled) return a.enabled ? -1 : 1;
  return a.name.localeCompare(b.name) || compareText(a.id, b.id);
};

/**
 * Groups action policies by the routing tags in their `matcher.tags`.
 *
 * Catch-all and expression-only policies have no tags, so no tag is attributed to them. A tag
 * repeated within one policy counts once, and disabled policies are included. Tags are ordered by
 * the number of enabled policies that use them, then by the total number of policies, then by name,
 * so tags used only by disabled policies come last.
 */
export const groupRoutingTags = ({
  policies,
  search,
  policiesPerTag,
  tagsLimit,
}: {
  policies: readonly ActionPolicyRoutingTagSource[];
  search?: string;
  policiesPerTag: number;
  tagsLimit: number;
}): { items: ActionPolicyRoutingTagItem[]; totalTags: number } => {
  const policiesByTag = new Map<string, TaggedPolicy[]>();

  for (const { id, name, enabled, matcher } of policies) {
    for (const tag of new Set(matcher?.tags ?? [])) {
      if (search && !tag.startsWith(search)) continue;

      const tagged = policiesByTag.get(tag) ?? [];
      tagged.push({ id, name, enabled });
      policiesByTag.set(tag, tagged);
    }
  }

  const ranked = Array.from(policiesByTag, ([tag, tagged]) => ({
    tag,
    policies: tagged.sort(comparePoliciesEnabledFirstThenName),
    enabledCount: tagged.filter(({ enabled }) => enabled).length,
  })).sort(
    (a, b) =>
      b.enabledCount - a.enabledCount ||
      b.policies.length - a.policies.length ||
      compareText(a.tag, b.tag)
  );

  return {
    items: ranked.slice(0, tagsLimit).map(({ tag, policies: tagged }) => ({
      tag,
      policy_count: tagged.length,
      policies: tagged.slice(0, policiesPerTag).map(({ id, name }) => ({ id, name })),
    })),
    totalTags: ranked.length,
  };
};
