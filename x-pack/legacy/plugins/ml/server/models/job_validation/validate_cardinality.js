/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';

import { DataVisualizer } from '../data_visualizer';

import { validateJobObject } from './validate_job_object';

function isValidCategorizationConfig(job, fieldName) {
  return (
    typeof job.analysis_config.categorization_field_name !== 'undefined' &&
    fieldName === 'mlcategory'
  );
}

function isScriptField(job, fieldName) {
  const scriptFields = Object.keys(_.get(job, 'datafeed_config.script_fields', {}));
  return scriptFields.includes(fieldName);
}

// Thresholds to determine whether cardinality is
// too high or low for certain fields analysis
const OVER_FIELD_CARDINALITY_THRESHOLD_LOW = 10;
const OVER_FIELD_CARDINALITY_THRESHOLD_HIGH = 1000000;
const PARTITION_FIELD_CARDINALITY_THRESHOLD = 1000;
const BY_FIELD_CARDINALITY_THRESHOLD = 1000;
const MODEL_PLOT_THRESHOLD_HIGH = 100;

const validateFactory = (callWithRequest, job) => {
  const dv = new DataVisualizer(callWithRequest);

  const modelPlotConfigTerms = _.get(job, ['model_plot_config', 'terms'], '');
  const modelPlotConfigFieldCount =
    modelPlotConfigTerms.length > 0 ? modelPlotConfigTerms.split(',').length : 0;

  return async ({ type, isInvalid, messageId }) => {
    // modelPlotCardinality counts the cardinality of fields used within detectors.
    // if model_plot_config.terms is used, it doesn't count the real cardinality of the field
    // but adds only the count of fields used in model_plot_config.terms
    let modelPlotCardinality = 0;
    const messages = [];
    const fieldName = `${type}_field_name`;

    const detectors = job.analysis_config.detectors;
    const relevantDetectors = detectors.filter(detector => {
      return typeof detector[fieldName] !== 'undefined';
    });

    if (relevantDetectors.length > 0) {
      try {
        const uniqueFieldNames = _.uniq(relevantDetectors.map(f => f[fieldName]));

        // use fieldCaps endpoint to get data about whether fields are aggregatable
        const fieldCaps = await callWithRequest('fieldCaps', {
          index: job.datafeed_config.indices.join(','),
          fields: uniqueFieldNames,
        });

        let aggregatableFieldNames = [];
        // parse fieldCaps to return an array of just the fields which are aggregatable
        if (typeof fieldCaps === 'object' && typeof fieldCaps.fields === 'object') {
          aggregatableFieldNames = uniqueFieldNames.filter(field => {
            if (typeof fieldCaps.fields[field] !== 'undefined') {
              const fieldType = Object.keys(fieldCaps.fields[field])[0];
              return fieldCaps.fields[field][fieldType].aggregatable;
            }
            return false;
          });
        }

        const stats = await dv.checkAggregatableFieldsExist(
          job.datafeed_config.indices.join(','),
          job.datafeed_config.query,
          aggregatableFieldNames,
          0,
          job.data_description.time_field
        );

        uniqueFieldNames.forEach(uniqueFieldName => {
          const field = _.find(stats.aggregatableExistsFields, { fieldName: uniqueFieldName });
          if (typeof field === 'object') {
            modelPlotCardinality +=
              modelPlotConfigFieldCount > 0 ? modelPlotConfigFieldCount : field.stats.cardinality;

            if (isInvalid(field.stats.cardinality)) {
              messages.push({
                id: messageId || `cardinality_${type}_field`,
                fieldName: uniqueFieldName,
              });
            }
          } else {
            // only report uniqueFieldName as not aggregatable if it's not part
            // of a valid categorization configuration and if it's not a scripted field.
            if (
              !isValidCategorizationConfig(job, uniqueFieldName) &&
              !isScriptField(job, uniqueFieldName)
            ) {
              messages.push({
                id: 'field_not_aggregatable',
                fieldName: uniqueFieldName,
              });
            }
          }
        });
      } catch (e) {
        // checkAggregatableFieldsExist may return an error if 'fielddata' is
        // disabled for text fields (which is the default). If there was only
        // one field we know it was the cause for the error. If there were more
        // fields we cannot tell which field caused the error so we return a
        // more generic message.
        if (relevantDetectors.length === 1) {
          messages.push({
            id: 'field_not_aggregatable',
            fieldName: relevantDetectors[0][fieldName],
          });
        } else {
          messages.push({ id: 'fields_not_aggregatable' });
        }
        // return here so an outer try/catch doesn't trigger to avoid a BOOM error
        return { modelPlotCardinality, messages };
      }
    }

    return { modelPlotCardinality, messages };
  };
};

export async function validateCardinality(callWithRequest, job) {
  const messages = [];

  validateJobObject(job);

  // find out if there are any relevant detector field names
  // where cardinality checks could be run against.
  const numDetectorsWithFieldNames = job.analysis_config.detectors.filter(d => {
    return d.by_field_name || d.over_field_name || d.partition_field_name;
  });
  if (numDetectorsWithFieldNames.length === 0) {
    return Promise.resolve([]);
  }

  // validate({ type, isInvalid }) asynchronously returns an array of validation messages
  const validate = validateFactory(callWithRequest, job);

  const modelPlotEnabled =
    (job.model_plot_config && job.model_plot_config.enabled === true) || false;

  // check over fields (population analysis)
  const validateOverFieldsLow = validate({
    type: 'over',
    isInvalid: cardinality => cardinality < OVER_FIELD_CARDINALITY_THRESHOLD_LOW,
    messageId: 'cardinality_over_field_low',
  });
  const validateOverFieldsHigh = validate({
    type: 'over',
    isInvalid: cardinality => cardinality > OVER_FIELD_CARDINALITY_THRESHOLD_HIGH,
    messageId: 'cardinality_over_field_high',
  });

  // check partition/by fields (multi-metric analysis)
  const validatePartitionFields = validate({
    type: 'partition',
    isInvalid: cardinality => cardinality > PARTITION_FIELD_CARDINALITY_THRESHOLD,
  });
  const validateByFields = validate({
    type: 'by',
    isInvalid: cardinality => cardinality > BY_FIELD_CARDINALITY_THRESHOLD,
  });

  // we already called the validation functions above,
  // but add "await" only here so they can be run in parallel.
  const validations = [
    await validateByFields,
    await validateOverFieldsLow,
    await validateOverFieldsHigh,
    await validatePartitionFields,
  ];

  // if model plot is enabled, check against the
  // overall cardinality of all fields used in the detectors.
  const modelPlotCardinality = validations.reduce((p, c) => {
    return p + c.modelPlotCardinality;
  }, 0);

  if (modelPlotEnabled && modelPlotCardinality > MODEL_PLOT_THRESHOLD_HIGH) {
    messages.push({
      id: 'cardinality_model_plot_high',
      modelPlotCardinality,
    });
  }

  // add all messages returned from the individual cardinality checks
  validations.forEach(v => messages.push(...v.messages));

  if (messages.length === 0) {
    messages.push({ id: 'success_cardinality' });
  }

  return messages;
}
