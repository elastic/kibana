/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { sample, random } from 'lodash';
import { faker } from '@faker-js/faker';
import { ADMIN_CONSOLE, DOMAINS } from '../../../common/constants';
import { createEvent } from './create_base_event';
import { EventFunction } from '../../../../../types';

export const internalError: EventFunction = (_schedule, timestamp) => {
  const user = {
    id: 'superuser',
    name: 'Superuser',
    roles: ['admin'],
  };
  const hackerNoun = faker.helpers.slugify(faker.hacker.noun());
  const domain = sample(DOMAINS) as string;
  const port = 6000;
  const path = '/api/listCustomers';
  const query = `view=${hackerNoun}`;
  const full = `https://${ADMIN_CONSOLE}.${domain}:${port}${path}?${query}`;

  return [
    createEvent(timestamp, ADMIN_CONSOLE, 'GET', path, user, 'ERROR', 500, {
      message: `ReferenceError: aggregateBy.${hackerNoun} is not defined`,
      event: {
        action: 'listCustomers',
        category: 'administrative',
        duration: random(100, 200) * 1000000,
      },
      url: {
        domain,
        subdomain: ADMIN_CONSOLE,
        port,
        full,
        path,
        query,
        username: user.id,
      },
      user_agent: {
        original: 'AppleWebKit/605.1.15 (KHTML, like Gecko) Version/12.0 637FCK3D',
      },
    }),
  ];
};
