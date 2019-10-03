/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObjectsClient } from 'src/core/server';

export async function getVisualizationCounts(savedObjectsClient: SavedObjectsClient) {
  const lensSavedObjects = await savedObjectsClient.find({
    type: 'lens',
  });

  const byType: Record<string, number> = {};

  lensSavedObjects.saved_objects.forEach(({ attributes }) => {
    let type;
    if (attributes.visualizationType === 'lnsXY') {
      type = attributes.state.visualization.preferredSeriesType;
    } else {
      type = attributes.visualizationType;
    }

    if (byType[type]) {
      byType[type] += 1;
    } else {
      byType[type] = 1;
    }
  });

  return {
    total: lensSavedObjects.total,
    visualization_types: byType,
  };
}
