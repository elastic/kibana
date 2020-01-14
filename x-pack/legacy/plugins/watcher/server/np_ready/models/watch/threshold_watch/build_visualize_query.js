/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { cloneDeep } from 'lodash';
import { buildInput } from '../../../../../common/lib/serialization';
import { AGG_TYPES } from '../../../../../common/constants';

/*
input.search.request.body.query.bool.filter.range
 */
function buildRange({ rangeFrom, rangeTo, timeField }) {
  return {
    [timeField]: {
      gte: rangeFrom,
      lte: rangeTo,
      format: 'epoch_millis',
    },
  };
}

function buildDateAgg({ field, interval, timeZone }) {
  return {
    date_histogram: {
      field,
      interval,
      time_zone: timeZone,
      min_doc_count: 1,
    },
  };
}

function buildAggsCount(body, dateAgg) {
  // eslint-disable-line no-unused-vars
  return {
    dateAgg,
  };
}

function buildAggsNonCount(body, dateAgg) {
  dateAgg.aggs = {
    metricAgg: body.aggs.metricAgg,
  };

  return {
    dateAgg,
  };
}

function buildAggsCountTerms(body, dateAgg) {
  const bucketAgg = body.aggs.bucketAgg;
  bucketAgg.aggs = {
    dateAgg,
  };

  return {
    bucketAgg,
  };
}

function buildAggsNonCountTerms(body, dateAgg) {
  const bucketAgg = body.aggs.bucketAgg;
  const metricAgg = cloneDeep(bucketAgg.aggs.metricAgg);
  dateAgg.aggs = {
    metricAgg,
  };
  bucketAgg.aggs = {
    metricAgg,
    dateAgg,
  };
  return {
    bucketAgg,
  };
}

function buildAggs(body, { aggType, termField }, dateAgg) {
  if (aggType === AGG_TYPES.COUNT && !Boolean(termField)) {
    return buildAggsCount(body, dateAgg);
  }

  if (aggType === AGG_TYPES.COUNT && Boolean(termField)) {
    return buildAggsCountTerms(body, dateAgg);
  }

  if (aggType !== AGG_TYPES.COUNT && !Boolean(termField)) {
    return buildAggsNonCount(body, dateAgg);
  }

  if (aggType !== AGG_TYPES.COUNT && Boolean(termField)) {
    return buildAggsNonCountTerms(body, dateAgg);
  }
}

export function buildVisualizeQuery(watch, visualizeOptions) {
  const {
    index,
    timeWindowSize,
    timeWindowUnit,
    timeField,
    aggType,
    aggField,
    termField,
    termSize,
    termOrder,
  } = watch;
  const watchInput = buildInput({
    index,
    timeWindowSize,
    timeWindowUnit,
    timeField,
    aggType,
    aggField,
    termField,
    termSize,
    termOrder,
  });
  const body = watchInput.search.request.body;
  const dateAgg = buildDateAgg({
    field: watch.timeField,
    interval: visualizeOptions.interval,
    timeZone: visualizeOptions.timezone,
  });

  // override the query range
  body.query.bool.filter.range = buildRange({
    rangeFrom: visualizeOptions.rangeFrom,
    rangeTo: visualizeOptions.rangeTo,
    timeField: watch.timeField,
  });

  body.aggs = buildAggs(body, watch, dateAgg);

  return body;
}
