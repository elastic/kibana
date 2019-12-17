/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { TIME_RANGE_TYPE, URL_TYPE } from './constants';

import chrome from 'ui/chrome';
import rison from 'rison-node';

import { ML_RESULTS_INDEX_PATTERN } from '../../../../../common/constants/index_patterns';
import { getPartitioningFieldNames } from '../../../../../common/util/job_utils';
import { parseInterval } from '../../../../../common/util/parse_interval';
import { replaceTokensInUrlValue, isValidLabel } from '../../../util/custom_url_utils';
import { ml } from '../../../services/ml_api_service';
import { mlJobService } from '../../../services/job_service';
import { escapeForElasticsearchQuery } from '../../../util/string_utils';

export function getNewCustomUrlDefaults(job, dashboards, indexPatterns) {
  // Returns the settings object in the format used by the custom URL editor
  // for a new custom URL.
  const kibanaSettings = {
    queryFieldNames: [],
  };

  // Set the default type.
  let urlType = URL_TYPE.OTHER;
  if (dashboards !== undefined && dashboards.length > 0) {
    urlType = URL_TYPE.KIBANA_DASHBOARD;
    kibanaSettings.dashboardId = dashboards[0].id;
  } else if (indexPatterns !== undefined && indexPatterns.length > 0) {
    urlType = URL_TYPE.KIBANA_DISCOVER;
  }

  // For the Discover option, set the default index pattern to that
  // which matches the (first) index configured in the job datafeed.
  const datafeedConfig = job.datafeed_config;
  if (
    indexPatterns !== undefined &&
    indexPatterns.length > 0 &&
    datafeedConfig !== undefined &&
    datafeedConfig.indices !== undefined &&
    datafeedConfig.indices.length > 0
  ) {
    const datafeedIndex = datafeedConfig.indices[0];
    let defaultIndexPattern = indexPatterns.find(indexPattern => {
      return indexPattern.title === datafeedIndex;
    });

    if (defaultIndexPattern === undefined) {
      defaultIndexPattern = indexPatterns[0];
    }

    kibanaSettings.discoverIndexPatternId = defaultIndexPattern.id;
  }

  return {
    label: '',
    type: urlType,
    // Note timeRange is only editable in new URLs for Dashboard and Discover URLs,
    // as for other URLs we have no way of knowing how the field will be used in the URL.
    timeRange: {
      type: TIME_RANGE_TYPE.AUTO,
      interval: '',
    },
    kibanaSettings,
    otherUrlSettings: {
      urlValue: '',
    },
  };
}

export function getQueryEntityFieldNames(job) {
  // Returns the list of partitioning and influencer field names that can be used
  // as entities to add to the query used when linking to a Kibana dashboard or Discover.
  const influencers = job.analysis_config.influencers;
  const detectors = job.analysis_config.detectors;
  const entityFieldNames = [];
  if (influencers !== undefined) {
    entityFieldNames.push(...influencers);
  }

  detectors.forEach((detector, detectorIndex) => {
    const partitioningFields = getPartitioningFieldNames(job, detectorIndex);

    partitioningFields.forEach(fieldName => {
      if (entityFieldNames.indexOf(fieldName) === -1) {
        entityFieldNames.push(fieldName);
      }
    });
  });

  return entityFieldNames;
}

export function isValidCustomUrlSettingsTimeRange(timeRangeSettings) {
  if (timeRangeSettings.type === TIME_RANGE_TYPE.INTERVAL) {
    const interval = parseInterval(timeRangeSettings.interval);
    return interval !== null;
  }

  return true;
}

export function isValidCustomUrlSettings(settings, savedCustomUrls) {
  let isValid = isValidLabel(settings.label, savedCustomUrls);
  if (isValid === true) {
    isValid = isValidCustomUrlSettingsTimeRange(settings.timeRange);
  }
  return isValid;
}

