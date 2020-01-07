/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';
import { ML_RESULTS_INDEX_PATTERN } from '../../../common/constants/index_patterns';
import { callWithRequestType } from '../../../common/types/kibana';

interface CriteriaField {
  fieldName: string;
  fieldValue: any;
}

const PARTITION_FIELDS = ['partition_field', 'over_field', 'by_field'] as const;

type PartitionFieldsType = typeof PARTITION_FIELDS[number];

type SearchTerm =
  | {
      [key in PartitionFieldsType]?: string;
    }
  | undefined;

/**
 * Gets an object for aggregation query to retrieve field name and values.
 * @param fieldType - Field type
 * @param query - Optional query string for partition value
 * @returns {Object}
 */
function getFieldAgg(fieldType: PartitionFieldsType, query?: string) {
  const AGG_SIZE = 100;

  const fieldNameKey = `${fieldType}_name`;
  const fieldValueKey = `${fieldType}_value`;

  return {
    [fieldNameKey]: {
      terms: {
        field: fieldNameKey,
      },
    },
    [fieldValueKey]: {
      filter: {
        wildcard: {
          [fieldValueKey]: {
            value: query ? `*${query}*` : '*',
          },
        },
      },
      aggs: {
        values: {
          terms: {
            size: AGG_SIZE,
            field: fieldValueKey,
          },
        },
      },
    },
  };
}

/**
 * Gets formatted result for particular field from aggregation response.
 * @param fieldType - Field type
 * @param aggs - Aggregation response
 */
function getFieldObject(fieldType: PartitionFieldsType, aggs: any) {
  const fieldNameKey = `${fieldType}_name`;
  const fieldValueKey = `${fieldType}_value`;

  return aggs[fieldNameKey].buckets.length > 0
    ? {
        [fieldType]: {
          name: aggs[fieldNameKey].buckets[0].key,
          values: aggs[fieldValueKey].values.buckets.map(({ key }: any) => key),
        },
      }
    : {};
}

export const getPartitionFieldsValuesFactory = (callWithRequest: callWithRequestType) =>
  /**
   * Gets the record of partition fields with possible values that fit the provided queries.
   * @param jobId - Job ID
   * @param searchTerm - object of queries for partition fields, e.g. { partition_field: 'query' }
   * @param criteriaFields - key - value pairs of the term field, e.g. { detector_index: 0 }
   * @param earliestMs
   * @param latestMs
   */
  async function getPartitionFieldsValues(
    jobId: string,
    searchTerm: SearchTerm = {},
    criteriaFields: CriteriaField[],
    earliestMs: number,
    latestMs: number
  ) {
    const jobsResponse = await callWithRequest('ml.jobs', { jobId: [jobId] });
    if (jobsResponse.count === 0 || jobsResponse.jobs === undefined) {
      throw Boom.notFound(`Job with the id "${jobId}" not found`);
    }

    const job = jobsResponse.jobs[0];

    const isModelPlotEnabled = job?.model_plot_config?.enabled;

    const resp = await callWithRequest('search', {
      index: ML_RESULTS_INDEX_PATTERN,
      size: 0,
      body: {
        query: {
          bool: {
            filter: [
              ...criteriaFields.map(({ fieldName, fieldValue }) => {
                return {
                  term: {
                    [fieldName]: fieldValue,
                  },
                };
              }),
              {
                term: {
                  job_id: jobId,
                },
              },
              {
                range: {
                  timestamp: {
                    gte: earliestMs,
                    lte: latestMs,
                    format: 'epoch_millis',
                  },
                },
              },
              {
                term: {
                  result_type: isModelPlotEnabled ? 'model_plot' : 'record',
                },
              },
            ],
          },
        },
        aggs: {
          ...PARTITION_FIELDS.reduce((acc, key) => {
            return {
              ...acc,
              ...getFieldAgg(key, searchTerm[key]),
            };
          }, {}),
        },
      },
    });

    return PARTITION_FIELDS.reduce((acc, key) => {
      return {
        ...acc,
        ...getFieldObject(key, resp.aggregations),
      };
    }, {});
  };
