/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// utility functions for handling custom URLs

import _ from 'lodash';
import moment from 'moment';

import { parseInterval } from '../../common/util/parse_interval';
import { escapeForElasticsearchQuery, replaceStringTokens } from './string_utils';

// Value of custom_url time_range property indicating drilldown time range is calculated automatically
// depending on the context in which the URL is being opened.
const TIME_RANGE_AUTO = 'auto';

export interface UrlConfig {
  url_name: string;
  url_value: string;
}

export interface KibanaUrlConfig extends UrlConfig {
  time_range: string;
}

export interface Influencer {
  influencer_field_name: string;
  influencer_field_values: string[];
}

export interface AnomalyRecordDoc {
  [key: string]: any;
  job_id: string;
  result_type: string;
  probability: number;
  record_score: number;
  initial_record_score: number;
  bucket_span: number;
  detector_index: number;
  is_interim?: boolean;
  timestamp: number;
  partition_field_name?: string;
  partition_field_value?: string | number;
  function: string;
  function_description: string;
  typical: number[];
  actual: number[];
  influencers: Influencer[];
  by_field_name?: string;
  by_field_value?: string;
  multi_bucket_impact?: number;
  over_field_name?: string;
  over_field_value?: string;
}

export interface AnomalyRecordSource extends AnomalyRecordDoc {
  earliest: string;
  latest: string;
}

// Replaces the $ delimited tokens in the url_value of the custom URL configuration
// with values from the supplied document.
export function replaceTokensInUrlValue(
  customUrlConfig: UrlConfig | KibanaUrlConfig,
  jobBucketSpanSecs: number,
  doc: AnomalyRecordDoc,
  timeFieldName: 'timestamp' | string
) {
  // If urlValue contains $earliest$ and $latest$ tokens, add in times to the test doc.
  const urlValue = customUrlConfig.url_value;
  const timestamp = doc[timeFieldName];
  const timeRangeInterval =
    'time_range' in customUrlConfig ? parseInterval(customUrlConfig.time_range) : null;
  const record = { ...doc } as AnomalyRecordSource;
  if (urlValue.includes('$earliest$')) {
    const earliestMoment = moment(timestamp);
    if (timeRangeInterval !== null) {
      earliestMoment.subtract(timeRangeInterval);
    } else {
      earliestMoment.subtract(jobBucketSpanSecs, 's');
    }
    record.earliest = earliestMoment.toISOString();
  }

  if (urlValue.includes('$latest$')) {
    const latestMoment = moment(timestamp).add(jobBucketSpanSecs, 's');
    if (timeRangeInterval !== null) {
      latestMoment.add(timeRangeInterval);
    } else {
      latestMoment.add(jobBucketSpanSecs, 's');
    }
    record.latest = latestMoment.toISOString();
  }

  return getUrlForRecord(customUrlConfig, record);
}

// Returns the URL to open from the supplied config, with any dollar delimited tokens
// substituted from the supplied anomaly record.
export function getUrlForRecord(urlConfig: UrlConfig, record: AnomalyRecordSource) {
  if (isKibanaUrl(urlConfig) === true) {
    return buildKibanaUrl(urlConfig, record);
  } else {
    const urlPath = replaceStringTokens(urlConfig.url_value, record, false);
    return urlPath;
  }
}

// Opens the specified URL in a new window. The behaviour (for example whether
// it opens in a new tab or window) is determined from the original configuration
// object which indicates whether it is opening a Kibana page running on the same server.
// fullUrl is the complete URL, including the base path, with any dollar delimited tokens
// from the urlConfig having been substituted with values from an anomaly record.
export function openCustomUrlWindow(fullUrl: string, urlConfig: UrlConfig) {
  // Run through a regex to test whether the url_value starts with a protocol scheme.
  if (/^(?:[a-z]+:)?\/\//i.test(urlConfig.url_value) === false) {
    window.open(fullUrl, '_blank');
  } else {
    // Add noopener and noreferrr properties for external URLs.
    const newWindow = window.open(fullUrl, '_blank', 'noopener,noreferrer');

    // Expect newWindow to be null, but just in case if not, reset the opener link.
    if (newWindow !== undefined && newWindow !== null) {
      newWindow.opener = null;
    }
  }
}

// Returns whether the url_value of the supplied config is for
// a Kibana Discover or Dashboard page running on the same server as this ML plugin.
function isKibanaUrl(urlConfig: UrlConfig) {
  const urlValue = urlConfig.url_value;
  return urlValue.startsWith('kibana#/discover') || urlValue.startsWith('kibana#/dashboard');
}

/**
 * Escape any double quotes in the value for correct use in KQL.
 */
function escapeForKQL(value: string): string {
  return value.replace(/\"/g, '\\"');
}

// Builds a Kibana dashboard or Discover URL from the supplied config, with any
// dollar delimited tokens substituted from the supplied anomaly record.
function buildKibanaUrl(urlConfig: UrlConfig, record: AnomalyRecordSource) {
  const urlValue = urlConfig.url_value;

  const queryLanguageEscapeCallback = urlValue.includes('language:lucene')
    ? escapeForElasticsearchQuery
    : escapeForKQL;

  // Compose callback for characters escaping and encoding.
  const getResultTokenValue: (v: string) => string = _.flow(
    queryLanguageEscapeCallback,
    // Kibana URLs used rison encoding, so escape with ! any ! or ' characters
    (v: string): string => v.replace(/[!']/g, '!$&'),
    encodeURIComponent
  );

  return String(urlValue)
    .replace('$earliest$', record.earliest)
    .replace('$latest$', record.latest)
    .replace(/query:'(.+)'/, (match, queryString: string) => {
      return `query:'${queryString
        // Split query string by AND operator.
        .split(/\sand\s/i)
        // Get property name from `influencerField:$influencerField$` string.
        .map(v => v.split(':')[0])
        .map(name => {
          // Use lodash get to allow nested JSON fields to be retrieved.
          const tokenValues: string[] | undefined = _.get(record, name);
          if (tokenValues === undefined) {
            return null;
          }
          // Create a pair ``influencerField:value`.
          // In cases where there are multiple influencer field values for an anomaly
          // combine values with OR operator e.g. `influencerField:value or influencerField:another_value`.
          const result = tokenValues
            .map(value => `${name}:"${getResultTokenValue(value)}"`)
            .join(' or ');
          return tokenValues.length > 1 ? `(${result})` : result;
        })
        .filter(v => v !== null)
        .join(' and ')}'`;
    })
    .replace(/\$(\w+)\$/, (match, name: string) => {
      // Use lodash get to allow nested JSON fields to be retrieved.
      const tokenValue: string | undefined = _.get(record, name);
      // If property not found string is not replaced.
      return tokenValue === undefined ? match : getResultTokenValue(tokenValue);
    });
}

// Returns whether the supplied label is valid for a custom URL.
export function isValidLabel(label: string, savedCustomUrls: any[]) {
  let isValid = label !== undefined && label.trim().length > 0;
  if (isValid === true && savedCustomUrls !== undefined) {
    // Check the label is unique.
    const existingLabels = savedCustomUrls.map(customUrl => customUrl.url_name);
    isValid = !existingLabels.includes(label);
  }
  return isValid;
}

export function isValidTimeRange(timeRange: string): boolean {
  // Allow empty timeRange string, which gives the 'auto' behaviour.
  if (timeRange === undefined || timeRange.length === 0 || timeRange === TIME_RANGE_AUTO) {
    return true;
  }

  const interval = parseInterval(timeRange);
  return interval !== null;
}
