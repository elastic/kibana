/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

let esBase = '';

export function setEsBaseAndXPackBase(elasticWebsiteUrl, docLinksVersion) {
  esBase = `${elasticWebsiteUrl}guide/en/elasticsearch/reference/${docLinksVersion}`;
}

export const getLogisticalDetailsUrl = () => `${esBase}/rollup-job-config.html#_logistical_details`;
export const getDateHistogramDetailsUrl = () =>
  `${esBase}/rollup-job-config.html#_date_histogram_2`;
export const getTermsDetailsUrl = () => `${esBase}/rollup-job-config.html#_terms_2`;
export const getHistogramDetailsUrl = () => `${esBase}/rollup-job-config.html#_histogram_2`;
export const getMetricsDetailsUrl = () => `${esBase}/rollup-job-config.html#rollup-metrics-config`;

export const getDateHistogramAggregationUrl = () =>
  `${esBase}/search-aggregations-bucket-datehistogram-aggregation.html`;
export const getCronUrl = () => `${esBase}/trigger-schedule.html#_cron_expressions`;
