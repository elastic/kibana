/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { faker } from '@faker-js/faker';
import { times } from 'lodash';

export function generateHost() {
  const ipAddress = faker.internet.ipv4();
  const name = `ip-${ipAddress.replaceAll('.', '_')}.internal`;
  return {
    hostname: name,
    os: {
      kernel: '5.10.210-201.855.amzn2.aarch64',
      codename: 'focal',
      name: 'Ubuntu',
      type: 'linux',
      family: 'debian',
      version: '20.04.6 LTS (Focal Fossa)',
      platform: 'ubuntu',
    },
    containerized: true,
    ip: [ipAddress, faker.internet.ipv6()],
    name,
    mac: times(faker.helpers.rangeToNumber({ min: 5, max: 10 })).map(() => faker.internet.mac()),
    architecture: 'aarch64',
  };
}
