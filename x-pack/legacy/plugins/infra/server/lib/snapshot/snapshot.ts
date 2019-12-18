/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { RequestHandlerContext } from 'src/core/server';
import { InfraSnapshotNode } from '../../graphql/types';
import { InfraDatabaseSearchResponse } from '../adapters/framework';
import { KibanaFramework } from '../adapters/framework/kibana_framework_adapter';
import { InfraSources } from '../sources';

import { JsonObject } from '../../../common/typed_json';
import { SNAPSHOT_COMPOSITE_REQUEST_SIZE } from './constants';
import {
  getGroupedNodesSources,
  getMetricsAggregations,
  getMetricsSources,
  getDateHistogramOffset,
} from './query_helpers';
import {
  getNodeMetrics,
  getNodeMetricsForLookup,
  getNodePath,
  InfraSnapshotNodeGroupByBucket,
  InfraSnapshotNodeMetricsBucket,
} from './response_helpers';
import { getAllCompositeData } from '../../utils/get_all_composite_data';
import { createAfterKeyHandler } from '../../utils/create_afterkey_handler';
import { findInventoryModel } from '../../../common/inventory_models';
import { InfraSnapshotRequestOptions } from './types';
import { createTimeRangeWithInterval } from './create_timerange_with_interval';

export class InfraSnapshot {
  constructor(private readonly libs: { sources: InfraSources; framework: KibanaFramework }) {}

  public async getNodes(
    requestContext: RequestHandlerContext,
    options: InfraSnapshotRequestOptions
  ): Promise<{ nodes: InfraSnapshotNode[]; interval: string }> {
    // Both requestGroupedNodes and requestNodeMetrics may send several requests to elasticsearch
    // in order to page through the results of their respective composite aggregations.
    // Both chains of requests are supposed to run in parallel, and their results be merged
    // when they have both been completed.
    const timeRangeWithIntervalApplied = await createTimeRangeWithInterval(
      this.libs.framework,
      requestContext,
      options
    );
    const optionsWithTimerange = { ...options, timerange: timeRangeWithIntervalApplied };
    const groupedNodesPromise = requestGroupedNodes(
      requestContext,
      optionsWithTimerange,
      this.libs.framework
    );
    const nodeMetricsPromise = requestNodeMetrics(
      requestContext,
      optionsWithTimerange,
      this.libs.framework
    );

    const groupedNodeBuckets = await groupedNodesPromise;
    const nodeMetricBuckets = await nodeMetricsPromise;
    return {
      nodes: mergeNodeBuckets(groupedNodeBuckets, nodeMetricBuckets, options),
      interval: timeRangeWithIntervalApplied.interval,
    };
  }
}

const bucketSelector = (
  response: InfraDatabaseSearchResponse<{}, InfraSnapshotAggregationResponse>
) => (response.aggregations && response.aggregations.nodes.buckets) || [];

const handleAfterKey = createAfterKeyHandler(
  'body.aggregations.nodes.composite.after',
  input => input?.aggregations?.nodes?.after_key
);

const requestGroupedNodes = async (
  requestContext: RequestHandlerContext,
  options: InfraSnapshotRequestOptions,
  framework: KibanaFramework
): Promise<InfraSnapshotNodeGroupByBucket[]> => {
  const inventoryModel = findInventoryModel(options.nodeType);
  const query = {
    allowNoIndices: true,
    index: `${options.sourceConfiguration.logAlias},${options.sourceConfiguration.metricAlias}`,
    ignoreUnavailable: true,
    body: {
      query: {
        bool: {
          filter: [
            ...createQueryFilterClauses(options.filterQuery),
            {
              range: {
                [options.sourceConfiguration.fields.timestamp]: {
                  gte: options.timerange.from,
                  lte: options.timerange.to,
                  format: 'epoch_millis',
                },
              },
            },
          ],
        },
      },
      size: 0,
      aggregations: {
        nodes: {
          composite: {
            size: SNAPSHOT_COMPOSITE_REQUEST_SIZE,
            sources: getGroupedNodesSources(options),
          },
          aggs: {
            ip: {
              top_hits: {
                sort: [{ [options.sourceConfiguration.fields.timestamp]: { order: 'desc' } }],
                _source: {
                  includes: inventoryModel.fields.ip ? [inventoryModel.fields.ip] : [],
                },
                size: 1,
              },
            },
          },
        },
      },
    },
  };

  return await getAllCompositeData<
    InfraSnapshotAggregationResponse,
    InfraSnapshotNodeGroupByBucket
  >(framework, requestContext, query, bucketSelector, handleAfterKey);
};

const requestNodeMetrics = async (
  requestContext: RequestHandlerContext,
  options: InfraSnapshotRequestOptions,
  framework: KibanaFramework
): Promise<InfraSnapshotNodeMetricsBucket[]> => {
  const index =
    options.metric.type === 'logRate'
      ? `${options.sourceConfiguration.logAlias}`
      : `${options.sourceConfiguration.metricAlias}`;

  const query = {
    allowNoIndices: true,
    index,
    ignoreUnavailable: true,
    body: {
      query: {
        bool: {
          filter: [
            {
              range: {
                [options.sourceConfiguration.fields.timestamp]: {
                  gte: options.timerange.from,
                  lte: options.timerange.to,
                  format: 'epoch_millis',
                },
              },
            },
          ],
        },
      },
      size: 0,
      aggregations: {
        nodes: {
          composite: {
            size: SNAPSHOT_COMPOSITE_REQUEST_SIZE,
            sources: getMetricsSources(options),
          },
          aggregations: {
            histogram: {
              date_histogram: {
                field: options.sourceConfiguration.fields.timestamp,
                interval: options.timerange.interval || '1m',
                offset: getDateHistogramOffset(options),
                extended_bounds: {
                  min: options.timerange.from,
                  max: options.timerange.to,
                },
              },
              aggregations: getMetricsAggregations(options),
            },
          },
        },
      },
    },
  };
  return await getAllCompositeData<
    InfraSnapshotAggregationResponse,
    InfraSnapshotNodeMetricsBucket
  >(framework, requestContext, query, bucketSelector, handleAfterKey);
};

// buckets can be InfraSnapshotNodeGroupByBucket[] or InfraSnapshotNodeMetricsBucket[]
// but typing this in a way that makes TypeScript happy is unreadable (if possible at all)
interface InfraSnapshotAggregationResponse {
  nodes: {
    buckets: any[];
    after_key: { [id: string]: string };
  };
}

const mergeNodeBuckets = (
  nodeGroupByBuckets: InfraSnapshotNodeGroupByBucket[],
  nodeMetricsBuckets: InfraSnapshotNodeMetricsBucket[],
  options: InfraSnapshotRequestOptions
): InfraSnapshotNode[] => {
  const nodeMetricsForLookup = getNodeMetricsForLookup(nodeMetricsBuckets);

  return nodeGroupByBuckets.map(node => {
    return {
      path: getNodePath(node, options),
      metric: getNodeMetrics(nodeMetricsForLookup[node.key.id], options),
    };
  });
};

const createQueryFilterClauses = (filterQuery: JsonObject | undefined) =>
  filterQuery ? [filterQuery] : [];
