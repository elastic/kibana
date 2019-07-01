/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get, uniq } from 'lodash';
import { METRICBEAT_INDEX_NAME_UNIQUE_TOKEN, ELASTICSEARCH_CUSTOM_ID } from '../../../../common/constants';
import { KIBANA_SYSTEM_ID, BEATS_SYSTEM_ID, LOGSTASH_SYSTEM_ID } from '../../../../../telemetry/common/constants';

const NUMBER_OF_SECONDS_AGO_TO_LOOK = 30;
const APM_CUSTOM_ID = 'apm';

const getRecentMonitoringDocuments = async (req, indexPatterns, clusterUuid) => {
  const start = get(req.payload, 'timeRange.min', `now-${NUMBER_OF_SECONDS_AGO_TO_LOOK}s`);
  const end = get(req.payload, 'timeRange.max', 'now');

  const filters = [
    {
      range: {
        'timestamp': {
          gte: start,
          lte: end
        }
      }
    }
  ];

  if (clusterUuid) {
    filters.push({ term: { 'cluster_uuid': clusterUuid } });
  }

  const params = {
    index: Object.values(indexPatterns),
    size: 0,
    ignoreUnavailable: true,
    filterPath: [
      'aggregations.indices.buckets'
    ],
    body: {
      query: {
        bool: {
          filter: filters,
        }
      },
      aggs: {
        indices: {
          terms: {
            field: '_index',
            size: 50,
          },
          aggs: {
            es_uuids: {
              terms: {
                field: 'node_stats.node_id'
              },
              aggs: {
                by_timestamp: {
                  max: {
                    field: 'timestamp'
                  }
                }
              }
            },
            kibana_uuids: {
              terms: {
                field: 'kibana_stats.kibana.uuid'
              },
              aggs: {
                by_timestamp: {
                  max: {
                    field: 'timestamp'
                  }
                }
              }
            },
            beats_uuids: {
              terms: {
                field: 'beats_stats.beat.uuid'
              },
              aggs: {
                by_timestamp: {
                  max: {
                    field: 'timestamp'
                  }
                },
                beat_type: {
                  terms: {
                    field: 'beats_stats.beat.type'
                  }
                }
              }
            },
            logstash_uuids: {
              terms: {
                field: 'logstash_stats.logstash.uuid'
              },
              aggs: {
                by_timestamp: {
                  max: {
                    field: 'timestamp'
                  }
                }
              }
            }
          }
        }
      }
    }
  };

  const { callWithRequest } = req.server.plugins.elasticsearch.getCluster('monitoring');
  return await callWithRequest(req, 'search', params);
};

async function detectProducts(req) {
  const result = {
    [KIBANA_SYSTEM_ID]: {
      doesExist: true,
    },
    [ELASTICSEARCH_CUSTOM_ID]: {
      doesExist: true,
    },
    [BEATS_SYSTEM_ID]: {
      mightExist: false,
    },
    [APM_CUSTOM_ID]: {
      mightExist: false,
    },
    [LOGSTASH_SYSTEM_ID]: {
      mightExist: false,
    }
  };

  const msearch = [
    { index: '*beat-*' },
    { size: 0, terminate_after: 0 },

    { index: '.management-beats*' },
    { size: 0, terminate_after: 0 },

    { index: 'logstash-*' },
    { size: 0, terminate_after: 0 },

    { index: '.logstash*' },
    { size: 0, terminate_after: 0 },

    { index: 'apm*' },
    { size: 0, terminate_after: 0 },
  ];

  const { callWithRequest } = req.server.plugins.elasticsearch.getCluster('monitoring');
  const {
    responses: [
      beatsDataDetectionResponse,
      beatsManagementDetectionResponse,
      logstashDataDetectionResponse,
      logstashManagementDetectionResponse,
      apmDetectionResponse
    ]
  } = await callWithRequest(req, 'msearch', { body: msearch });

  if (get(beatsDataDetectionResponse, 'hits.total.value', 0) > 0
    || get(beatsManagementDetectionResponse, 'hits.total.value', 0) > 0) {
    result[BEATS_SYSTEM_ID].mightExist = true;
  }

  if (get(logstashDataDetectionResponse, 'hits.total.value', 0) > 0
    || get(logstashManagementDetectionResponse, 'hits.total.value', 0) > 0) {
    result[LOGSTASH_SYSTEM_ID].mightExist = true;
  }

  if (get(apmDetectionResponse, 'hits.total.value', 0) > 0) {
    result[APM_CUSTOM_ID].mightExist = true;
  }

  return result;
}

