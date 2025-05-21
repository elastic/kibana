/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type FleetServerAgent } from '../../common/types';

export const createAgentDoc = (
  id: string,
  policy: string,
  status = 'online',
  version: string = '8.1.0',
  data?: Partial<FleetServerAgent>
) => ({
  access_api_key_id: 'abcdefghijklmn',
  action_seq_no: [-1],
  active: true,
  agent: {
    id,
    version,
  },
  enrolled_at: new Date().toISOString(),
  local_metadata: {
    elastic: {
      agent: {
        'build.original': version,
        id,
        log_level: 'info',
        snapshot: true,
        upgradeable: true,
        version,
      },
    },
    host: {
      architecture: 'x86_64',
      hostname: id,
      id: 'AAAAAAAA-BBBB-CCCC-DDDD-EEEEEEEEEEEE',
      ip: ['127.0.0.1/8'],
      mac: ['ab:cd:12:34:56:78'],
      name: id,
    },
    os: {
      family: 'darwin',
      full: 'Mac OS X(10.16)',
      kernel: '21.3.0',
      name: 'Mac OS X',
      platform: 'darwin',
      version: '10.16',
    },
  },
  policy_id: policy,
  type: 'PERMANENT',
  default_api_key: 'abcdefg',
  default_api_key_id: 'abcd',
  policy_output_permissions_hash: 'somehash',
  updated_at: '2022-03-07T16:35:03Z',
  last_checkin_status: status,
  last_checkin: new Date().toISOString(),
  policy_revision_idx: 1,
  policy_coordinator_idx: 1,
  policy_revision: 1,
  status,
  packages: [],
  ...data,
});
