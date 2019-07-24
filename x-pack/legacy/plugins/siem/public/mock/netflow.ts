/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ONE_MILLISECOND_AS_NANOSECONDS } from '../components/formatted_duration/helpers';
import { Ecs } from '../graphql/types';

/** Returns mock data for testing the Netflow component */
export const getMockNetflowData = (): Ecs => ({
  destination: {
    bytes: [40],
    geo: {
      city_name: ['New York'],
      continent_name: ['North America'],
      country_iso_code: ['US'],
      country_name: ['United States'],
      region_name: ['New York'],
    },
    ip: ['10.1.2.3'],
    packets: [1],
    port: [80],
  },
  event: {
    action: ['network_flow'],
    category: ['network_traffic'],
    duration: [ONE_MILLISECOND_AS_NANOSECONDS],
    end: ['2018-11-12T19:03:25.936Z'],
    start: ['2018-11-12T19:03:25.836Z'],
  },
  _id: 'abcd',
  network: {
    bytes: [100],
    community_id: ['we.live.in.a'],
    direction: ['outgoing'],
    packets: [3],
    protocol: ['http'],
    transport: ['tcp'],
  },
  process: {
    name: ['rat'],
  },
  source: {
    bytes: [60],
    geo: {
      city_name: ['Atlanta'],
      continent_name: ['North America'],
      country_iso_code: ['US'],
      country_name: ['United States'],
      region_name: ['Georgia'],
    },
    ip: ['192.168.1.2'],
    packets: [2],
    port: [9987],
  },
  timestamp: '2018-11-12T19:03:25.936Z',
  tls: {
    client_certificate: {
      fingerprint: {
        sha1: ['tls.client_certificate.fingerprint.sha1-value'],
      },
    },
    fingerprints: {
      ja3: {
        hash: ['tls.fingerprints.ja3.hash-value'],
      },
    },
    server_certificate: {
      fingerprint: {
        sha1: ['tls.server_certificate.fingerprint.sha1-value'],
      },
    },
  },
  user: {
    name: ['first.last'],
  },
});
