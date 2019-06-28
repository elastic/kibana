/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { InfraSnapshotResponseResolvers, InfraSourceResolvers } from '../../graphql/types';
import { InfraSnapshotRequestOptions } from '../../lib/snapshot';
import { InfraSnapshot } from '../../lib/snapshot';
import { UsageCollector } from '../../usage/usage_collector';
import { parseFilterQuery } from '../../utils/serialized_query';
import { ChildResolverOf, InfraResolverOf, ResultOf } from '../../utils/typed_resolvers';
import { QuerySourceResolver } from '../sources/resolvers';

type InfraSourceSnapshotResolver = ChildResolverOf<
  InfraResolverOf<
    InfraSourceResolvers.SnapshotResolver<
      {
        source: ResultOf<QuerySourceResolver>;
      } & InfraSourceResolvers.SnapshotArgs
    >
  >,
  QuerySourceResolver
>;

type InfraNodesResolver = ChildResolverOf<
  InfraResolverOf<InfraSnapshotResponseResolvers.NodesResolver>,
  InfraSourceSnapshotResolver
>;

interface SnapshotResolversDeps {
  snapshot: InfraSnapshot;
}

export const createSnapshotResolvers = (
  libs: SnapshotResolversDeps
): {
  InfraSource: {
    snapshot: InfraSourceSnapshotResolver;
  };
  InfraSnapshotResponse: {
    nodes: InfraNodesResolver;
  };
} => ({
  InfraSource: {
    async snapshot(source, args) {
      return {
        source,
        timerange: args.timerange,
        filterQuery: args.filterQuery,
      };
    },
  },
  InfraSnapshotResponse: {
    async nodes(snapshotResponse, args, { req }) {
      const { source, timerange, filterQuery } = snapshotResponse;
      UsageCollector.countNode(args.type);
      const options: InfraSnapshotRequestOptions = {
        filterQuery: parseFilterQuery(filterQuery),
        nodeType: args.type,
        groupBy: args.groupBy,
        sourceConfiguration: source.configuration,
        metric: args.metric,
        timerange,
      };

      return await libs.snapshot.getNodes(req, options);
    },
  },
});
