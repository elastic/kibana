/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

jest.mock('@kbn/fleet-plugin/public', () => ({
  sendGetAgentlessPolicy: jest.fn(),
  sendGetOnePackagePolicy: jest.fn(),
}));

import { renderHook, waitFor } from '@testing-library/react';
import { sendGetAgentlessPolicy, sendGetOnePackagePolicy } from '@kbn/fleet-plugin/public';

import {
  detectSecretRefs,
  fetchAgentlessSecretRefs,
  filterSecretRefsForMethod,
  withoutCoveredCredentials,
  fetchPackagePolicySecretRefs,
  useExistingSecretRefs,
} from './secret_refs';
import type { ExistingSecretRefs } from './secret_refs';

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

describe('useExistingSecretRefs', () => {
  const refsOf = (id: string): ExistingSecretRefs =>
    new Map([['secret_access_key', { isSecretRef: true as const, id }]]);

  it('does nothing and is not loading without a policy id', () => {
    const fetchRefs = jest.fn();
    const { result } = renderHook(() => useExistingSecretRefs(undefined, fetchRefs));
    expect(fetchRefs).not.toHaveBeenCalled();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.existingSecretRefs.size).toBe(0);
  });

  it('is loading until the fetch settles, then returns the refs', async () => {
    const fetchRefs = jest.fn().mockResolvedValue(refsOf('r1'));
    const { result } = renderHook(() => useExistingSecretRefs('p1', fetchRefs));
    expect(result.current.isLoading).toBe(true);
    expect(result.current.existingSecretRefs.size).toBe(0);
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.existingSecretRefs.get('secret_access_key')?.id).toBe('r1');
    expect(fetchRefs).toHaveBeenCalledWith('p1');
  });

  it('is loading again when the policy id changes and does not expose the previous refs', async () => {
    const fetchRefs = jest.fn(async (id?: string) => refsOf(`ref-${id}`));
    const { result, rerender } = renderHook(
      ({ policyId }) => useExistingSecretRefs(policyId, fetchRefs),
      { initialProps: { policyId: 'p1' } }
    );
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    rerender({ policyId: 'p2' });
    expect(result.current.isLoading).toBe(true);
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.existingSecretRefs.get('secret_access_key')?.id).toBe('ref-p2');
  });

  it('ignores a slow result for a policy id that is no longer current', async () => {
    let resolveFirst: (refs: ExistingSecretRefs) => void = () => {};
    const fetchRefs = jest.fn((id?: string) =>
      id === 'p1'
        ? new Promise<ExistingSecretRefs>((resolve) => {
            resolveFirst = resolve;
          })
        : Promise.resolve(refsOf('ref-p2'))
    );
    const { result, rerender } = renderHook(
      ({ policyId }) => useExistingSecretRefs(policyId, fetchRefs),
      { initialProps: { policyId: 'p1' } }
    );
    rerender({ policyId: 'p2' });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    resolveFirst(refsOf('ref-p1'));
    await Promise.resolve();
    expect(result.current.existingSecretRefs.get('secret_access_key')?.id).toBe('ref-p2');
  });
});

describe('fetching secret refs', () => {
  const REF = { isSecretRef: true, id: 'r1' };

  beforeEach(() => jest.clearAllMocks());

  it('returns no refs without a policy id and does not call Fleet', async () => {
    expect((await fetchAgentlessSecretRefs(undefined)).size).toBe(0);
    expect((await fetchPackagePolicySecretRefs(undefined)).size).toBe(0);
    expect(sendGetAgentlessPolicy).not.toHaveBeenCalled();
    expect(sendGetOnePackagePolicy).not.toHaveBeenCalled();
  });

  it('reads refs from an agentless policy', async () => {
    (sendGetAgentlessPolicy as jest.Mock).mockResolvedValue({
      item: { vars: { access_key_id: REF } },
    });
    expect((await fetchAgentlessSecretRefs('p1')).get('access_key_id')).toEqual(REF);
  });

  it('reads refs from a package policy', async () => {
    (sendGetOnePackagePolicy as jest.Mock).mockResolvedValue({
      data: { item: { vars: { access_key_id: { value: REF } } } },
    });
    expect((await fetchPackagePolicySecretRefs('p1')).get('access_key_id')).toEqual(REF);
  });

  it('treats a failed lookup as nothing stored', async () => {
    (sendGetAgentlessPolicy as jest.Mock).mockRejectedValue(new Error('boom'));
    (sendGetOnePackagePolicy as jest.Mock).mockRejectedValue(new Error('boom'));
    expect((await fetchAgentlessSecretRefs('p1')).size).toBe(0);
    expect((await fetchPackagePolicySecretRefs('p1')).size).toBe(0);
  });
});

describe('filterSecretRefsForMethod', () => {
  const refs: ExistingSecretRefs = new Map([
    ['secret_access_key', { isSecretRef: true as const, id: 'r1' }],
    ['session_token', { isSecretRef: true as const, id: 'r2' }],
  ]);

  it('drops the session token for static keys', () => {
    expect([...filterSecretRefsForMethod(refs, 'static_keys').keys()]).toEqual([
      'secret_access_key',
    ]);
  });

  it('keeps every ref for temporary keys', () => {
    expect(filterSecretRefsForMethod(refs, 'temporary_keys')).toBe(refs);
  });
});

describe('withoutCoveredCredentials', () => {
  const refs: ExistingSecretRefs = new Map([
    ['secret_access_key', { isSecretRef: true as const, id: 'r1' }],
  ]);

  it('blanks the credentials a ref covers and keeps the others', () => {
    expect(
      withoutCoveredCredentials({ access_key_id: 'AKID', secret_access_key: 'SECRET' }, refs)
    ).toStrictEqual({ access_key_id: 'AKID', secret_access_key: '' });
  });

  it('leaves everything alone when no ref applies and does not mutate its input', () => {
    const input = { access_key_id: 'AKID', secret_access_key: 'SECRET' };
    expect(withoutCoveredCredentials(input, new Map())).toStrictEqual(input);
    withoutCoveredCredentials(input, refs);
    expect(input.secret_access_key).toBe('SECRET');
  });

  it('ignores fields the credentials object does not have', () => {
    const tokenRefs: ExistingSecretRefs = new Map([
      ['session_token', { isSecretRef: true as const, id: 'r2' }],
    ]);
    expect(withoutCoveredCredentials({ access_key_id: 'AKID' }, tokenRefs)).toStrictEqual({
      access_key_id: 'AKID',
    });
  });
});

describe('useExistingSecretRefs failure handling', () => {
  it('stops loading and reports nothing stored when the lookup rejects', async () => {
    const fetchRefs = jest.fn().mockRejectedValue(new Error('boom'));
    const { result } = renderHook(() => useExistingSecretRefs('p1', fetchRefs));
    expect(result.current.isLoading).toBe(true);
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.existingSecretRefs.size).toBe(0);
  });
});
