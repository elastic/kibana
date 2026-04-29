/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import _ from 'lodash';
import type { GeoContainmentAlertInstanceState } from '../types';

// Flatten agg results and get latest locations for each entity
export function transformResults(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  results: any,
  dateField: string,
  geoField: string
): Map<string, GeoContainmentAlertInstanceState[]> {
  const resultsMap = new Map<string, GeoContainmentAlertInstanceState[]>();
  const boundarySplitBuckets = results?.aggregations?.shapes?.buckets ?? {};
  for (const boundaryId in boundarySplitBuckets) {
    if (!Object.hasOwn(boundarySplitBuckets, boundaryId)) {
      continue;
    }

    const entitySplitBuckets = boundarySplitBuckets[boundaryId]?.entitySplit?.buckets ?? [];
    for (let i = 0; i < entitySplitBuckets.length; i++) {
      const entityName = entitySplitBuckets[i].key;
      const entityResults = resultsMap.get(entityName) ?? [];
      entityResults.push({
        // Required for zero down time (ZDT)
        // populate legacy location so non-updated-kibana nodes can handle new alert state
        //
        // Why 0,0 vs parsing WKT and populating actual location?
        // This loop gets processed for each entity location in each containing boundary, ie: its a hot loop
        // There is a mimial amount of time between one kibana node updating and all Kibana nodes being updated
        // vs a huge CPU penetatily for all kibana nodes for the rest of the time
        // Algorithm optimized for the more common use case where all Kibana nodes are running updated version
        location: [0, 0],
        locationWkt:
          entitySplitBuckets[i].entityHits?.hits?.hits?.[0]?.fields?.[geoField]?.[0] ?? '',
        shapeLocationId: boundaryId,
        dateInShape:
          entitySplitBuckets[i].entityHits?.hits?.hits?.[0]?.fields?.[dateField]?.[0] ?? null,
        docId: entitySplitBuckets[i].entityHits?.hits?.hits?.[0]?._id,
      });
      resultsMap.set(entityName, entityResults);
    }
  }

  // TODO remove sort
  // legacy algorithm sorted entity hits oldest to newest for an undocumented reason
  // preserving sort to avoid unknown breaking changes
  resultsMap.forEach((value, key) => {
    if (value.length > 1) {
      // sort oldest to newest
      resultsMap.set(key, _.orderBy(value, ['dateInShape'], ['desc', 'asc']));
    }
  });

  return resultsMap;
}
