/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { faker } from '@faker-js/faker';
import { EventFunction } from '../../../../../types';
import { NGINX_PROXY, NGINX_PROXY_HOSTS } from '../../../common/constants';
import { createNginxTimestamp } from '../create_nginx_timestamp';

export const createStartupEvents: EventFunction = (_schedule, timestamp) => {
  return NGINX_PROXY_HOSTS.map((name) => {
    const pid = faker.string.numeric(4);
    const threadId = faker.string.numeric(4);
    return [
      `[${createNginxTimestamp(
        timestamp
      )}] [notice] ${pid}#${threadId}: using the "epoll" event method`,
      `[${createNginxTimestamp(timestamp)}] [notice] ${pid}#${threadId}: nginx/1.18.0 (Ubuntu)`,
      `[${createNginxTimestamp(
        timestamp
      )}] [notice] ${pid}#${threadId}: built by gcc 7.5.0 (Ubuntu 7.5.0-3ubuntu1~18.04)`,
      `[${createNginxTimestamp(
        timestamp
      )}] [notice] ${pid}#${threadId}: OS: Linux 5.4.0-72-generic`,
      `[${createNginxTimestamp(
        timestamp
      )}] [notice] ${pid}#${threadId}: getrlimit(RLIMIT_NOFILE): 1024:4096`,
      `[${createNginxTimestamp(timestamp)}] [notice] ${pid}#${threadId}: start worker processes`,
      `[${createNginxTimestamp(timestamp)}] ${pid}#${threadId}: start worker process ${pid}`,
    ].map((message) => ({
      namespace: NGINX_PROXY,
      '@timestamp': timestamp.toISOString(),
      message,
      host: { name },
      log: {
        level: 'ERROR',
        logger: NGINX_PROXY,
      },
    }));
  }).flat();
};
