/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getIsMlEsqlDatafeedEnabled } from './esql_datafeed_utils';
import type { IScopedClusterClient } from '@kbn/core/server';

function mockClient(impl: () => Promise<{ supported: boolean }>) {
  return { asInternalUser: { capabilities: jest.fn().mockImplementation(impl) } };
}

describe('getIsMlEsqlDatafeedEnabled', () => {
  it('returns true when capabilities.supported is true', async () => {
    const client = mockClient(async () => ({ supported: true }));
    await expect(
      getIsMlEsqlDatafeedEnabled(client as unknown as IScopedClusterClient)
    ).resolves.toBe(true);
    expect(client.asInternalUser.capabilities).toHaveBeenCalledWith({
      method: 'PUT',
      path: '/_ml/datafeeds/{datafeed_id}',
      capabilities: 'ml_datafeed_esql_query',
    });
  });

  it('returns false when supported is false', async () => {
    const client = mockClient(async () => ({ supported: false }));
    await expect(
      getIsMlEsqlDatafeedEnabled(client as unknown as IScopedClusterClient)
    ).resolves.toBe(false);
  });

  it('returns false when capabilities throws', async () => {
    const client = {
      asInternalUser: { capabilities: jest.fn().mockRejectedValue(new Error('nope')) },
    };
    await expect(
      getIsMlEsqlDatafeedEnabled(client as unknown as IScopedClusterClient)
    ).resolves.toBe(false);
  });
});
