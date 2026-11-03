/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { serializeRunCommandRequest } from './grpc_client';

const baseRequest = {
  command: 'ls',
  env: {},
  directory: '',
  timeout_seconds: 0,
  task_group_id: '',
  secret_env_keys: [],
};

describe('serializeRunCommandRequest', () => {
  it('omits secret_env_keys when none are given', () => {
    // field 1 (command) = "ls"
    expect(serializeRunCommandRequest(baseRequest)).toEqual(Buffer.from('0a026c73', 'hex'));
  });

  it('encodes each secret env key as a repeated SecretEnvKey message in field 6', () => {
    const buffer = serializeRunCommandRequest({
      ...baseRequest,
      secret_env_keys: [
        { key: 'K', allowed_hosts: ['a.b', 'c.d'] },
        { key: 'L', allowed_hosts: [] },
      ],
    });

    expect(buffer).toEqual(
      Buffer.concat([
        // field 1 (command) = "ls"
        Buffer.from('0a026c73', 'hex'),
        // field 6, length 13: key = "K", allowed_hosts = "a.b", allowed_hosts = "c.d"
        Buffer.from('320d0a014b1203612e621203632e64', 'hex'),
        // field 6, length 3: key = "L"
        Buffer.from('32030a014c', 'hex'),
      ])
    );
  });
});
