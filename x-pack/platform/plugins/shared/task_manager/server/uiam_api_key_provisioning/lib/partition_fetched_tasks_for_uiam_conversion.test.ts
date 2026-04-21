/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { partitionFetchedTasksForUiamConversion } from './partition_fetched_tasks_for_uiam_conversion';

describe('partitionFetchedTasksForUiamConversion', () => {
  it('counts skips and collects convert candidates', () => {
    const docs = [
      { id: '1', apiKey: undefined },
      { id: '2', apiKey: 'k2', uiamApiKey: 'u', userScope: { uiamApiKeyId: 'id' } },
      { id: '3', apiKey: 'k3', uiamApiKey: undefined, userScope: {} },
    ];

    const result = partitionFetchedTasksForUiamConversion(docs, 500);

    expect(result.skippedInBatch).toBe(2);
    expect(result.skippedTaskDetails).toEqual([
      { taskId: '1', message: 'The task has no API key' },
      { taskId: '2', message: 'The task already has a UIAM API key' },
    ]);
    expect(result.apiKeysToConvert).toEqual([{ taskId: '3', apiKey: 'k3' }]);
    expect(result.tasksById.get('3')).toEqual(docs[2]);
    expect(result.hasMoreToUpdate).toBe(false);
  });

  it('sets hasMoreToUpdate when batch is full', () => {
    const docs = Array.from({ length: 10 }, (_, i) => ({
      id: String(i),
      apiKey: `k${i}`,
      uiamApiKey: undefined,
      userScope: {},
    }));

    const result = partitionFetchedTasksForUiamConversion(docs, 10);
    expect(result.hasMoreToUpdate).toBe(true);
  });
});
