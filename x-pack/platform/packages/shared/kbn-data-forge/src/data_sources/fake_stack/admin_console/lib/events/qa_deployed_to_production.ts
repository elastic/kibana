/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { sample } from 'lodash';
import { faker } from '@faker-js/faker';
import { ADMIN_CONSOLE, ADMIN_CONSOLE_QA_HOSTS, DOMAINS } from '../../../common/constants';
import { getLoggedInUser } from '../login_cache';
import { EventFunction } from '../../../../../types';
import { createUpstreamTimeout } from '../../../nginx_proxy/lib/events/create_upstream_timedout';
import { createNginxLog } from '../../../nginx_proxy/lib/events/create_nginx_log';

interface Endpoint {
  path: string;
  method: 'GET' | 'POST';
  action: string;
  category: string;
}

const ENDPOINTS: Endpoint[] = [
  {
    path: '/api/listCustomers',
    method: 'GET',
    action: 'listCustomers',
    category: 'administrative',
  },
  { path: '/api/viewUsers', method: 'GET', action: 'viewUsers', category: 'administrative' },
  { path: '/api/deleteUser', method: 'POST', action: 'deleteUser', category: 'administrative' },
  { path: '/api/createUser', method: 'POST', action: 'createUser', category: 'administrative' },
  { path: '/api/editUser', method: 'POST', action: 'editUser', category: 'administrative' },
];

export const qaDeployedToProduction: EventFunction = (_schedule, timestamp) => {
  const endpoint = sample(ENDPOINTS) as Endpoint;
  const user = getLoggedInUser();
  const { path, method } = endpoint;
  const host = sample(ADMIN_CONSOLE_QA_HOSTS) as string;
  const domain = sample(DOMAINS) as string;
  const port = 3333;
  const userAgent = faker.internet.userAgent();

  return [
    ...createUpstreamTimeout(
      timestamp,
      method,
      path,
      `${ADMIN_CONSOLE}.${domain}`,
      `${host}:${port}`,
      user.id
    ),
    ...createNginxLog(
      timestamp,
      method,
      502,
      0,
      path,
      `https://${ADMIN_CONSOLE}.${domain}`,
      userAgent,
      domain,
      `${host}:${port}`,
      user.id
    ),
  ];
};
