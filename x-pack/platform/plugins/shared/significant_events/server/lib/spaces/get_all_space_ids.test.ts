/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import { brandSpaceId, DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';
import type { SpacesServiceStart } from '@kbn/spaces-plugin/server';
import { getAllSpaceIds } from './get_all_space_ids';

const request = {} as KibanaRequest;

const makeSpacesService = (getAll: jest.Mock) =>
  ({ createSpacesClient: jest.fn().mockReturnValue({ getAll }) } as unknown as SpacesServiceStart);

describe('getAllSpaceIds', () => {
  it('returns the default space plus every space the caller can see, deduped', async () => {
    const getAll = jest
      .fn()
      .mockResolvedValue([{ id: brandSpaceId('marketing') }, { id: DEFAULT_SPACE_ID }]);

    const result = await getAllSpaceIds({ request, spacesService: makeSpacesService(getAll) });

    expect(result).toEqual({ spaceIds: [DEFAULT_SPACE_ID, brandSpaceId('marketing')] });
  });

  it('falls back to the default space and reports it when spaces are unavailable', async () => {
    const result = await getAllSpaceIds({ request, spacesService: undefined });

    expect(result.spaceIds).toEqual([DEFAULT_SPACE_ID]);
    expect(result.failure).toEqual({
      target: 'spaces',
      error: expect.stringContaining('Spaces client is not available'),
    });
  });

  it('falls back to the default space and reports the lookup error', async () => {
    const getAll = jest.fn().mockRejectedValue(new Error('boom'));

    const result = await getAllSpaceIds({ request, spacesService: makeSpacesService(getAll) });

    expect(result.spaceIds).toEqual([DEFAULT_SPACE_ID]);
    expect(result.failure).toEqual({
      target: 'spaces',
      error: expect.stringContaining('boom'),
    });
  });
});
