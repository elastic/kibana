/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ELASTIC_WEBSITE_URL, DOC_LINK_VERSION } from 'ui/documentation_links';

const esBase = `${ELASTIC_WEBSITE_URL}guide/en/elasticsearch/reference/${DOC_LINK_VERSION}`;
const xPackBase = `${ELASTIC_WEBSITE_URL}guide/en/x-pack/${DOC_LINK_VERSION}`;

export const logisticalDetailsUrl = `${esBase}/rollup-job-config.html#_logistical_details`;
export const dateHistogramDetailsUrl = `${esBase}/rollup-job-config.html#_date_histogram_2`;
export const termsDetailsUrl = `${esBase}/rollup-job-config.html#_terms_2`;
export const histogramDetailsUrl = `${esBase}/rollup-job-config.html#_histogram_2`;
export const metricsDetailsUrl = `${esBase}/rollup-job-config.html#rollup-metrics-config`;

export const dateHistogramAggregationUrl = `${esBase}/search-aggregations-bucket-datehistogram-aggregation.html`;
export const cronUrl = `${xPackBase}/trigger-schedule.html#_cron_expressions`;
