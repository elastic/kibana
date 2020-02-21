/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ApolloClient, ApolloLink, InMemoryCache } from '@apollo/client';

import { CoreStart } from '../../plugin';
import { AppFrontendLibs } from '../lib';
import { getLinks } from './helpers';

export function compose(core: CoreStart): AppFrontendLibs {
  const basePath = core.http.basePath.get();

  const apolloClient = new ApolloClient({
    connectToDevTools: process.env.NODE_ENV !== 'production',
    // https://www.apollographql.com/docs/react/v3.0-beta/caching/cache-field-behavior/#the-merge-function
    cache: new InMemoryCache({
      typePolicies: {
        TimelineItem: {
          fields: {
            data: {
              merge(existing = [], incoming: []) {
                return [...existing, ...incoming];
              },
            },
          },
        },
      },
    }),
    link: ApolloLink.from(getLinks(basePath)),
  });

  const libs: AppFrontendLibs = {
    apolloClient,
  };
  return libs;
}
