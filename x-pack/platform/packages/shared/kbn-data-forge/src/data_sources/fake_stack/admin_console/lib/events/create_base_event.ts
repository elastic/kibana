/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { sample } from 'lodash';
import { set } from '@kbn/safer-lodash-set';
import { faker } from '@faker-js/faker';
import { Moment } from 'moment';
import { ADMIN_CONSOLE_HOSTS, DOMAINS } from '../../../common/constants';
import { User } from '../login_cache';

export function createEvent(
  timestamp: Moment,
  source: string,
  method: string,
  path: string,
  user: User,
  level: 'ERROR' | 'INFO' = 'INFO',
  statusCode = 200,
  overrides?: Record<string, unknown>
) {
  const domain = sample(DOMAINS);
  const port = 6000;
  const full = `https://${source}.${domain}:${port}${path}`;
  const userAgent = faker.internet.userAgent();
  const baseEvent = {
    namespace: source,
    '@timestamp': timestamp.toISOString(),
    tags: [`infra:${source}`],
    host: { name: sample(ADMIN_CONSOLE_HOSTS) },
    log: {
      level,
      logger: source,
    },
    server: {
      port,
    },
    http: {
      request: {
        bytes: parseInt(faker.string.numeric(4), 10),
        method,
        mime_type: 'application/json',
      },
      response: {
        status_code: statusCode,
        mime_type: 'application/json',
        bytes: parseInt(faker.string.numeric(3), 10),
      },
    },
    url: {
      domain,
      subdomain: source,
      full,
      port,
      path,
      username: user.id,
    },
    user,
    user_agent: {
      original: userAgent,
    },
  };

  return overrides != null
    ? Object.keys(overrides).reduce((acc, key) => {
        const value = overrides[key];
        return set(acc, key, value);
      }, baseEvent)
    : baseEvent;
}
