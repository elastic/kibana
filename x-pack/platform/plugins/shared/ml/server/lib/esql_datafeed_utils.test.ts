/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IScopedClusterClient } from '@kbn/core/server';
import { getIsMlEsqlDatafeedEnabled } from './esql_datafeed_utils';

const createClient = (capabilities: jest.Mock) =>
  ({ asInternalUser: { capabilities } } as unknown as IScopedClusterClient);

describe('getIsMlEsqlDatafeedEnabled', () => {
  it('asks Elasticsearch whether datafeeds support ES|QL queries', async () => {
    const capabilities = jest.fn().mockResolvedValue({ supported: true });

    expect(await getIsMlEsqlDatafeedEnabled(createClient(capabilities))).toBe(true);
    expect(capabilities).toHaveBeenCalledWith({
      method: 'PUT',
      path: '/_ml/datafeeds/{datafeed_id}',
      capabilities: 'ml_datafeed_esql_query',
    });
  });

  it('returns false when the capability is not supported', async () => {
    const capabilities = jest.fn().mockResolvedValue({ supported: false });

    expect(await getIsMlEsqlDatafeedEnabled(createClient(capabilities))).toBe(false);
  });

  it('returns false when the check fails', async () => {
    const capabilities = jest.fn().mockRejectedValue(new Error('unknown capability'));

    expect(await getIsMlEsqlDatafeedEnabled(createClient(capabilities))).toBe(false);
  });
});
