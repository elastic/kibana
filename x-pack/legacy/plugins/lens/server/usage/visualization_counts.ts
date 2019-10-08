/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObjectsClient, SavedObjectsFindResponse } from 'src/core/server';
import { Document } from '../../public/persistence';
import { LensUsage } from './types';

function getTypeName(doc: Document): string {
  if (doc.visualizationType === 'lnsXY') {
    return (doc.state.visualization as { preferredSeriesType: string }).preferredSeriesType;
  } else {
    return doc.visualizationType as string;
  }
}

function groupByType(response: SavedObjectsFindResponse) {
  const byVisType: Record<string, number> = {};

  response.saved_objects.forEach(({ attributes }) => {
    const type = getTypeName(attributes as Document);

    if (byVisType[type]) {
      byVisType[type] += 1;
    } else {
      byVisType[type] = 1;
    }
  });

  return byVisType;
}

export async function getVisualizationCounts(
  savedObjectsClient: SavedObjectsClient
): Promise<LensUsage> {
  const [overall, last30, last90] = await Promise.all([
    savedObjectsClient.find({
      type: 'lens',
    }),

    savedObjectsClient.find({
      type: 'lens',
      filter: 'lens.updated_at >= "now-30d"',
    }),

    savedObjectsClient.find({
      type: 'lens',
      filter: 'lens.updated_at >= "now-90d"',
    }),
  ]);

  return {
    visualization_types_overall: groupByType(overall),
    visualization_types_last_30_days: groupByType(last30),
    visualization_types_last_90_days: groupByType(last90),
    saved_total: overall.total,
    saved_last_30_days: last30.total,
    saved_last_90_days: last90.total,
  };
}
