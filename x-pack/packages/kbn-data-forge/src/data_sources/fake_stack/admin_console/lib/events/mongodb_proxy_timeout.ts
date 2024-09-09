/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { sample } from 'lodash';
import { faker } from '@faker-js/faker';
import { ADMIN_CONSOLE, ADMIN_CONSOLE_HOSTS, DOMAINS } from '../../../common/constants';
import { createEvent } from './create_base_event';
import { getLoggedInUser } from '../login_cache';
import { EventFunction } from '../../../../../types';
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

export const mongodbProxyTimeout: EventFunction = (_schedule, timestamp) => {
  const endpoint = sample(ENDPOINTS) as Endpoint;
  const user = getLoggedInUser();
  const { path, method } = endpoint;
  const host = sample(ADMIN_CONSOLE_HOSTS) as string;
  const domain = sample(DOMAINS) as string;
  const port = 6000;
  const full = `https://${ADMIN_CONSOLE}.${domain}:${port}${path}`;
  const userAgent = faker.internet.userAgent();

  return [
    createEvent(timestamp, ADMIN_CONSOLE, method, path, user, 'ERROR', 500, {
      message: `WARNING: MongoDB Connection Timeout - Failed to connect to the database`,
      event: {
        action: endpoint.action,
        category: endpoint.category,
        duration: 60000 * 1000000,
      },
      host: { name: host },
      url: {
        domain,
        subdomain: ADMIN_CONSOLE,
        port,
        full,
        path,
        username: user.id,
      },
      user_agent: {
        original: userAgent,
      },
    }),
    ...createNginxLog(
      timestamp,
      method,
      500,
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
