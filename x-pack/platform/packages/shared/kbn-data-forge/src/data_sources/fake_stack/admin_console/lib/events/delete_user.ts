/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { sample, camelCase, random } from 'lodash';
import { faker } from '@faker-js/faker';
import { ADMIN_CONSOLE_HOSTS, ADMIN_CONSOLE, DOMAINS } from '../../../common/constants';
import { getLoggedInUser } from '../login_cache';
import { createEvent } from './create_base_event';
import { createDeleteEvent } from '../../../mongodb/lib/events/mongo_actions';
import { EventFunction } from '../../../../../types';
import { createNginxLog } from '../../../nginx_proxy/lib/events/create_nginx_log';

export const deleteUser: EventFunction = (_schedule, timestamp) => {
  const user = getLoggedInUser();
  const domain = sample(DOMAINS) as string;
  const method = 'POST';
  const statusCode = 200;
  const port = 6000;
  const path = '/api/deleteUser';
  const full = `https://${ADMIN_CONSOLE}.${domain}:${port}${path}`;
  const userAgent = faker.internet.userAgent();
  const bytes = parseInt(faker.string.numeric(2), 10);
  const host = sample(ADMIN_CONSOLE_HOSTS) as string;

  const event = createEvent(timestamp, ADMIN_CONSOLE, method, path, user, 'INFO', statusCode, {
    message: `${method} ${path} ${statusCode} ${bytes} - ${userAgent}`,
    event: {
      action: 'deleteUser',
      category: 'administrative',
      duration: random(10, 150) * 1000000,
    },
    'http.response.bytes': bytes,
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
    ...createDeleteEvent(
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
