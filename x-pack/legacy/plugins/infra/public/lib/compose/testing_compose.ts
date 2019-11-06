/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import 'ui/autoload/all';
// @ts-ignore: path dynamic for kibana
import chrome from 'ui/chrome';
// @ts-ignore: path dynamic for kibana
import { uiModules } from 'ui/modules';
import uiRoutes from 'ui/routes';
// @ts-ignore: path dynamic for kibana
import { timezoneProvider } from 'ui/vis/lib/timezone';

import { InMemoryCache } from 'apollo-cache-inmemory';
import ApolloClient from 'apollo-client';
import { SchemaLink } from 'apollo-link-schema';
import { addMockFunctionsToSchema, makeExecutableSchema } from 'graphql-tools';
import { KibanaFramework } from '../adapters/framework/kibana_framework_adapter';
import { InfraKibanaObservableApiAdapter } from '../adapters/observable_api/kibana_observable_api';
import { InfraFrontendLibs } from '../lib';

export function compose(): InfraFrontendLibs {
  const infraModule = uiModules.get('app/infa');
  const observableApi = new InfraKibanaObservableApiAdapter({
    basePath: chrome.getBasePath(),
    xsrfToken: chrome.getXsrfToken(),
  });
  const framework = new KibanaFramework(infraModule, uiRoutes, timezoneProvider);
  const typeDefs = `
  Query {}
`;

  const mocks = {
    Mutation: () => undefined,
    Query: () => undefined,
  };

  const schema = makeExecutableSchema({ typeDefs });
  addMockFunctionsToSchema({
    mocks,
    schema,
  });

  const cache = new InMemoryCache((window as any).__APOLLO_CLIENT__);

  const apolloClient = new ApolloClient({
    cache,
    link: new SchemaLink({ schema }),
  });

  const libs: InfraFrontendLibs = {
    apolloClient,
    framework,
    observableApi,
  };
  return libs;
}
