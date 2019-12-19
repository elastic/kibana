/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IResolvers, makeExecutableSchema } from 'graphql-tools';
import { initIpToHostName } from './routes/ip_to_hostname';
import { schemas } from './graphql';
import { createLogEntriesResolvers } from './graphql/log_entries';
import { createSourceStatusResolvers } from './graphql/source_status';
import { createSourcesResolvers } from './graphql/sources';
import { InfraBackendLibs } from './lib/infra_types';
import {
  initGetLogEntryRateRoute,
  initValidateLogAnalysisIndicesRoute,
} from './routes/log_analysis';
import { initMetricExplorerRoute } from './routes/metrics_explorer';
import { initMetadataRoute } from './routes/metadata';
import { initSnapshotRoute } from './routes/snapshot';
import { initNodeDetailsRoute } from './routes/node_details';
import {
  initLogEntriesSummaryRoute,
  initLogEntriesSummaryHighlightsRoute,
} from './routes/log_entries';
import { initInventoryMetaRoute } from './routes/inventory_metadata';

export const initInfraServer = (libs: InfraBackendLibs) => {
  const schema = makeExecutableSchema({
    resolvers: [
      createLogEntriesResolvers(libs) as IResolvers,
      createSourcesResolvers(libs) as IResolvers,
      createSourceStatusResolvers(libs) as IResolvers,
    ],
    typeDefs: schemas,
  });

  libs.framework.registerGraphQLEndpoint('/graphql', schema);

  initIpToHostName(libs);
  initGetLogEntryRateRoute(libs);
  initSnapshotRoute(libs);
  initNodeDetailsRoute(libs);
  initValidateLogAnalysisIndicesRoute(libs);
  initLogEntriesSummaryRoute(libs);
  initLogEntriesSummaryHighlightsRoute(libs);
  initMetricExplorerRoute(libs);
  initMetadataRoute(libs);
  initInventoryMetaRoute(libs);
};
