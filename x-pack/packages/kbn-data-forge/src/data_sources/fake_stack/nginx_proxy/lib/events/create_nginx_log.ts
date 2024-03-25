/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { faker } from '@faker-js/faker';
import { memoize, sample } from 'lodash';
import { Moment } from 'moment';
import { NGINX_PROXY, NGINX_PROXY_HOSTS } from '../../../common/constants';
import { createNginxTimestamp } from '../create_nginx_timestamp';

const getClientIp = memoize((_userId: string) => {
  return faker.internet.ip();
});

export const createNginxLog = (
  timestamp: Moment,
  method: string,
  statusCode: number,
  bytes: number,
  path: string,
  url: string,
  userAgent: string,
  domain: string,
  hostWithPort: string,
  userId: string
) => {
  const host = sample(NGINX_PROXY_HOSTS) as string;
  return [
    {
      namespace: NGINX_PROXY,
      '@timestamp': timestamp.toISOString(),
      message: `[${createNginxTimestamp(timestamp)}] ${getClientIp(
        userId
      )} - ${userId} ${domain} to: ${hostWithPort}: "${method} ${path} HTTP/1.1" ${statusCode} ${bytes} "${url}" "${userAgent}"`,
      log: { level: 'INFO', logger: NGINX_PROXY },
      host: { name: host },
      http: { response: { status_code: statusCode, bytes } },
      url: { domain },
    },
  ];
};
