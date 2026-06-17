/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createAnonymizationReplacementsClient } from './client';

describe('createAnonymizationReplacementsClient', () => {
  it('fetches replacements by id', async () => {
    const fetch = jest.fn().mockResolvedValue({
      id: 'rep-1',
      namespace: 'default',
      replacements: [{ anonymized: 'EMAIL_1', original: 'user@example.com' }],
    });
    const client = createAnonymizationReplacementsClient({ fetch });

    const response = await client.getReplacements('rep 1');

    expect(fetch).toHaveBeenCalledWith(
      '/internal/inference/anonymization/replacements/rep%201',
      expect.objectContaining({ method: 'GET', version: '1' })
    );
    expect(response.id).toBe('rep-1');
  });

  it('deanonymizes text using replacements id', async () => {
    const fetch = jest.fn().mockResolvedValue({ text: 'hello user@example.com' });
    const client = createAnonymizationReplacementsClient({ fetch });

    const response = await client.deanonymizeText({
      text: 'hello EMAIL_1',
      replacementsId: 'rep-1',
    });

    expect(fetch).toHaveBeenCalledWith(
      '/internal/inference/anonymization/replacements/_deanonymize',
      expect.objectContaining({
        method: 'POST',
        version: '1',
        body: JSON.stringify({ text: 'hello EMAIL_1', replacementsId: 'rep-1' }),
      })
    );
    expect(response.text).toBe('hello user@example.com');
  });

  it('maps replacements response into token map', async () => {
    const fetch = jest.fn().mockResolvedValue({
      id: 'rep-1',
      namespace: 'default',
      replacements: [
        { anonymized: 'EMAIL_1', original: 'user@example.com' },
        { anonymized: 'IP_2', original: '10.0.0.1' },
      ],
    });
    const client = createAnonymizationReplacementsClient({ fetch });

    const tokenMap = await client.getTokenToOriginalMap('rep-1');

    expect(tokenMap).toEqual({
      EMAIL_1: 'user@example.com',
      IP_2: '10.0.0.1',
    });
  });

  it('maps known API errors', async () => {
    const fetch = jest.fn().mockRejectedValue({ statusCode: 404, body: { message: 'missing' } });
    const client = createAnonymizationReplacementsClient({ fetch });

    await expect(client.getReplacements('missing')).rejects.toMatchObject({
      kind: 'not_found',
      message: 'missing',
    });
  });
});
