/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { InMemoryCache, IntrospectionFragmentMatcher } from 'apollo-cache-inmemory';
import ApolloClient from 'apollo-client';
import { ApolloLink } from 'apollo-link';
import 'ui/autoload/all';
// @ts-ignore: path dynamic for kibana
import { uiModules } from 'ui/modules';

import introspectionQueryResultData from '../../graphql/introspection.json';
import { AppFrontendLibs } from '../lib';
import { getLinks } from './helpers';

export function compose(): AppFrontendLibs {
  const cache = new InMemoryCache({
    dataIdFromObject: () => null,
    fragmentMatcher: new IntrospectionFragmentMatcher({
      introspectionQueryResultData,
    }),
  });

  const graphQLOptions = {
    connectToDevTools: process.env.NODE_ENV !== 'production',
    cache,
    link: ApolloLink.from(getLinks(cache)),
  };

  const apolloClient = new ApolloClient(graphQLOptions);

  const libs: AppFrontendLibs = {
    apolloClient,
  };
  return libs;
}
