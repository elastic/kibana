/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UnitStatsQueryContext } from './types';
import { buildEarliestStartRequest, readEarliestStartMs } from './unit_filter';

/**
 * Epoch ms of the first document for the unit, over all time and limited to the pinned
 * hash when there is one. Undefined when no document matches. Throws when the search fails.
 */
export const getEarliestStartMs = async ({
  esClient,
  unitId,
  configHash,
}: UnitStatsQueryContext): Promise<number | undefined> =>
  readEarliestStartMs(await esClient.search(buildEarliestStartRequest({ unitId, configHash })));
