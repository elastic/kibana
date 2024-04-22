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

// 2023/09/12 12:34:56 [error] 12345#12345: *789 upstream timed out (110: Connection timed out) while connecting to upstream, client: 123.456.789.123, server: example.com, request: "GET /some/path HTTP/1.1", upstream: "http://127.0.0.1:6000/some/path", host: "example.com"

export const createUpstreamTimeout = (
  timestamp: Moment,
  method: string,
  path: string,
  domain: string,
  hostWithPort: string,
  userId: string
) => {
  const host = sample(NGINX_PROXY_HOSTS) as string;
  const connectionCode = faker.string.numeric(3);
  return [
    {
      namespace: NGINX_PROXY,
      '@timestamp': timestamp.toISOString(),
      message: `[${createNginxTimestamp(
        timestamp
      )}] *${connectionCode} upstream timed out (110: Connection timed out) while connecting to upstream, client: ${getClientIp(
        userId
      )}, server: ${domain}, request: "${method} ${path} HTTP/1.1", upstream: "http://${hostWithPort}${path}", host: "${domain}"`,
      log: { level: 'ERROR', logger: NGINX_PROXY },
      host: { name: host },
      http: { response: { status_code: 502, bytes: 0 } },
      url: { domain },
    },
  ];
};
