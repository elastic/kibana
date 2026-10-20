/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { serializeRunCommandRequest } from './grpc_client';

/** Minimal wire-format reader for single-byte tags and lengths, enough for these fixtures. */
const readLengthDelimitedFields = (buf: Buffer): Array<{ field: number; payload: Buffer }> => {
  const fields: Array<{ field: number; payload: Buffer }> = [];
  let offset = 0;
  while (offset < buf.length) {
    const tag = buf[offset++];
    const wireType = tag % 8;
    const field = (tag - wireType) / 8;
    if (wireType === 1) {
      offset += 8;
      continue;
    }
    const length = buf[offset++];
    fields.push({ field, payload: buf.subarray(offset, offset + length) });
    offset += length;
  }
  return fields;
};

const baseRequest = {
  command: 'echo hi',
  env: {},
  directory: '',
  timeout_seconds: 0,
  task_group_id: '',
};

describe('serializeRunCommandRequest', () => {
  it('omits field 6 when no secret env keys are marked', () => {
    const fields = readLengthDelimitedFields(
      serializeRunCommandRequest({ ...baseRequest, secret_env_keys: [] })
    );
    expect(fields.map(({ field }) => field)).toEqual([1]);
  });

  it('encodes each secret env key as a repeated SecretEnvKey message (field 6)', () => {
    const fields = readLengthDelimitedFields(
      serializeRunCommandRequest({
        ...baseRequest,
        env: { TOKEN: 'secret-value' },
        secret_env_keys: [
          { key: 'TOKEN', allowed_hosts: ['api.github.com', 'uploads.github.com'] },
          { key: 'OTHER', allowed_hosts: ['example.com'] },
        ],
      })
    );

    const secretEnvKeys = fields
      .filter(({ field }) => field === 6)
      .map(({ payload }) => {
        const inner = readLengthDelimitedFields(payload);
        return {
          key: inner.find(({ field }) => field === 1)?.payload.toString('utf8'),
          allowedHosts: inner
            .filter(({ field }) => field === 2)
            .map(({ payload: host }) => host.toString('utf8')),
        };
      });

    expect(secretEnvKeys).toEqual([
      { key: 'TOKEN', allowedHosts: ['api.github.com', 'uploads.github.com'] },
      { key: 'OTHER', allowedHosts: ['example.com'] },
    ]);
  });
});
