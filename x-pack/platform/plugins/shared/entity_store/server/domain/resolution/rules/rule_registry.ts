/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  RESOLUTION_RULE_KINDS,
  RESOLUTION_RULE_IDS,
  type ResolutionRuleKind,
  type ResolutionRuleId,
} from '../../../../common/domain/resolution_rules/constants';

export interface ResolutionRuleConfig {
  id: ResolutionRuleId;
  kind: ResolutionRuleKind;
  description: string;
  defaultEnabled: boolean;
}

export const RESOLUTION_RULE_CONFIGS: ResolutionRuleConfig[] = [
  {
    id: RESOLUTION_RULE_IDS.EMAIL_EXACT_MATCH,
    kind: RESOLUTION_RULE_KINDS.SAME_FIELD,
    description: 'Email exact match across identity providers',
    defaultEnabled: true,
  },
  {
    id: RESOLUTION_RULE_IDS.RELATED_USER_ALIAS_RESOLUTION,
    kind: RESOLUTION_RULE_KINDS.RELATED_USER_ALIAS_RESOLUTION,
    description: 'Related user alias resolution across identity providers',
    defaultEnabled: false,
  },
];

export const getResolutionRuleConfig = (id: ResolutionRuleId): ResolutionRuleConfig | undefined =>
  RESOLUTION_RULE_CONFIGS.find((config) => config.id === id);
