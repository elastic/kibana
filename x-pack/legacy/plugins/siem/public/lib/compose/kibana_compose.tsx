/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ApolloClient, ApolloLink, InMemoryCache } from '@apollo/client';
import 'ui/autoload/all';
// @ts-ignore: path dynamic for kibana
import { uiModules } from 'ui/modules';

import introspectionQueryResultData from '../../graphql/introspection.json';
import { AppFrontendLibs } from '../lib';
import { getLinks } from './helpers';

export function compose(): AppFrontendLibs {
  const graphQLOptions = {
    connectToDevTools: process.env.NODE_ENV !== 'production',
    cache: new InMemoryCache(),
    link: ApolloLink.from(getLinks()),
  };

  const apolloClient = new ApolloClient(graphQLOptions);

  const libs: AppFrontendLibs = {
    apolloClient,
  };
  return libs;
}
