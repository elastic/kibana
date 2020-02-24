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
    cache: new InMemoryCache({
      typePolicies: {
        TimelineItem: {
          keyFields: ['_id', '_index', 'data'],
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
