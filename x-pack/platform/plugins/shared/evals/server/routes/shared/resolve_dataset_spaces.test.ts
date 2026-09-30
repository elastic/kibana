/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import { DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';
import { ALL_SPACES_ID, UNKNOWN_SPACE } from '@kbn/spaces-plugin/common/constants';
import { redactSpaceIds, resolveTargetSpaces, withoutSpaceIds } from './resolve_dataset_spaces';

const request = {} as KibanaRequest;

const resolve = ({
  requestedSpaceIds,
  currentSpaceIds,
  activeSpaceId = DEFAULT_SPACE_ID,
  accessibleSpaceIds = [DEFAULT_SPACE_ID, 'marketing', 'sales'],
  authorized = true,
}: {
  requestedSpaceIds: string[] | undefined;
  currentSpaceIds?: string[];
  activeSpaceId?: string;
  accessibleSpaceIds?: string[];
  authorized?: boolean;
}) => {
  const checkManageEvalsPrivileges = jest.fn().mockResolvedValue(authorized);

  return {
    checkManageEvalsPrivileges,
    result: resolveTargetSpaces({
      request,
      activeSpaceId,
      requestedSpaceIds,
      currentSpaceIds,
      getAccessibleSpaceIds: jest.fn().mockResolvedValue(accessibleSpaceIds),
      checkManageEvalsPrivileges,
    }),
  };
};

describe('resolveTargetSpaces', () => {
  it('defaults to the active space when the caller names none', async () => {
    const { result, checkManageEvalsPrivileges } = resolve({
      requestedSpaceIds: undefined,
      activeSpaceId: 'marketing',
    });

    await expect(result).resolves.toEqual({ authorized: true, spaceIds: ['marketing'] });
    expect(checkManageEvalsPrivileges).not.toHaveBeenCalled();
  });

  it('rejects a space that does not exist', async () => {
    const { result } = resolve({ requestedSpaceIds: ['sales', 'typo'] });

    await expect(result).resolves.toEqual({
      authorized: false,
      statusCode: 400,
      message: 'Unknown space id(s): typo.',
    });
  });

  it('rejects an unauthorized space before it reaches storage', async () => {
    const { result } = resolve({ requestedSpaceIds: ['sales'], authorized: false });

    await expect(result).resolves.toEqual({
      authorized: false,
      statusCode: 403,
      message: 'Insufficient privileges to assign a dataset to sales.',
    });
  });

  it('counts rather than names the spaces a refused removal would disclose', async () => {
    // The read redacted `finance` to `?`, so an error naming it would hand back
    // the id the redaction withheld.
    const { result } = resolve({
      requestedSpaceIds: [DEFAULT_SPACE_ID],
      currentSpaceIds: [DEFAULT_SPACE_ID, 'finance'],
      accessibleSpaceIds: [DEFAULT_SPACE_ID],
      authorized: false,
    });

    await expect(result).resolves.toEqual({
      authorized: false,
      statusCode: 403,
      message:
        'Insufficient privileges to remove a dataset from 1 space you do not have access to.',
    });
  });

  it('names a space the caller can see when a removal is refused', async () => {
    const { result } = resolve({
      requestedSpaceIds: [DEFAULT_SPACE_ID],
      currentSpaceIds: [DEFAULT_SPACE_ID, 'sales'],
      authorized: false,
    });

    await expect(result).resolves.toEqual({
      authorized: false,
      statusCode: 403,
      message: 'Insufficient privileges to remove a dataset from sales.',
    });
  });

  it('refuses the spaces wildcard, alone or among named spaces', async () => {
    // Assignments name their spaces; `*` would be stored as if a space were
    // called that, and read back as one nothing can be filtered by.
    await expect(resolve({ requestedSpaceIds: [ALL_SPACES_ID] }).result).resolves.toMatchObject({
      authorized: false,
      statusCode: 400,
    });

    await expect(
      resolve({ requestedSpaceIds: [ALL_SPACES_ID, 'sales'] }).result
    ).resolves.toMatchObject({ authorized: false, statusCode: 400 });
  });

  it('reads the redaction placeholder back as the spaces the caller cannot see', async () => {
    const { result, checkManageEvalsPrivileges } = resolve({
      requestedSpaceIds: [DEFAULT_SPACE_ID, 'sales', UNKNOWN_SPACE],
      currentSpaceIds: [DEFAULT_SPACE_ID, 'finance', 'legal'],
    });

    await expect(result).resolves.toEqual({
      authorized: true,
      spaceIds: [DEFAULT_SPACE_ID, 'sales', 'finance', 'legal'],
    });
    // The hidden spaces stay assigned, so only the added one needs authorizing.
    expect(checkManageEvalsPrivileges).toHaveBeenCalledWith(request, ['sales']);
  });

  it('refuses the redaction placeholder when it stands for nothing', async () => {
    const { result } = resolve({
      requestedSpaceIds: ['sales', UNKNOWN_SPACE],
      currentSpaceIds: [DEFAULT_SPACE_ID],
    });

    await expect(result).resolves.toMatchObject({ authorized: false, statusCode: 400 });
  });

  it('only authorizes the spaces a reassignment adds or removes', async () => {
    const { result, checkManageEvalsPrivileges } = resolve({
      requestedSpaceIds: [DEFAULT_SPACE_ID, 'sales'],
      currentSpaceIds: [DEFAULT_SPACE_ID, 'marketing'],
    });

    await expect(result).resolves.toEqual({
      authorized: true,
      spaceIds: [DEFAULT_SPACE_ID, 'sales'],
    });
    // `default` is on both sides of the edit, so it is neither granted nor
    // revoked; re-checking it would block a harmless rename.
    expect(checkManageEvalsPrivileges).toHaveBeenCalledWith(request, ['sales', 'marketing']);
  });

  it('accepts a space already on the dataset even if it has since disappeared', async () => {
    const { result } = resolve({
      requestedSpaceIds: [DEFAULT_SPACE_ID, 'deleted-space'],
      currentSpaceIds: [DEFAULT_SPACE_ID, 'deleted-space'],
      accessibleSpaceIds: [DEFAULT_SPACE_ID],
    });

    await expect(result).resolves.toMatchObject({ authorized: true });
  });

  it('fails closed when the space list cannot be read', async () => {
    await expect(
      resolveTargetSpaces({
        request,
        activeSpaceId: DEFAULT_SPACE_ID,
        requestedSpaceIds: ['sales'],
        getAccessibleSpaceIds: undefined,
        checkManageEvalsPrivileges: jest.fn().mockResolvedValue(true),
      })
    ).resolves.toMatchObject({ authorized: false, statusCode: 400 });
  });
});

describe('redactSpaceIds', () => {
  it('replaces each space the caller cannot see with a placeholder', () => {
    expect(redactSpaceIds(['sales', 'finance', 'legal'], [DEFAULT_SPACE_ID, 'sales'])).toEqual([
      'sales',
      UNKNOWN_SPACE,
      UNKNOWN_SPACE,
    ]);
  });

  it('leaves the assignment alone when accessibility is unknown', () => {
    expect(redactSpaceIds(['finance'], undefined)).toEqual(['finance']);
    expect(redactSpaceIds(undefined, ['sales'])).toBeUndefined();
  });
});

describe('withoutSpaceIds', () => {
  it('drops the assignment from a payload bound for another deployment', () => {
    expect(withoutSpaceIds({ name: 'ds', space_ids: ['sales'] })).toEqual({ name: 'ds' });
  });
});
