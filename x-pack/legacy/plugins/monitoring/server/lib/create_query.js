/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { defaults, get } from 'lodash';
import { MissingRequiredError } from './error_missing_required';
import moment from 'moment';
import { standaloneClusterFilter } from './standalone_clusters';
import { STANDALONE_CLUSTER_CLUSTER_UUID } from '../../common/constants';

export function createTimeFilter(options) {
  const { start, end } = options;
  if (!start && !end) {
    return null;
  }

  const timestampField = get(options, 'metric.timestampField');
  if (!timestampField) {
    throw new MissingRequiredError('metric.timestampField');
  }
  const timeRangeFilter = {
    range: {
      [timestampField]: {
        format: 'epoch_millis'
      }
    }
  };
  if (start) {
    timeRangeFilter.range[timestampField].gte = moment.utc(start).valueOf();
  }
  if (end) {
    timeRangeFilter.range[timestampField].lte = moment.utc(end).valueOf();
  }
  return timeRangeFilter;
}

/*
 * Creates the boilerplace for querying monitoring data, including filling in
 * document UUIDs, start time and end time, and injecting additional filters.
 *
 * Options object:
 * @param {String} options.type - `type` field value of the documents
 * @param {Array} options.filters - additional filters to add to the `bool` section of the query. Default: []
 * @param {string} options.clusterUuid - a UUID of the cluster. Required.
 * @param {string} options.uuid - a UUID of the metric to filter for, or `null` if UUID should not be part of the query
 * @param {Date} options.start - numeric timestamp (optional)
 * @param {Date} options.end - numeric timestamp (optional)
 * @param {Metric} options.metric - Metric instance or metric fields object @see ElasticsearchMetric.getMetricFields
 */
export function createQuery(options) {
  options = defaults(options, { filters: [] });
  const { type, clusterUuid, uuid, filters } = options;

  const isFromStandaloneCluster = clusterUuid === STANDALONE_CLUSTER_CLUSTER_UUID;

  let typeFilter;
  if (type) {
    typeFilter = { term: { type } };
  }

  let clusterUuidFilter;
  if (clusterUuid && !isFromStandaloneCluster) {
    clusterUuidFilter = { term: { 'cluster_uuid': clusterUuid } };
  }

  let uuidFilter;
  // options.uuid can be null, for example getting all the clusters
  if (uuid) {
    const uuidField = get(options, 'metric.uuidField');
    if (!uuidField) {
      throw new MissingRequiredError('options.uuid given but options.metric.uuidField is false');
    }
    uuidFilter = { term: { [uuidField]: uuid } };
  }

  const timestampField = get(options, 'metric.timestampField');
  if (!timestampField) {
    throw new MissingRequiredError('metric.timestampField');
  }
  const timeRangeFilter = createTimeFilter(options);

  const combinedFilters = [typeFilter, clusterUuidFilter, uuidFilter, ...filters];
  if (timeRangeFilter) {
    combinedFilters.push(timeRangeFilter);
  }

  if (isFromStandaloneCluster) {
    combinedFilters.push(standaloneClusterFilter);
  }

  const query = {
    bool: {
      filter: combinedFilters.filter(Boolean)
    }
  };

  return query;
}
