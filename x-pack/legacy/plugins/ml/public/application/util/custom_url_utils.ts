/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// utility functions for handling custom URLs

import { get, flow } from 'lodash';
import moment from 'moment';

import { parseInterval } from '../../../common/util/parse_interval';
import { escapeForElasticsearchQuery, replaceStringTokens } from './string_utils';
import {
  UrlConfig,
  KibanaUrlConfig,
  CustomUrlAnomalyRecordDoc,
} from '../../../common/types/custom_urls';
import { AnomalyRecordDoc } from '../../../common/types/anomalies';

// Value of custom_url time_range property indicating drilldown time range is calculated automatically
// depending on the context in which the URL is being opened.
const TIME_RANGE_AUTO = 'auto';

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
  const record = { ...doc } as CustomUrlAnomalyRecordDoc;
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
export function getUrlForRecord(
  urlConfig: UrlConfig | KibanaUrlConfig,
  record: CustomUrlAnomalyRecordDoc
) {
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
function escapeForKQL(value: string | number): string {
  return String(value).replace(/\"/g, '\\"');
}

type GetResultTokenValue = (v: string) => string;

/**
 * Builds a Kibana dashboard or Discover URL from the supplied config, with any
 * dollar delimited tokens substituted from the supplied anomaly record.
 */
function buildKibanaUrl(urlConfig: UrlConfig, record: CustomUrlAnomalyRecordDoc) {
  const urlValue = urlConfig.url_value;
  const URL_LENGTH_LIMIT = 2000;

  const isLuceneQueryLanguage = urlValue.includes('language:lucene');

  const queryLanguageEscapeCallback = isLuceneQueryLanguage
    ? escapeForElasticsearchQuery
    : escapeForKQL;

  const commonEscapeCallback = flow(
    // Kibana URLs used rison encoding, so escape with ! any ! or ' characters
    (v: string): string => v.replace(/[!']/g, '!$&'),
    encodeURIComponent
  );

  const replaceSingleTokenValues = (str: string) => {
    const getResultTokenValue: GetResultTokenValue = flow(
      // Special characters inside of the filter should not be escaped for Lucene query language.
      isLuceneQueryLanguage ? <T>(v: T) => v : queryLanguageEscapeCallback,
      commonEscapeCallback
    );

    return str.replace(/\$([^?&$\'"]+)\$/g, (match, name: string) => {
      // Use lodash get to allow nested JSON fields to be retrieved.
      let tokenValue: string | string[] | undefined = get(record, name);
      tokenValue = Array.isArray(tokenValue) ? tokenValue[0] : tokenValue;

      // If property not found string is not replaced.
      return tokenValue === undefined ? match : getResultTokenValue(tokenValue);
    });
  };

  return flow(
    (str: string) => str.replace('$earliest$', record.earliest).replace('$latest$', record.latest),
    // Process query string content of the URL
    (str: string) => {
      const getResultTokenValue: GetResultTokenValue = flow(
        queryLanguageEscapeCallback,
        commonEscapeCallback
      );
      return str.replace(
        /(.+query:')([^']*)('.+)/,
        (fullMatch, prefix: string, queryString: string, postfix: string) => {
          const [resultPrefix, resultPostfix] = [prefix, postfix].map(replaceSingleTokenValues);

          let availableCharactersLeft =
            URL_LENGTH_LIMIT - resultPrefix.length - resultPostfix.length;
          const queryFields = queryString
            // Split query string by AND operator.
            .split(/\sand\s/i)
            // Get property name from `influencerField:$influencerField$` string.
            .map(v => v.split(':')[0]);

          const queryParts: string[] = [];
          const joinOperator = ' AND ';

          for (let i = 0; i < queryFields.length; i++) {
            const field = queryFields[i];
            // Use lodash get to allow nested JSON fields to be retrieved.
            const tokenValues: string[] | string | null = get(record, field) || null;
            if (tokenValues === null) {
              continue;
            }
            // Create a pair `influencerField:value`.
            // In cases where there are multiple influencer field values for an anomaly
            // combine values with OR operator e.g. `(influencerField:value or influencerField:another_value)`.
            let result = (Array.isArray(tokenValues) ? tokenValues : [tokenValues])
              .map(value => `${field}:"${getResultTokenValue(value)}"`)
              .join(' OR ');
            result = tokenValues.length > 1 ? `(${result})` : result;

            // Build up a URL string which is not longer than the allowed length and isn't corrupted by invalid query.
            availableCharactersLeft -= result.length - (i === 0 ? 0 : joinOperator.length);

            if (availableCharactersLeft <= 0) {
              break;
            } else {
              queryParts.push(result);
            }
          }

          const resultQuery = queryParts.join(joinOperator);

          return `${resultPrefix}${resultQuery}${resultPostfix}`;
        }
      );
    },
    replaceSingleTokenValues
  )(urlValue);
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
