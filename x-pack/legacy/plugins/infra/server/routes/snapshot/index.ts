/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import Boom from 'boom';
import { pipe } from 'fp-ts/lib/pipeable';
import { fold } from 'fp-ts/lib/Either';
import { identity } from 'fp-ts/lib/function';
import { InfraBackendLibs } from '../../lib/infra_types';
import { InfraSnapshotRequestOptions } from '../../lib/snapshot';
import { UsageCollector } from '../../usage/usage_collector';
import { parseFilterQuery } from '../../utils/serialized_query';
import { InfraNodeType, InfraSnapshotMetricInput } from '../../../public/graphql/types';
import {
  SnapshotRequestRT,
  SnapshotWrappedRequest,
  SnapshotNodeResponse,
} from '../../../common/http_api/snapshot_api';
import { throwErrors } from '../../../common/runtime_types';

export const initSnapshotRoute = (libs: InfraBackendLibs) => {
  const { framework } = libs;

  framework.registerRoute<SnapshotWrappedRequest, Promise<SnapshotNodeResponse>>({
    method: 'POST',
    path: '/api/metrics/snapshot',
    handler: async req => {
      const { filterQuery, nodeType, groupBy, sourceId, metric, timerange } = pipe(
        SnapshotRequestRT.decode(req.payload),
        fold(throwErrors(Boom.badRequest), identity)
      );
      const source = await libs.sources.getSourceConfiguration(req, sourceId);
      UsageCollector.countNode(nodeType);
      const options: InfraSnapshotRequestOptions = {
        filterQuery: parseFilterQuery(filterQuery),
        // TODO: Use common infra metric and replace graphql type
        nodeType: nodeType as InfraNodeType,
        groupBy,
        sourceConfiguration: source.configuration,
        // TODO: Use common infra metric and replace graphql type
        metric: metric as InfraSnapshotMetricInput,
        timerange,
      };
      return { nodes: await libs.snapshot.getNodes(req, options) };
    },
  });
};
