/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { InfraBackendLibs } from '../../lib/infra_types';
import { InfraSnapshotRequestOptions } from '../../lib/snapshot';
import { UsageCollector } from '../../usage/usage_collector';
import { parseFilterQuery } from '../../utils/serialized_query';
import { InfraSnapshotNode, SnapshotRequest } from './types';

export const initSnapshotRoute = (libs: InfraBackendLibs) => {
  const { framework } = libs;

  framework.registerRoute<SnapshotRequest, Promise<{ nodes: InfraSnapshotNode[] }>>({
    method: 'POST',
    path: '/api/metrics/snapshot',
    handler: async req => {
      const source = await libs.sources.getSourceConfiguration(req, req.payload.sourceId);
      UsageCollector.countNode(req.payload.nodeType);
      const options: InfraSnapshotRequestOptions = {
        filterQuery: parseFilterQuery(req.payload.filterQuery),
        nodeType: req.payload.nodeType,
        groupBy: req.payload.groupBy,
        sourceConfiguration: source.configuration,
        metric: req.payload.metric,
        timerange: req.payload.timerange,
      };
      return { nodes: await libs.snapshot.getNodes(req, options) };
    },
  });
};
