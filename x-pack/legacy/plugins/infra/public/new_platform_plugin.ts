/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { CoreStart, PluginInitializerContext } from 'kibana/public';
import { InMemoryCache, IntrospectionFragmentMatcher } from 'apollo-cache-inmemory';
import ApolloClient from 'apollo-client';
import { ApolloLink } from 'apollo-link';
import { HttpLink } from 'apollo-link-http';
import { withClientState } from 'apollo-link-state';
import { startApp } from './apps/start_app';
import { InfraFrontendLibs } from './lib/lib';
import introspectionQueryResultData from './graphql/introspection.json';
import { InfraKibanaObservableApiAdapter } from './lib/adapters/observable_api/kibana_observable_api';

type ClientPlugins = any;
type LegacyDeps = any;

export class Plugin {
  constructor(context: PluginInitializerContext) {}
  start(core: CoreStart, plugins: ClientPlugins, __LEGACY: LegacyDeps) {
    startApp(this.composeLibs(core, plugins, __LEGACY), core, plugins);
  }

  composeLibs(core: CoreStart, plugins: ClientPlugins, legacy: LegacyDeps) {
    const cache = new InMemoryCache({
      addTypename: false,
      fragmentMatcher: new IntrospectionFragmentMatcher({
        introspectionQueryResultData,
      }),
    });

    const observableApi = new InfraKibanaObservableApiAdapter({
      basePath: core.http.basePath.get(),
    });

    const graphQLOptions = {
      cache,
      link: ApolloLink.from([
        withClientState({
          cache,
          resolvers: {},
        }),
        new HttpLink({
          credentials: 'same-origin',
          headers: {
            'kbn-xsrf': true,
          },
          uri: `${core.http.basePath.get()}/api/infra/graphql`,
        }),
      ]),
    };

    const apolloClient = new ApolloClient(graphQLOptions);

    // const infraModule = legacy.uiModules.get('app/infa');

    // const framework = new KibanaFramework(infraModule, legacy.uiRoutes, legacy.timezoneProvider);

    const libs: InfraFrontendLibs = {
      apolloClient,
      observableApi,
    };
    return libs;
  }
}
