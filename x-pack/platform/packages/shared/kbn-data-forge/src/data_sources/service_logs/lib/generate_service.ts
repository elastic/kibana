/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { faker } from '@faker-js/faker';
import { sample, times } from 'lodash';
import { generateHost } from './generate_host';
import { generateAccountId, generateCloud, generateRegion } from './generate_cloud';

interface Service {
  id: string;
  name: string;
  environment: string;
  namespace: string;
  instance: {
    id: string;
  };
  node: {
    name: string;
    roles: string[];
  };
  type: string;
  version: string;
  hostsWithCloud: any[];
}

const services: Record<number, Service> = {};

export function generateService(id: number): Service {
  if (services[id]) return services[id];
  const regions = times(faker.helpers.rangeToNumber({ min: 1, max: 3 })).map(() =>
    generateRegion()
  );
  const accountId = generateAccountId();
  const hostsWithCloud = times(faker.helpers.rangeToNumber({ min: 20, max: 60 })).map(() => ({
    host: generateHost(),
    cloud: generateCloud({ region: sample(regions) || regions[0], accountId }),
  }));
  const service = {
    id: faker.string.nanoid(),
    name: `${faker.git.branch()}-${id}`,
    environment:
      faker.helpers.shuffle(['production', 'staging', 'qa', 'development']).pop() || 'production',
    namespace: faker.hacker.noun(),
    instance: {
      id: faker.string.uuid(),
    },
    node: {
      roles: [`service-${id}`],
      name: `instance-${faker.string.nanoid()}`,
    },
    type: 'fake',
    version: faker.system.semver(),
    hostsWithCloud,
  };

  services[id] = service;
  return service;
}
