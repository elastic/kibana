/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// To get median data for jobs and charts we need to use Elasticsearch's
// percentiles aggregation. This setting is used with the `percents` field
// of the percentiles aggregation to get the correct data.
export const ML_MEDIAN_PERCENTS = '50.0';

// The number of preview items to show up in
// the Advanced Job Configuration data/datafeed preview tab
export const ML_DATA_PREVIEW_COUNT = 10;
