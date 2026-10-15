/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export { GROUP_SIZE_CEILING, MATCHER_PAGE_SIZE } from './constants';
export { buildMatchGroupsQuery, buildWatermarkQuery } from './query';
export { runEsqlMatcherRule, type RunEsqlMatcherDeps } from './run';