function getUuidBucketName(productName) {
  switch (productName) {
    case ELASTICSEARCH_CUSTOM_ID:
      return 'es_uuids';
    case KIBANA_SYSTEM_ID:
      return 'kibana_uuids';
    case BEATS_SYSTEM_ID:
    case APM_CUSTOM_ID:
      return 'beats_uuids';
    case LOGSTASH_SYSTEM_ID:
      return 'logstash_uuids';
  }
}

function isBeatFromAPM(bucket) {
  const beatType = get(bucket, 'beat_type');
  if (!beatType) {
    return false;
  }

  return get(beatType, 'buckets[0].key') === 'apm-server';
}

/**
 * Determines if we should ignore this bucket from this product.
 *
 * We need this logic because APM and Beats are separate products, but their
 * monitoring data appears in the same index (.monitoring-beats-*) and the single
 * way to determine the difference between two documents in that index
 * is `beats_stats.beat.type` which we are performing a terms agg in the above query.
 * If that value is `apm-server` and we're attempting to calculating status for beats
 * we need to ignore that data from that particular  bucket.
 *
 * @param {*} product The product object, which are stored in PRODUCTS
 * @param {*} bucket The agg bucket in the response
 */
function shouldSkipBucket(product, bucket) {
  if (product.name === BEATS_SYSTEM_ID && isBeatFromAPM(bucket)) {
    return true;
  }
  if (product.name === APM_CUSTOM_ID && !isBeatFromAPM(bucket)) {
    return true;
  }
  return false;
}

/**
 * This function will scan all monitoring documents within the past 30s (or a custom time range is supported too)
 * and determine which products fall into one of three states:
 * - isPartiallyMigrated: This means we are seeing some monitoring documents from MB and some from internal collection
 * - isFullyMigrated: This means we are only seeing monitoring documents from MB
 * - isInternalCollector: This means we are only seeing monitoring documents from internal collection
 *
 * If a product is partially migrated, this function will also return the timestamp of the last seen monitoring
 * document from internal collection. This will help the user understand if they successfully disabled internal
 * collection and just need to wait for the time window of the query to exclude the older, internally collected documents
 *
 * If a product is not detected at all (no monitoring documents), we will attempt to do some self discovery
 * based on assumptions around indices that might exist with various products. We will return something
 * like this in that case:
 * detected: {
 *   doesExist: boolean, // This product definitely exists but does not have any monitoring documents (kibana and ES)
 *   mightExist: boolean, // This product might exist based on the presence of some other indices
 * }

 * @param {*} req Standard request object. Can contain a timeRange to use for the query
 * @param {*} indexPatterns Map of index patterns to search against (will be all .monitoring-* indices)
 * @param {*} clusterUuid Optional and will be used to filter down the query if used
 */
