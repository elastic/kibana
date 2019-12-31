/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import moment from 'moment';

import { buildAnomalyTableItems } from './build_anomaly_table_items';
import { ML_RESULTS_INDEX_PATTERN } from '../../../common/constants/index_patterns';
import { ANOMALIES_TABLE_DEFAULT_QUERY_SIZE } from '../../../common/constants/search';

// Service for carrying out Elasticsearch queries to obtain data for the
// ML Results dashboards.

const DEFAULT_MAX_EXAMPLES = 500;

export function resultsServiceProvider(callWithRequest) {
  // Obtains data for the anomalies table, aggregating anomalies by day or hour as requested.
  // Return an Object with properties 'anomalies' and 'interval' (interval used to aggregate anomalies,
  // one of day, hour or second. Note 'auto' can be provided as the aggregationInterval in the request,
  // in which case the interval is determined according to the time span between the first and
  // last anomalies),  plus an examplesByJobId property if any of the
  // anomalies are categorization anomalies in mlcategory.
  async function getAnomaliesTableData(
    jobIds,
    criteriaFields,
    influencers,
    aggregationInterval,
    threshold,
    earliestMs,
    latestMs,
    dateFormatTz,
    maxRecords = ANOMALIES_TABLE_DEFAULT_QUERY_SIZE,
    maxExamples = DEFAULT_MAX_EXAMPLES,
    influencersFilterQuery
  ) {
    // Build the query to return the matching anomaly record results.
    // Add criteria for the time range, record score, plus any specified job IDs.
    const boolCriteria = [
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
        range: {
          record_score: {
            gte: threshold,
          },
        },
      },
    ];

    if (jobIds && jobIds.length > 0 && !(jobIds.length === 1 && jobIds[0] === '*')) {
      let jobIdFilterStr = '';
      jobIds.forEach((jobId, i) => {
        if (i > 0) {
          jobIdFilterStr += ' OR ';
        }
        jobIdFilterStr += 'job_id:';
        jobIdFilterStr += jobId;
      });
      boolCriteria.push({
        query_string: {
          analyze_wildcard: false,
          query: jobIdFilterStr,
        },
      });
    }

    // Add in term queries for each of the specified criteria.
    criteriaFields.forEach(criteria => {
      boolCriteria.push({
        term: {
          [criteria.fieldName]: criteria.fieldValue,
        },
      });
    });

    if (influencersFilterQuery !== undefined) {
      boolCriteria.push(influencersFilterQuery);
    }

    // Add a nested query to filter for each of the specified influencers.
    if (influencers.length > 0) {
      boolCriteria.push({
        bool: {
          should: influencers.map(influencer => {
            return {
              nested: {
                path: 'influencers',
                query: {
                  bool: {
                    must: [
                      {
                        match: {
                          'influencers.influencer_field_name': influencer.fieldName,
                        },
                      },
                      {
                        match: {
                          'influencers.influencer_field_values': influencer.fieldValue,
                        },
                      },
                    ],
                  },
                },
              },
            };
          }),
          minimum_should_match: 1,
        },
      });
    }

    const resp = await callWithRequest('search', {
      index: ML_RESULTS_INDEX_PATTERN,
      rest_total_hits_as_int: true,
      size: maxRecords,
      body: {
        query: {
          bool: {
            filter: [
              {
                query_string: {
                  query: 'result_type:record',
                  analyze_wildcard: false,
                },
              },
              {
                bool: {
                  must: boolCriteria,
                },
              },
            ],
          },
        },
        sort: [{ record_score: { order: 'desc' } }],
      },
    });

    const tableData = { anomalies: [], interval: 'second' };
    if (resp.hits.total !== 0) {
      let records = [];
      resp.hits.hits.forEach(hit => {
        records.push(hit._source);
      });

      // Sort anomalies in ascending time order.
      records = _.sortBy(records, 'timestamp');
      tableData.interval = aggregationInterval;
      if (aggregationInterval === 'auto') {
        // Determine the actual interval to use if aggregating.
        const earliest = moment(records[0].timestamp);
        const latest = moment(records[records.length - 1].timestamp);

        const daysDiff = latest.diff(earliest, 'days');
        tableData.interval = daysDiff < 2 ? 'hour' : 'day';
      }

      tableData.anomalies = buildAnomalyTableItems(records, tableData.interval, dateFormatTz);

      // Load examples for any categorization anomalies.
      const categoryAnomalies = tableData.anomalies.filter(
        item => item.entityName === 'mlcategory'
      );
      if (categoryAnomalies.length > 0) {
        tableData.examplesByJobId = {};

        const categoryIdsByJobId = {};
        categoryAnomalies.forEach(anomaly => {
          if (!_.has(categoryIdsByJobId, anomaly.jobId)) {
            categoryIdsByJobId[anomaly.jobId] = [];
          }
          if (categoryIdsByJobId[anomaly.jobId].indexOf(anomaly.entityValue) === -1) {
            categoryIdsByJobId[anomaly.jobId].push(anomaly.entityValue);
          }
        });

        const categoryJobIds = Object.keys(categoryIdsByJobId);
        await Promise.all(
          categoryJobIds.map(async jobId => {
            const examplesByCategoryId = await getCategoryExamples(
              jobId,
              categoryIdsByJobId[jobId],
              maxExamples
            );
            tableData.examplesByJobId[jobId] = examplesByCategoryId;
          })
        );
      }
    }

    return tableData;
  }

  // Returns the maximum anomaly_score for result_type:bucket over jobIds for the interval passed in
  async function getMaxAnomalyScore(jobIds = [], earliestMs, latestMs) {
    // Build the criteria to use in the bool filter part of the request.
    // Adds criteria for the time range plus any specified job IDs.
    const boolCriteria = [
      {
        range: {
          timestamp: {
            gte: earliestMs,
            lte: latestMs,
            format: 'epoch_millis',
          },
        },
      },
    ];

    if (jobIds.length > 0) {
      let jobIdFilterStr = '';
      jobIds.forEach((jobId, i) => {
        if (i > 0) {
          jobIdFilterStr += ' OR ';
        }
        jobIdFilterStr += 'job_id:';
        jobIdFilterStr += jobId;
      });
      boolCriteria.push({
        query_string: {
          analyze_wildcard: false,
          query: jobIdFilterStr,
        },
      });
    }

    const query = {
      size: 0,
      index: ML_RESULTS_INDEX_PATTERN,
      body: {
        query: {
          bool: {
            filter: [
              {
                query_string: {
                  query: 'result_type:bucket',
                  analyze_wildcard: false,
                },
              },
              {
                bool: {
                  must: boolCriteria,
                },
              },
            ],
          },
        },
        aggs: {
          max_score: {
            max: {
              field: 'anomaly_score',
            },
          },
        },
      },
    };

    const resp = await callWithRequest('search', query);
    const maxScore = _.get(resp, ['aggregations', 'max_score', 'value'], null);

    return { maxScore };
  }

  // Obtains the latest bucket result timestamp by job ID.
  // Returns data over all jobs unless an optional list of job IDs of interest is supplied.
  // Returned response consists of latest bucket timestamps (ms since Jan 1 1970) against job ID
  async function getLatestBucketTimestampByJob(jobIds = []) {
    const filter = [
      {
        term: {
          result_type: 'bucket',
        },
      },
    ];

    if (jobIds.length > 0 && !(jobIds.length === 1 && jobIds[0] === '*')) {
      let jobIdFilterStr = '';
      jobIds.forEach((jobId, i) => {
        if (i > 0) {
          jobIdFilterStr += ' OR ';
        }
        jobIdFilterStr += 'job_id:';
        jobIdFilterStr += jobId;
      });
      filter.push({
        query_string: {
          analyze_wildcard: false,
          query: jobIdFilterStr,
        },
      });
    }

    // Size of job terms agg, consistent with maximum number of jobs supported by Java endpoints.
    const maxJobs = 10000;

    const resp = await callWithRequest('search', {
      index: ML_RESULTS_INDEX_PATTERN,
      size: 0,
      body: {
        query: {
          bool: {
            filter,
          },
        },
        aggs: {
          byJobId: {
            terms: {
              field: 'job_id',
              size: maxJobs,
            },
            aggs: {
              maxTimestamp: {
                max: {
                  field: 'timestamp',
                },
              },
            },
          },
        },
      },
    });

    const bucketsByJobId = _.get(resp, ['aggregations', 'byJobId', 'buckets'], []);
    const timestampByJobId = {};
    bucketsByJobId.forEach(bucket => {
      timestampByJobId[bucket.key] = bucket.maxTimestamp.value;
    });

    return timestampByJobId;
  }

  // Obtains the categorization examples for the categories with the specified IDs
  // from the given index and job ID.
  // Returned response consists of a list of examples against category ID.
  async function getCategoryExamples(jobId, categoryIds, maxExamples) {
    const resp = await callWithRequest('search', {
      index: ML_RESULTS_INDEX_PATTERN,
      rest_total_hits_as_int: true,
      size: ANOMALIES_TABLE_DEFAULT_QUERY_SIZE, // Matches size of records in anomaly summary table.
      body: {
        query: {
          bool: {
            filter: [{ term: { job_id: jobId } }, { terms: { category_id: categoryIds } }],
          },
        },
      },
    });

    const examplesByCategoryId = {};
    if (resp.hits.total !== 0) {
      resp.hits.hits.forEach(hit => {
        if (maxExamples) {
          examplesByCategoryId[hit._source.category_id] = _.slice(
            hit._source.examples,
            0,
            Math.min(hit._source.examples.length, maxExamples)
          );
        } else {
          examplesByCategoryId[hit._source.category_id] = hit._source.examples;
        }
      });
    }

    return examplesByCategoryId;
  }

  // Obtains the definition of the category with the specified ID and job ID.
  // Returned response contains four properties - categoryId, regex, examples
  // and terms (space delimited String of the common tokens matched in values of the category).
  async function getCategoryDefinition(jobId, categoryId) {
    const resp = await callWithRequest('search', {
      index: ML_RESULTS_INDEX_PATTERN,
      rest_total_hits_as_int: true,
      size: 1,
      body: {
        query: {
          bool: {
            filter: [{ term: { job_id: jobId } }, { term: { category_id: categoryId } }],
          },
        },
      },
    });

    const definition = { categoryId, terms: null, regex: null, examples: [] };
    if (resp.hits.total !== 0) {
      const source = resp.hits.hits[0]._source;
      definition.categoryId = source.category_id;
      definition.regex = source.regex;
      definition.terms = source.terms;
      definition.examples = source.examples;
    }

    return definition;
  }

  /**
   * Gets the record of partition filed - values pairs.
   * @param {Object} searchTerm - object of wildcard queries for partition fields, e.g.
   * @param {Object} criteriaFields - key - value pairs of the term field, e.g. { job_id: 'ml-job', detector_index: 0 }
   * @param {number} earliestMs
   * @param {number} latestMs
   * @returns {Promise<*>}
   */
  async function getPartitionFieldsValues(searchTerm = {}, criteriaFields, earliestMs, latestMs) {
    const { partitionField } = searchTerm;

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
                range: {
                  timestamp: {
                    gte: earliestMs,
                    lte: latestMs,
                    format: 'epoch_millis',
                  },
                },
              },
            ],
          },
        },
        aggs: {
          partition_field_name: {
            terms: {
              field: 'partition_field_name',
            },
          },
          over_field_name: {
            terms: {
              field: 'over_field_name',
            },
          },
          by_field_name: {
            terms: {
              field: 'by_field_name',
            },
          },
          partition_field_values: {
            filter: {
              wildcard: {
                partition_field_value: {
                  value: partitionField ? `*${partitionField}*` : '*',
                },
              },
            },
            aggs: {
              values: {
                terms: {
                  size: 100,
                  field: 'partition_field_value',
                },
              },
            },
          },
          over_field_values: {
            filter: {
              wildcard: {
                over_field_value: {
                  value: '*dit*',
                },
              },
            },
            aggs: {
              values: {
                terms: {
                  size: 100,
                  field: 'over_field_value',
                },
              },
            },
          },
          by_field_values: {
            filter: {
              wildcard: {
                by_field_value: {
                  value: '*dit*',
                },
              },
            },
            aggs: {
              values: {
                terms: {
                  size: 100,
                  field: 'by_field_value',
                },
              },
            },
          },
        },
      },
    });

    const {
      partition_field_name: partitionFieldName,
      over_field_name: overFieldName,
      by_field_name: byFieldName,
      partition_field_values: partitionFieldValues,
      over_field_values: overFieldValues,
      by_field_values: byFieldValues,
    } = resp.aggregations;

    return {
      ...getFieldObject(partitionFieldName, partitionFieldValues, 'partition_field'),
      ...getFieldObject(overFieldName, overFieldValues, 'over_field'),
      ...getFieldObject(byFieldName, byFieldValues, 'by_field'),
    };
  }

  function getFieldObject(fieldName, fieldValues, field) {
    return fieldName.buckets.length > 0
      ? {
          [field]: {
            name: fieldName.buckets[0].key,
            values: fieldValues.values.buckets.map(({ key }) => key),
          },
        }
      : {};
  }

  return {
    getAnomaliesTableData,
    getCategoryDefinition,
    getCategoryExamples,
    getLatestBucketTimestampByJob,
    getMaxAnomalyScore,
    getPartitionFieldsValues,
  };
}
