/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { sample, camelCase, random } from 'lodash';
import { faker } from '@faker-js/faker';
import { createUser, loginUser } from '../login_cache';
import { createEvent } from './create_base_event';
import { ADMIN_CONSOLE_HOSTS, ADMIN_CONSOLE, DOMAINS } from '../../../common/constants';
import { createReadEvent } from '../../../mongodb/lib/events/mongo_actions';
import { EventFunction } from '../../../../../types';
import { createNginxLog } from '../../../nginx_proxy/lib/events/create_nginx_log';

export const login: EventFunction = (_schedule, timestamp) => {
  const user = createUser();
  const host = sample(ADMIN_CONSOLE_HOSTS) as string;
  const domain = sample(DOMAINS) as string;
  const port = 6000;
  const method = 'POST';
  const path = '/api/login';
  const statusCode = 201;
  loginUser(user);
  const full = `https://${ADMIN_CONSOLE}.${domain}:${port}${path}`;
  const userAgent = faker.internet.userAgent();
  const bytes = parseInt(faker.string.numeric(3), 10);
  const event = createEvent(timestamp, ADMIN_CONSOLE, method, path, user, 'INFO', statusCode, {
    message: `${user.id} successfully logged in.`,
    'event.action': 'login',
    'event.category': 'authentication',
    'event.duration': random(10, 100) * 1000000,
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
  });

  return [
    event,
    ...createReadEvent(
      timestamp,
      host,
      camelCase(`${ADMIN_CONSOLE}-agent`),
      camelCase(ADMIN_CONSOLE),
      'users'
    ),
    ...createNginxLog(
      timestamp,
      method,
      statusCode,
      bytes,
      path,
      `https://${ADMIN_CONSOLE}.${domain}`,
      userAgent,
      domain,
      `${host}:${port}`,
      user.id
    ),
  ];
};
