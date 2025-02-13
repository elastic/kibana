/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { alertFieldMap, legacyAlertFieldMap } from '@kbn/alerts-as-data-utils';
import { pickWithPatterns } from '../../pick_with_patterns';

export const technicalRuleFieldMap = {
  ...pickWithPatterns(alertFieldMap, '*'),
  ...pickWithPatterns(legacyAlertFieldMap, '*'),
} as const;

export type TechnicalRuleFieldMap = typeof technicalRuleFieldMap;
