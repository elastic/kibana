/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// @ts-ignore: path dynamic for kibana
import chrome from 'ui/chrome';
// @ts-ignore: path dynamic for kibana
import { uiModules } from 'ui/modules';
// @ts-ignore: path dynamic for kibana
import { timezoneProvider } from 'ui/vis/lib/timezone';

import { InMemoryCache, IntrospectionFragmentMatcher } from 'apollo-cache-inmemory';
import ApolloClient from 'apollo-client';
import { ApolloLink } from 'apollo-link';
import { HttpLink } from 'apollo-link-http';
import { withClientState } from 'apollo-link-state';
import { InfraFrontendLibs } from '../lib';
import introspectionQueryResultData from '../../graphql/introspection.json';
import { InfraKibanaObservableApiAdapter } from '../adapters/observable_api/kibana_observable_api';

export function compose(): InfraFrontendLibs {
  const cache = new InMemoryCache({
    addTypename: false,
    fragmentMatcher: new IntrospectionFragmentMatcher({
      introspectionQueryResultData,
    }),
  });

  const observableApi = new InfraKibanaObservableApiAdapter({
    basePath: chrome.getBasePath(),
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
          'kbn-xsrf': chrome.getXsrfToken(),
        },
        uri: `${chrome.getBasePath()}/api/infra/graphql`,
      }),
    ]),
  };

  const apolloClient = new ApolloClient(graphQLOptions);

  const libs: InfraFrontendLibs = {
    apolloClient,
    observableApi,
  };
  return libs;
}
