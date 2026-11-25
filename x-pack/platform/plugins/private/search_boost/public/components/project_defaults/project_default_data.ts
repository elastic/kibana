/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isDefaultRule } from '../../../common/rules';
import type { BoostProfile, BoostProfileType, BoostRuleListItem } from '../../../common/types';
import type { ProjectDefaultCardData, ProjectDefaultsProps } from './project_defaults';

/** Each type's default rule and the profile it points to, left out when either is missing. */
export const getProjectDefaults = (
  profiles: readonly BoostProfile[],
  rules: readonly BoostRuleListItem[]
): Pick<ProjectDefaultsProps, 'indices' | 'dataStreams'> => {
  const getCardData = (type: BoostProfileType): ProjectDefaultCardData | undefined => {
    const rule = rules.find((item) => item.type === type && isDefaultRule(item));
    const profile = rule && profiles.find(({ name }) => name === rule.boost_profile);
    return profile && { ruleName: rule.name, profile, matches: rule.matches };
  };

  return { indices: getCardData('indices'), dataStreams: getCardData('data_streams') };
};