export function buildCustomUrlFromSettings(settings) {
  // Dashboard URL returns a Promise as a query is made to obtain the full dashboard config.
  // So wrap the other two return types in a Promise for consistent return type.
  if (settings.type === URL_TYPE.KIBANA_DASHBOARD) {
    return buildDashboardUrlFromSettings(settings);
  } else if (settings.type === URL_TYPE.KIBANA_DISCOVER) {
    return Promise.resolve(buildDiscoverUrlFromSettings(settings));
  } else {
    const urlToAdd = {
      url_name: settings.label,
      url_value: settings.otherUrlSettings.urlValue,
    };

    return Promise.resolve(urlToAdd);
  }
}

function buildDashboardUrlFromSettings(settings) {
  // Get the complete list of attributes for the selected dashboard (query, filters).
  return new Promise((resolve, reject) => {
    const { dashboardId, queryFieldNames } = settings.kibanaSettings;

    const savedObjectsClient = chrome.getSavedObjectsClient();
    savedObjectsClient
      .get('dashboard', dashboardId)
      .then(response => {
        // Use the filters from the saved dashboard if there are any.
        let filters = [];

        // Use the query from the dashboard only if no job entities are selected.
        let query = undefined;

        const searchSourceJSON = response.get('kibanaSavedObjectMeta.searchSourceJSON');
        if (searchSourceJSON !== undefined) {
          const searchSourceData = JSON.parse(searchSourceJSON);
          if (searchSourceData.filter !== undefined) {
            filters = searchSourceData.filter;
          }
          query = searchSourceData.query;
        }

        // Add time settings to the global state URL parameter with $earliest$ and
        // $latest$ tokens which get substituted for times around the time of the
        // anomaly on which the URL will be run against.
        const _g = rison.encode({
          time: {
            from: '$earliest$',
            to: '$latest$',
            mode: 'absolute',
          },
        });

        const appState = {
          filters,
        };

        // To put entities in filters section would involve creating parameters of the form
        // filters:!(('$state':(store:appState),meta:(alias:!n,disabled:!f,index:b30fd340-efb4-11e7-a600-0f58b1422b87,
        // key:airline,negate:!f,params:(query:AAL,type:phrase),type:phrase,value:AAL),query:(match:(airline:(query:AAL,type:phrase)))))
        // which includes the ID of the index holding the field used in the filter.

        // So for simplicity, put entities in the query, replacing any query which is there already.
        // e.g. query:(language:kuery,query:'region:us-east-1%20and%20instance:i-20d061fa')
        const queryFromEntityFieldNames = buildAppStateQueryParam(queryFieldNames);
        if (queryFromEntityFieldNames !== undefined) {
          query = queryFromEntityFieldNames;
        }

        if (query !== undefined) {
          appState.query = query;
        }

        const _a = rison.encode(appState);

        const urlValue = `kibana#/dashboard/${dashboardId}?_g=${_g}&_a=${_a}`;

        const urlToAdd = {
          url_name: settings.label,
          url_value: urlValue,
          time_range: TIME_RANGE_TYPE.AUTO,
        };

        if (settings.timeRange.type === TIME_RANGE_TYPE.INTERVAL) {
          urlToAdd.time_range = settings.timeRange.interval;
        }

        resolve(urlToAdd);
      })
      .catch(resp => {
        reject(resp);
      });
  });
}

function buildDiscoverUrlFromSettings(settings) {
  const { discoverIndexPatternId, queryFieldNames } = settings.kibanaSettings;

  // Add time settings to the global state URL parameter with $earliest$ and
  // $latest$ tokens which get substituted for times around the time of the
  // anomaly on which the URL will be run against.
  const _g = rison.encode({
    time: {
      from: '$earliest$',
      to: '$latest$',
      mode: 'absolute',
    },
  });

  // Add the index pattern and query to the appState part of the URL.
  const appState = {
    index: discoverIndexPatternId,
  };

  // If partitioning field entities have been configured add tokens
  // to the URL to use in the Discover page search.

  // Ideally we would put entities in the filters section, but currently this involves creating parameters of the form
  // filters:!(('$state':(store:appState),meta:(alias:!n,disabled:!f,index:b30fd340-efb4-11e7-a600-0f58b1422b87,
  // key:airline,negate:!f,params:(query:AAL,type:phrase),type:phrase,value:AAL),query:(match:(airline:(query:AAL,type:phrase)))))
  // which includes the ID of the index holding the field used in the filter.

  // So for simplicity, put entities in the query, replacing any query which is there already.
  // e.g. query:(language:kuery,query:'region:us-east-1%20and%20instance:i-20d061fa')
  const queryFromEntityFieldNames = buildAppStateQueryParam(queryFieldNames);
  if (queryFromEntityFieldNames !== undefined) {
    appState.query = queryFromEntityFieldNames;
  }

  const _a = rison.encode(appState);

  const urlValue = `kibana#/discover?_g=${_g}&_a=${_a}`;

  const urlToAdd = {
    url_name: settings.label,
    url_value: urlValue,
    time_range: TIME_RANGE_TYPE.AUTO,
  };

  if (settings.timeRange.type === TIME_RANGE_TYPE.INTERVAL) {
    urlToAdd.time_range = settings.timeRange.interval;
  }

  return urlToAdd;
}

