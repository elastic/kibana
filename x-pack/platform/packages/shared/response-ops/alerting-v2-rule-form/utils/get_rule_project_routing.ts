/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ProjectRouting } from '@kbn/es-query';
import type { CPSPluginStart } from '@kbn/cps/public';
import { getProjectRoutingFromEsqlQuery } from '@kbn/esql-utils';

/**
 * Returns the CPS project routing a rule query runs with: the query's own
 * `SET project_routing`, otherwise the space default (same as rule executions).
 */
export const getRuleProjectRouting = (query: string, cps?: CPSPluginStart): ProjectRouting =>
  getProjectRoutingFromEsqlQuery(query) ?? cps?.cpsManager?.getDefaultProjectRouting();
