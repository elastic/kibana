/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { faker } from '@faker-js/faker';

interface Cloud {
  availability_zone: string;
  image: {
    id: string;
  };
  instance: {
    id: string;
  };
  provider: string;
  service: {
    name: string;
  };
  machine: {
    type: string;
  };
  region: string;
  account: {
    id: string;
  };
}

export function generateRegion() {
  return (
    faker.helpers
      .shuffle([
        'us-east-2',
        'us-east-1',
        'us-west-1',
        'us-west-2',
        'af-south-1',
        'ap-east-1',
        'ap-south-2',
        'ap-southeast-3',
        'ap-southeast-4',
        'ap-south-1',
        'ap-northeast-3',
        'ap-northeast-2',
        'ap-southeast-1',
        'ap-southeast-2',
        'ap-northeast-1',
        'ca-central-1',
        'ca-west-1',
        'eu-central-1',
        'eu-west-1',
        'eu-west-2',
        'eu-south-1',
        'eu-west-3',
        'eu-south-2',
        'eu-north-1',
        'eu-central-2',
        'il-central-1',
        'me-south-1',
        'me-central-1',
        'sa-east-1',
      ])
      .pop() || 'us-east-1'
  );
}

function machineType() {
  return (
    faker.helpers
      .shuffle([
        't2.micro',
        't2.small',
        't2.medium',
        't3.micro',
        't3.small',
        't3.medium',
        'm4.large',
        'm4.xlarge',
        'm4.2xlarge',
        'm5.large',
        'm5.xlarge',
        'm5.2xlarge',
        'c4.large',
        'c4.xlarge',
        'c4.2xlarge',
        'c5.large',
        'c5.xlarge',
        'c5.2xlarge',
        'r4.large',
        'r4.xlarge',
      ])
      .pop() || 'c4.large'
  );
}

function generateAvailabilityZone(region: string) {
  return `${region}${faker.helpers.shuffle(['a', 'b', 'c', 'd']).pop()}`;
}

export function generateAccountId() {
  return faker.string.numeric(12);
}

interface Options {
  region?: string;
  accountId?: string;
}
export function generateCloud(options?: Options): Cloud {
  const region = options?.region ?? generateRegion();
  return {
    availability_zone: generateAvailabilityZone(region),
    image: {
      id: faker.string.hexadecimal({ length: 12, prefix: 'ami-' }),
    },
    instance: {
      id: faker.string.hexadecimal({ length: 12, prefix: 'i-' }),
    },
    provider: 'aws',
    service: {
      name: 'EC2',
    },
    machine: {
      type: machineType(),
    },
    region,
    account: {
      id: options?.accountId ?? generateAccountId(),
    },
  };
}
