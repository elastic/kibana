/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { faker } from '@faker-js/faker';
import { Moment } from 'moment';
import { URL } from 'node:url';

//  $remote_addr - $remote_user [$time_local] "$request" $status $body_bytes_sent "$http_referer" "$http_user_agent"

export function generateLogMessage(timestamp: Moment) {
  const statusCode = faker.internet.httpStatusCode();
  const method = faker.internet.httpMethod();
  const logLevel = statusCode >= 500 ? 'error' : 'info';
  const userAgent = faker.internet.userAgent();
  const remoteAddress = faker.internet.ipv4();
  const path = `/api/${faker.word.noun()}/${faker.word.verb()}`;
  const rawUrl = `${faker.internet.url()}/${path}`;
  const parsedUrl = new URL(rawUrl);
  const bytesSent = parseInt(
    faker.string.numeric({ length: { min: 3, max: 10 }, allowLeadingZeros: false }),
    10
  );
  const message = `${remoteAddress} - - [${timestamp.toISOString()}] "${method} ${path} HTTP/1.1" ${statusCode} ${bytesSent} "${
    parsedUrl.origin
  }" "${userAgent}"`;
  return {
    message,
    log: { level: logLevel },
    url: {
      domain: parsedUrl.hostname,
      port: parsedUrl.port || 80,
      full: rawUrl,
      original: rawUrl,
      path,
      scheme: parsedUrl.protocol,
    },
    http: {
      request: {
        method,
        referrer: parsedUrl.origin,
        mime_type: 'application/json',
        body: {
          bytes: parseInt(faker.string.numeric(3), 10),
        },
      },
      response: {
        bytes: bytesSent,
        mime_type: 'application/json',
        status_code: statusCode,
      },
      version: '1.1',
    },
    user_agent: {
      original: userAgent,
    },
  };
}
