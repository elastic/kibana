/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { sendRequestForRq } from './use_request';
import { sendGetAllCloudOnboardingDeployments } from './cloud_onboarding_deployment';

jest.mock('./use_request');

const mockSendRequest = sendRequestForRq as jest.Mock;

const makeItems = (from: number, count: number) =>
  Array.from({ length: count }, (_, i) => ({ id: `d${from + i}` }));

describe('sendGetAllCloudOnboardingDeployments', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('fetches every page until all deployments are loaded', async () => {
    mockSendRequest
      .mockResolvedValueOnce({ items: makeItems(0, 100), total: 250, page: 1, perPage: 100 })
      .mockResolvedValueOnce({ items: makeItems(100, 100), total: 250, page: 2, perPage: 100 })
      .mockResolvedValueOnce({ items: makeItems(200, 50), total: 250, page: 3, perPage: 100 });

    const items = await sendGetAllCloudOnboardingDeployments({ provider: 'aws' });

    expect(items).toHaveLength(250);
    expect(mockSendRequest.mock.calls.map(([req]) => req.query)).toEqual([
      { provider: 'aws', page: 1, perPage: 100 },
      { provider: 'aws', page: 2, perPage: 100 },
      { provider: 'aws', page: 3, perPage: 100 },
    ]);
  });

  it('makes a single request when everything fits in one page', async () => {
    mockSendRequest.mockResolvedValueOnce({
      items: makeItems(0, 3),
      total: 3,
      page: 1,
      perPage: 100,
    });

    expect(await sendGetAllCloudOnboardingDeployments()).toHaveLength(3);
    expect(mockSendRequest).toHaveBeenCalledTimes(1);
  });

  it('stops when a page comes back empty even if the total says there is more', async () => {
    mockSendRequest
      .mockResolvedValueOnce({ items: makeItems(0, 100), total: 500, page: 1, perPage: 100 })
      .mockResolvedValueOnce({ items: [], total: 500, page: 2, perPage: 100 });

    expect(await sendGetAllCloudOnboardingDeployments()).toHaveLength(100);
    expect(mockSendRequest).toHaveBeenCalledTimes(2);
  });

  it('propagates a failed request', async () => {
    mockSendRequest.mockRejectedValueOnce(new Error('boom'));

    await expect(sendGetAllCloudOnboardingDeployments()).rejects.toThrow('boom');
  });
});