export const getCollectionStatus = async (req, indexPatterns, clusterUuid) => {
  const config = req.server.config();
  const kibanaUuid = config.get('server.uuid');

  const PRODUCTS = [
    { name: KIBANA_SYSTEM_ID },
    { name: BEATS_SYSTEM_ID },
    { name: LOGSTASH_SYSTEM_ID },
    { name: APM_CUSTOM_ID, token: '-beats-' },
    { name: ELASTICSEARCH_CUSTOM_ID, token: '-es-' },
  ];

  const [
    recentDocuments,
    detectedProducts
  ] = await Promise.all([
    await getRecentMonitoringDocuments(req, indexPatterns, clusterUuid),
    await detectProducts(req)
  ]);

  const indicesBuckets = get(recentDocuments, 'aggregations.indices.buckets', []);

  const status = PRODUCTS.reduce((products, product) => {
    const token = product.token || product.name;
    const indexBuckets = indicesBuckets.filter(bucket => bucket.key.includes(token));
    const uuidBucketName = getUuidBucketName(product.name);

    const productStatus = {
      totalUniqueInstanceCount: 0,
      totalUniqueFullyMigratedCount: 0,
      totalUniquePartiallyMigratedCount: 0,
      detected: null,
      byUuid: {},
    };

    const fullyMigratedUuidsMap = {};
    const internalCollectorsUuidsMap = {};
    const partiallyMigratedUuidsMap = {};

    // If there is no data, then they are a net new user
    if (!indexBuckets || indexBuckets.length === 0) {
      productStatus.totalUniqueInstanceCount = 0;
      productStatus.detected = detectedProducts[product.name];
    }
    // If there is a single bucket, then they are fully migrated or fully on the internal collector
    else if (indexBuckets.length === 1) {
      const singleIndexBucket = indexBuckets[0];
      const isFullyMigrated = singleIndexBucket.key.includes(METRICBEAT_INDEX_NAME_UNIQUE_TOKEN);

      const map = isFullyMigrated ? fullyMigratedUuidsMap : internalCollectorsUuidsMap;
      const uuidBuckets = get(singleIndexBucket, `${uuidBucketName}.buckets`, []);
      for (const bucket of uuidBuckets) {
        if (shouldSkipBucket(product, bucket)) {
          continue;
        }
        const { key, by_timestamp: byTimestamp } = bucket;
        if (!map[key]) {
          map[key] = { lastTimestamp: get(byTimestamp, 'value') };
          if (product.name === KIBANA_SYSTEM_ID && key === kibanaUuid) {
            map[key].isPrimary = true;
          }
        }
      }
      productStatus.totalUniqueInstanceCount = Object.keys(map).length;
      productStatus.totalUniquePartiallyMigratedCount = Object.keys(partiallyMigratedUuidsMap).length;
      productStatus.totalUniqueFullyMigratedCount = Object.keys(fullyMigratedUuidsMap).length;
      productStatus.byUuid = {
        ...Object.keys(internalCollectorsUuidsMap).reduce((accum, uuid) => ({
          ...accum,
          [uuid]: { isInternalCollector: true, ...internalCollectorsUuidsMap[uuid] }
        }), {}),
        ...Object.keys(partiallyMigratedUuidsMap).reduce((accum, uuid) => ({
          ...accum,
          [uuid]: { isPartiallyMigrated: true, ...partiallyMigratedUuidsMap[uuid] }
        }), {}),
        ...Object.keys(fullyMigratedUuidsMap).reduce((accum, uuid) => ({
          ...accum,
          [uuid]: { isFullyMigrated: true, ...fullyMigratedUuidsMap[uuid] }
        }), {}),
      };
    }
    // If there are multiple buckets, they are partially upgraded assuming a single mb index exists
    else {
      const internalTimestamps = [];
      for (const indexBucket of indexBuckets) {
        const isFullyMigrated = indexBucket.key.includes(METRICBEAT_INDEX_NAME_UNIQUE_TOKEN);
        const map = isFullyMigrated ? fullyMigratedUuidsMap : internalCollectorsUuidsMap;
        const otherMap = !isFullyMigrated ? fullyMigratedUuidsMap : internalCollectorsUuidsMap;

        const uuidBuckets = get(indexBucket, `${uuidBucketName}.buckets`, []);
        for (const bucket of uuidBuckets) {
          if (shouldSkipBucket(product, bucket)) {
            continue;
          }

          const { key, by_timestamp: byTimestamp } = bucket;
          if (!map[key]) {
            if (otherMap[key]) {
              partiallyMigratedUuidsMap[key] = otherMap[key] || {};
              delete otherMap[key];
            }
            else {
              map[key] = {};
              if (product.name === KIBANA_SYSTEM_ID && key === kibanaUuid) {
                map[key].isPrimary = true;
              }
            }
          }
          if (!isFullyMigrated) {
            internalTimestamps.push(byTimestamp.value);
          }
        }
      }

      productStatus.totalUniqueInstanceCount = uniq([
        ...Object.keys(internalCollectorsUuidsMap),
        ...Object.keys(fullyMigratedUuidsMap),
        ...Object.keys(partiallyMigratedUuidsMap)
      ]).length;
      productStatus.totalUniquePartiallyMigratedCount = Object.keys(partiallyMigratedUuidsMap).length;
      productStatus.totalUniqueFullyMigratedCount = Object.keys(fullyMigratedUuidsMap).length;
      productStatus.byUuid = {
        ...Object.keys(internalCollectorsUuidsMap).reduce((accum, uuid) => ({
          ...accum,
          [uuid]: {
            isInternalCollector: true,
            ...internalCollectorsUuidsMap[uuid]
          }
        }), {}),
        ...Object.keys(partiallyMigratedUuidsMap).reduce((accum, uuid) => ({
          ...accum,
          [uuid]: {
            isPartiallyMigrated: true,
            lastInternallyCollectedTimestamp: internalTimestamps[0],
            ...partiallyMigratedUuidsMap[uuid]
          }
        }), {}),
        ...Object.keys(fullyMigratedUuidsMap).reduce((accum, uuid) => ({
          ...accum,
          [uuid]: {
            isFullyMigrated: true,
            ...fullyMigratedUuidsMap[uuid]
          }
        }), {}),
      };
    }

    return {
      ...products,
      [product.name]: productStatus,
    };
  }, {});

  status._meta = {
    secondsAgo: NUMBER_OF_SECONDS_AGO_TO_LOOK,
  };

  return status;
};
