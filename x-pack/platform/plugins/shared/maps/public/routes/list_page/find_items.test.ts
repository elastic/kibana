/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getMapClient } from '../../content_management';
import { findItems } from './find_items';

jest.mock('../../content_management', () => ({
  getMapClient: jest.fn(),
}));

const search = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  search.mockResolvedValue({ hits: [], pagination: { total: 0 } });
  (getMapClient as jest.Mock).mockReturnValue({ search });
});

describe('findItems', () => {
  it('forwards tag references to the server so they apply before the limit', async () => {
    await findItems('', {
      listingLimit: 10,
      references: [{ type: 'tag', id: 'tag-1' }],
      referencesToExclude: [{ type: 'tag', id: 'tag-2' }],
    });

    const [query] = search.mock.calls[0];
    expect(query.tags).toEqual({ included: ['tag-1'], excluded: ['tag-2'] });
  });

  it('leaves tags undefined when no tag filter is active', async () => {
    await findItems('', { listingLimit: 10 });

    const [query] = search.mock.calls[0];
    expect(query.tags).toBeUndefined();
  });

  it('passes the search term and listing limit through', async () => {
    await findItems('roads', { listingLimit: 25 });

    expect(search).toHaveBeenCalledWith(expect.objectContaining({ text: 'roads*', limit: 25 }));
  });

  it('returns an empty result when the search fails', async () => {
    search.mockRejectedValue(new Error('boom'));

    await expect(findItems('', { listingLimit: 10 })).resolves.toEqual({ total: 0, hits: [] });
  });
});
