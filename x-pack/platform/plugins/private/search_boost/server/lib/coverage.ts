/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  BoostProfile,
  BoostProfileType,
  BoostRule,
  BoostRuleListItem,
  BoostRuleMatch,
} from '../../common/types';

/** What `GET _boost/explain` says about an index or data stream. */
export interface BoostExplanation {
  name: string;
  type: BoostProfileType;
  isHidden: boolean;
  /** The rules that match it, highest ranked first. The first one applies. */
  matchedRuleNames: string[];
}

/**
 * Lists every rule with the indices or data streams it matches. A match that a higher-ranked rule
 * applies to instead names that rule.
 */
export const getRuleListItems = (
  rules: BoostRule[],
  profiles: BoostProfile[],
  explanations: BoostExplanation[]
): BoostRuleListItem[] => {
  const matchesByRule = new Map(rules.map(({ name }): [string, BoostRuleMatch[]] => [name, []]));

  explanations.forEach(({ name, isHidden, matchedRuleNames }) => {
    const [appliedRuleName] = matchedRuleNames;
    matchedRuleNames.forEach((ruleName) => {
      matchesByRule.get(ruleName)?.push({
        name,
        isHidden,
        outrankedByRuleName: ruleName === appliedRuleName ? undefined : appliedRuleName,
      });
    });
  });

  const profileTypes = new Map(profiles.map(({ name, type }) => [name, type]));
  return rules.flatMap((rule) => {
    const type = profileTypes.get(rule.boost_profile);
    return type ? [{ ...rule, type, matches: matchesByRule.get(rule.name) ?? [] }] : [];
  });
};