// Builds the query parameter for use in the _a AppState part of a Kibana Dashboard or Discover URL.
function buildAppStateQueryParam(queryFieldNames) {
  let queryParam;
  if (queryFieldNames !== undefined && queryFieldNames.length > 0) {
    let queryString = '';
    queryFieldNames.forEach((fieldName, i) => {
      if (i > 0) {
        queryString += ' and ';
      }
      queryString += `${escapeForElasticsearchQuery(fieldName)}:"$${fieldName}$"`;
    });

    queryParam = {
      language: 'kuery',
      query: queryString,
    };
  }

  return queryParam;
}

// Builds the full URL for testing out a custom URL configuration, which
// may contain dollar delimited partition / influencer entity tokens and
// drilldown time range settings.
export function getTestUrl(job, customUrl) {
  const urlValue = customUrl.url_value;
  const bucketSpanSecs = parseInterval(job.analysis_config.bucket_span).asSeconds();

  // By default, return configured url_value. Look to substitute any dollar-delimited
  // tokens with values from the highest scoring anomaly, or if no anomalies, with
  // values from a document returned by the search in the job datafeed.
  let testUrl = customUrl.url_value;

  // Query to look for the highest scoring anomaly.
  const body = {
    query: {
      bool: {
        must: [{ term: { job_id: job.job_id } }, { term: { result_type: 'record' } }],
      },
    },
    size: 1,
    _source: {
      excludes: [],
    },
    sort: [{ record_score: { order: 'desc' } }],
  };

  return new Promise((resolve, reject) => {
    ml.esSearch({
      index: ML_RESULTS_INDEX_PATTERN,
      rest_total_hits_as_int: true,
      body,
    })
      .then(resp => {
        if (resp.hits.total > 0) {
          const record = resp.hits.hits[0]._source;
          testUrl = replaceTokensInUrlValue(customUrl, bucketSpanSecs, record, 'timestamp');
          resolve(testUrl);
        } else {
          // No anomalies yet for this job, so do a preview of the search
          // configured in the job datafeed to obtain sample docs.
          mlJobService.searchPreview(job).then(response => {
            let testDoc;
            const docTimeFieldName = job.data_description.time_field;

            // Handle datafeeds which use aggregations or documents.
            if (response.aggregations) {
              // Create a dummy object which contains the fields necessary to build the URL.
              const firstBucket = response.aggregations.buckets.buckets[0];
              testDoc = {
                [docTimeFieldName]: firstBucket.key,
              };

              // Look for bucket aggregations which match the tokens in the URL.
              urlValue.replace(/\$([^?&$\'"]{1,40})\$/g, (match, name) => {
                if (name !== 'earliest' && name !== 'latest' && firstBucket[name] !== undefined) {
                  const tokenBuckets = firstBucket[name];
                  if (tokenBuckets.buckets) {
                    testDoc[name] = tokenBuckets.buckets[0].key;
                  }
                }
              });
            } else {
              if (response.hits.total.value > 0) {
                testDoc = response.hits.hits[0]._source;
              }
            }

            if (testDoc !== undefined) {
              testUrl = replaceTokensInUrlValue(
                customUrl,
                bucketSpanSecs,
                testDoc,
                docTimeFieldName
              );
            }

            resolve(testUrl);
          });
        }
      })
      .catch(resp => {
        reject(resp);
      });
  });
}
