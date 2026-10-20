/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export { GROUP_SIZE_CEILING, MATCHER_PAGE_SIZE, RESOLVED_TO_FIELD } from './constants';
export {
  RAW_MATCH_VALUE_COLUMN,
  buildMatchGroupsQuery,
  buildMatcherValidationQuery,
  buildWatermarkQuery,
} from './query';
export {
  classifyMatchGroup,
  fetchEntities,
  parseMatchGroupRows,
  planMatchGroupLink,
  runEsqlMatcherRule,
  type MatchGroupRow,
  type RunEsqlMatcherDeps,
} from './run';
