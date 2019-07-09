/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



import _ from 'lodash';

import { ml } from 'plugins/ml/services/ml_api_service';
import { isModelPlotEnabled } from 'plugins/ml/../common/util/job_utils';
import { buildConfigFromDetector } from 'plugins/ml/util/chart_config_builder';
import { mlResultsService } from 'plugins/ml/services/results_service';

function getMetricData(job, detectorIndex, entityFields, earliestMs, latestMs, interval) {
  if (isModelPlotEnabled(job, detectorIndex, entityFields)) {
    // Extract the partition, by, over fields on which to filter.
    const criteriaFields = [];
    const detector = job.analysis_config.detectors[detectorIndex];
    if (_.has(detector, 'partition_field_name')) {
      const partitionEntity = _.find(entityFields, { 'fieldName': detector.partition_field_name });
      if (partitionEntity !== undefined) {
        criteriaFields.push(
          { fieldName: 'partition_field_name', fieldValue: partitionEntity.fieldName },
          { fieldName: 'partition_field_value', fieldValue: partitionEntity.fieldValue });
      }
    }

    if (_.has(detector, 'over_field_name')) {
      const overEntity = _.find(entityFields, { 'fieldName': detector.over_field_name });
      if (overEntity !== undefined) {
        criteriaFields.push(
          { fieldName: 'over_field_name', fieldValue: overEntity.fieldName },
          { fieldName: 'over_field_value', fieldValue: overEntity.fieldValue });
      }
    }

    if (_.has(detector, 'by_field_name')) {
      const byEntity = _.find(entityFields, { 'fieldName': detector.by_field_name });
      if (byEntity !== undefined) {
        criteriaFields.push(
          { fieldName: 'by_field_name', fieldValue: byEntity.fieldName },
          { fieldName: 'by_field_value', fieldValue: byEntity.fieldValue });
      }
    }

    return mlResultsService.getModelPlotOutput(
      job.job_id,
      detectorIndex,
      criteriaFields,
      earliestMs,
      latestMs,
      interval
    );
  } else {
    return new Promise((resolve, reject) => {
      const obj = {
        success: true,
        results: {}
      };

      const chartConfig = buildConfigFromDetector(job, detectorIndex);

      mlResultsService.getMetricData(
        chartConfig.datafeedConfig.indices,
        entityFields,
        chartConfig.datafeedConfig.query,
        chartConfig.metricFunction,
        chartConfig.metricFieldName,
        chartConfig.timeField,
        earliestMs,
        latestMs,
        interval
      )
        .then((resp) => {
          _.each(resp.results, (value, time) => {
            obj.results[time] = {
              'actual': value
            };
          });

          resolve(obj);
        })
        .catch((resp) => {
          reject(resp);
        });

    });
  }
}

// Builds chart detail information (charting function description and entity counts) used
// in the title area of the time series chart.
// Queries Elasticsearch if necessary to obtain the distinct count of entities
// for which data is being plotted.
function getChartDetails(job, detectorIndex, entityFields, earliestMs, latestMs) {
  return new Promise((resolve, reject) => {
    const obj = { success: true, results: { functionLabel: '', entityData: { entities: [] } } };

    const chartConfig = buildConfigFromDetector(job, detectorIndex);
    let functionLabel = chartConfig.metricFunction;
    if (chartConfig.metricFieldName !== undefined) {
      functionLabel += ' ';
      functionLabel += chartConfig.metricFieldName;
    }
    obj.results.functionLabel = functionLabel;

    const blankEntityFields = _.filter(entityFields, (entity) => {
      return entity.fieldValue.length === 0;
    });

    // Look to see if any of the entity fields have defined values
    // (i.e. blank input), and if so obtain the cardinality.
    if (blankEntityFields.length === 0) {
      obj.results.entityData.count = 1;
      obj.results.entityData.entities = entityFields;
      resolve(obj);
    } else {
      const entityFieldNames = _.map(blankEntityFields, 'fieldName');
      ml.getCardinalityOfFields({
        index: chartConfig.datafeedConfig.indices,
        fieldNames: entityFieldNames,
        query: chartConfig.datafeedConfig.query,
        timeFieldName: chartConfig.timeField,
        earliestMs,
        latestMs
      })
        .then((results) => {
          _.each(blankEntityFields, (field) => {
            // results will not contain keys for non-aggregatable fields,
            // so store as 0 to indicate over all field values.
            obj.results.entityData.entities.push({
              fieldName: field.fieldName,
              cardinality: _.get(results, field.fieldName, 0)
            });
          });

          resolve(obj);
        })
        .catch((resp) => {
          reject(resp);
        });
    }

  });
}

export const mlTimeSeriesSearchService = {
  getMetricData,
  getChartDetails
};
