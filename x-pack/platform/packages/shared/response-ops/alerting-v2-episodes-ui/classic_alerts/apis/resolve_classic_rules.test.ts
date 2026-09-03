/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServiceMock } from '@kbn/core-http-browser-mocks';
import { resolveClassicRules } from './resolve_classic_rules';

const mockHttp = httpServiceMock.createStartContract();

describe('resolveClassicRules', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns an empty array without calling the API when no ids are provided', async () => {
    await expect(resolveClassicRules({ ids: [], services: { http: mockHttp } })).resolves.toEqual(
      []
    );
    expect(mockHttp.post).not.toHaveBeenCalled();
  });

  it('resolves rules through the classic find API using the saved-object prefixed filter', async () => {
    mockHttp.post.mockResolvedValueOnce({
      data: [{ id: 'classic-rule', name: 'Classic Rule' }],
    });

    const result = await resolveClassicRules({
      ids: ['classic-rule'],
      services: { http: mockHttp },
    });

    expect(mockHttp.post).toHaveBeenCalledWith(
      '/internal/alerting/rules/_find',
      expect.objectContaining({
        body: expect.stringContaining('alert.id: \\"alert:classic-rule\\"'),
      })
    );
    expect(result).toMatchObject([{ id: 'classic-rule', metadata: { name: 'Classic Rule' } }]);
  });

  it('returns an empty array when the classic find API fails', async () => {
    mockHttp.post.mockRejectedValueOnce(new Error('classic unavailable'));

    await expect(
      resolveClassicRules({ ids: ['classic-rule'], services: { http: mockHttp } })
    ).resolves.toEqual([]);
  });
});
