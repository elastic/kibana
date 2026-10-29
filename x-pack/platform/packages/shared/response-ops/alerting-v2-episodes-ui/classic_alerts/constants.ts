/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { OBSERVABILITY_RULE_TYPE_IDS, STACK_RULE_TYPE_IDS } from '@kbn/rule-data-utils';

export const CLASSIC_OBS_AND_STACK_RULE_TYPE_IDS = Array.from(
  new Set([...OBSERVABILITY_RULE_TYPE_IDS, ...STACK_RULE_TYPE_IDS])
);

export const CLASSIC_ALERTS_LIST_PAGE_SIZE = 1000;
export const CLASSIC_ALERTS_HISTOGRAM_LIMIT = 10_000;
export const CLASSIC_ALERTS_TAGS_LIMIT = 500;
export const CLASSIC_EPISODE_SOURCE_ID = 'v1';
