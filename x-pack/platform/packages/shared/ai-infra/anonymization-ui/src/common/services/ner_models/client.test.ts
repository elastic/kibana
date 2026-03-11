/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createNerModelsClient } from './client';

describe('createNerModelsClient', () => {
  it('fetches trained model stats with encoded model id', async () => {
    const fetch = jest.fn().mockResolvedValue({ trained_model_stats: [] });
    const client = createNerModelsClient({ fetch });

    await client.getTrainedModelStats('my model/1');

    expect(fetch).toHaveBeenCalledWith('/_ml/trained_models/my%20model%2F1/_stats', {
      method: 'GET',
    });
  });
});
