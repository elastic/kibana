/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MlAnomaliesTableRecord, MlEntityField } from '@kbn/ml-anomaly-utils';

// The table items could be aggregated, so we have to find the item
// that has the closest timestamp to the selected anomaly from the chart.
export function getTableItemClosestToTimestamp(
  anomalies: MlAnomaliesTableRecord[],
  anomalyTime: number,
  entityFields?: MlEntityField[]
) {
  const filteredAnomalies = entityFields
    ? anomalies.filter((anomaly) => {
        const currentEntity = {
          entityName: anomaly.entityName,
          entityValue: anomaly.entityValue,
        };

        return entityFields.some(
          (field) =>
            field.fieldName === currentEntity.entityName &&
            field.fieldValue === currentEntity.entityValue
        );
      })
    : anomalies;

  return filteredAnomalies.reduce<MlAnomaliesTableRecord | undefined>(
    (closestItem, currentItem) => {
      // If the closest item is not defined, return the current item.
      // This is the case when we start the reducer. For the case of an empty
      // array the reducer will not be called and the value will stay undefined.
      if (!closestItem) return currentItem;

      const closestItemDelta = Math.abs(anomalyTime - closestItem.source.timestamp);
      const currentItemDelta = Math.abs(anomalyTime - currentItem.source.timestamp);
      return currentItemDelta < closestItemDelta ? currentItem : closestItem;
    },
    undefined
  );
}
