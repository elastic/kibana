/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { set } from 'lodash';

/*
watch.input.search.request.indices
 */
function buildIndices({ index }) {
  if (Array.isArray(index)) {
    return index;
  }

  return [
    index
  ];
}

/*
watch.input.search.request.body.query.bool.filter.range
 */
function buildRange({ timeWindowSize, timeWindowUnit, timeField }) {
  return {
    [timeField]: {
      gte: `{{ctx.trigger.scheduled_time}}||-${timeWindowSize}${timeWindowUnit}`,
      lte: `{{ctx.trigger.scheduled_time}}`,
      format: 'strict_date_optional_time||epoch_millis'
    }
  };
}

/*
watch.input.search.request.body.query
 */
function buildQuery(watch) {
  //TODO: This is where a saved search would be applied
  return {
    bool: {
      filter: {
        range: buildRange(watch)
      }
    }
  };
}

/*
watch.input.search.request.body.aggs
 */
function buildAggs({ aggType, aggField, termField, termSize, termOrder }) {
  if (aggType === 'count' && !termField) {
    return null;
  }

  if (aggType === 'count' && termField) {
    return {
      bucketAgg: {
        terms: {
          field: termField,
          size: termSize,
          order: {
            _count: termOrder
          }
        }
      }
    };
  }

  if (aggType !== 'count' && !termField) {
    const result = {
      metricAgg: {}
    };

    set(result, `metricAgg.${aggType}`, {
      field: aggField
    });

    return result;
  }

  if (aggType !== 'count' && termField) {
    const result = {
      bucketAgg: {
        terms: {
          field: termField,
          size: termSize,
          order: {
            metricAgg: termOrder
          }
        },
        aggs: {
          metricAgg: {}
        }
      }
    };

    set(result, `bucketAgg.aggs.metricAgg.${aggType}`, {
      field: aggField
    });

    return result;
  }
}

/*
watch.input.search.request.body
 */
function buildBody(watch) {
  const result = {
    size: 0,
    query: buildQuery(watch)
  };

  const aggs = buildAggs(watch);
  if (Boolean(aggs)) {
    result.aggs = aggs;
  }

  return result;
}

/*
watch.input
 */
export function buildInput(watch) {
  return {
    search: {
      request: {
        body: buildBody(watch),
        indices: buildIndices(watch)
      }
    }
  };
}
