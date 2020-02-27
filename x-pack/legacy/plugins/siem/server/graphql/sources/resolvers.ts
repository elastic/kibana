/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  ResolversParentTypes,
  Resolver,
  ResolversTypes,
  Maybe,
  QuerySourceArgs,
  RequireFields,
} from '../../graphql/types';
import { SourceStatus } from '../../lib/source_status';
import { Sources } from '../../lib/sources';
import { SiemContext } from '../../lib/types';

export const createSourcesResolvers = (libs: {
  sources: Sources;
  sourceStatus: SourceStatus;
}): {
  Query: {
    source: Resolver<
      Pick<ResolversParentTypes['Source'], 'id' | 'configuration'>,
      ResolversParentTypes['Source'],
      SiemContext,
      RequireFields<QuerySourceArgs, 'id'>
    >;
    allSources: Resolver<
      Array<Pick<ResolversParentTypes['Source'], 'id' | 'configuration'>>,
      ResolversParentTypes['Source'],
      SiemContext
    >;
  };
  Source: {
    status: Resolver<
      Maybe<ResolversTypes['SourceStatus']>,
      ResolversParentTypes['SourceStatus'],
      SiemContext
    >;
  };
} => ({
  Query: {
    async source(root, args) {
      const requestedSourceConfiguration = await libs.sources.getConfiguration(args.id);

      return {
        id: args.id,
        configuration: requestedSourceConfiguration,
      };
    },
    async allSources() {
      const sourceConfigurations = await libs.sources.getAllConfigurations();

      return Object.entries(sourceConfigurations).map(([sourceName, sourceConfiguration]) => ({
        id: sourceName,
        configuration: sourceConfiguration,
      }));
    },
  },
  Source: {
    async status(source) {
      return source;
    },
  },
});
