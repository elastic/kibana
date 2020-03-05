/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { HttpLink } from '@apollo/client';

import { errorLink, reTryOneTimeOnErrorLink } from '../../containers/errors';

export const getLinks = (basePath: string) => [
  errorLink,
  reTryOneTimeOnErrorLink,
  new HttpLink({
    credentials: 'same-origin',
    headers: { 'kbn-xsrf': 'true' },
    uri: `${basePath}/api/siem/graphql`,
  }),
];
