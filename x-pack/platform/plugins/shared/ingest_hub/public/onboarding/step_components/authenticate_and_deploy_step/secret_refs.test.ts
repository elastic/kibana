/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { detectSecretRefs } from './secret_refs';

describe('detectSecretRefs', () => {
  it('returns no refs for an undefined policy or one without secrets', () => {
    expect(detectSecretRefs(undefined).size).toBe(0);
    expect(
      detectSecretRefs({ vars: { access_key_id: 'AKID', default_region: 'us-east-1' } }).size
    ).toBe(0);
  });

  it('reads the simplified agentless shape (value is the ref)', () => {
    const refs = detectSecretRefs({
      vars: {
        access_key_id: { isSecretRef: true, id: 'id-1' },
        secret_access_key: { isSecretRef: true, id: 'id-2' },
        default_region: 'us-east-1',
      },
    });
    expect(Object.fromEntries(refs)).toEqual({
      access_key_id: { isSecretRef: true, id: 'id-1' },
      secret_access_key: { isSecretRef: true, id: 'id-2' },
    });
  });

  it('reads the full package policy shape, including input and stream vars', () => {
    const refs = detectSecretRefs({
      vars: { access_key_id: { value: { isSecretRef: true, id: 'pkg-level' } } },
      inputs: [
        {
          vars: { secret_access_key: { value: { isSecretRef: true, id: 'input-level' } } },
          streams: [
            { vars: { session_token: { value: { isSecretRef: true, id: 'stream-level' } } } },
          ],
        },
      ],
    });
    expect(Object.fromEntries(refs)).toEqual({
      access_key_id: { isSecretRef: true, id: 'pkg-level' },
      secret_access_key: { isSecretRef: true, id: 'input-level' },
      session_token: { isSecretRef: true, id: 'stream-level' },
    });
  });

  it('reads inputs and streams keyed by id', () => {
    const refs = detectSecretRefs({
      inputs: {
        'aws-s3': {
          streams: { s: { vars: { secret_access_key: { isSecretRef: true, id: 'x' } } } },
        },
      },
    });
    expect(refs.get('secret_access_key')).toEqual({ isSecretRef: true, id: 'x' });
  });

  it('prefers the package-level ref over a nested one', () => {
    const refs = detectSecretRefs({
      vars: { secret_access_key: { isSecretRef: true, id: 'top' } },
      inputs: [{ vars: { secret_access_key: { value: { isSecretRef: true, id: 'nested' } } } }],
    });
    expect(refs.get('secret_access_key')?.id).toBe('top');
  });

  it('ignores non-credential vars and values that are not refs', () => {
    const refs = detectSecretRefs({
      vars: { other_secret: { isSecretRef: true, id: 'x' }, secret_access_key: { value: '' } },
    });
    expect(refs.size).toBe(0);
  });
});
