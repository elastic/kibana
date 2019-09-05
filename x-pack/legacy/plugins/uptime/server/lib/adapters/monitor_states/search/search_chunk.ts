/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {ChunkResult, refinePotentialMatches} from "./refine_potential_matches";
import {findPotentialMatches} from "./find_potential_matches";
import {QueryContext} from "../elasticsearch_monitor_states_adapter";

export const searchChunk = async (queryContext: QueryContext, searchAfter: any, size: number): Promise<ChunkResult> => {
  const { monitorIds, checkGroups, searchAfter: foundSearchAfter } = await findPotentialMatches(
    queryContext,
    searchAfter,
    size
  );
const matching = await refinePotentialMatches(queryContext, monitorIds, checkGroups);

return {
  monitorIdGroups: matching,
  searchAfter: foundSearchAfter,
};
}
