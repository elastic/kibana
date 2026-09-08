/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { classifyTasksForUiamProvisioning } from './classify_task';

describe('classifyTasksForUiamProvisioning', () => {
  it('counts skips and collects convert candidates', () => {
    const tasks = [
      { id: '1', taskType: 'alerting:.index-threshold', apiKey: undefined },
      {
        id: '2',
        taskType: 'alerting:.index-threshold',
        apiKey: 'k2',
        uiamApiKey: 'u',
        userScope: { uiamApiKeyId: 'id' },
      },
      {
        id: '3',
        taskType: 'alerting:.index-threshold',
        apiKey: 'k3',
        uiamApiKey: undefined,
        userScope: { apiKeyId: 'es3', apiKeyCreatedByUser: false },
      },
      {
        id: '3b',
        taskType: 'alerting:.index-threshold',
        apiKey: 'k3b',
        uiamApiKey: undefined,
        userScope: {},
      },
      {
        id: '4',
        taskType: 'alerting:.index-threshold',
        apiKey: 'k4',
        uiamApiKey: undefined,
        userScope: { apiKeyId: 'ukey', apiKeyCreatedByUser: true },
      },
    ];

    const result = classifyTasksForUiamProvisioning(tasks as never);

    expect(result.provisioningStatusForSkippedTasks).toHaveLength(4);
    expect(result.provisioningStatusForSkippedTasks.map((d) => d.attributes.message)).toEqual([
      'The task has no API key',
      'The task already has a UIAM API key',
      'The task has no userScope or apiKeyId is empty; cannot run UIAM bulk merge',
      'The API key was created by the user',
    ]);
    expect(result.apiKeysToConvert).toEqual([
      {
        taskId: '3',
        attributes: {
          apiKey: 'k3',
          taskType: 'alerting:.index-threshold',
          userScope: { apiKeyId: 'es3', apiKeyCreatedByUser: false },
        },
        version: undefined,
      },
    ]);
  });

  it('carries userScope, apiKey, taskType, and version on each convert payload', () => {
    const tasks = Array.from({ length: 10 }, (_, i) => ({
      id: String(i),
      taskType: `task_type_${i}`,
      apiKey: `k${i}`,
      uiamApiKey: undefined,
      userScope: { apiKeyId: `es${i}`, apiKeyCreatedByUser: false },
      version: i % 2 === 0 ? `v${i}` : undefined,
    }));

    const result = classifyTasksForUiamProvisioning(tasks as never);
    expect(result.apiKeysToConvert).toHaveLength(10);
    for (const [i, a] of result.apiKeysToConvert.entries()) {
      expect(a.taskId).toBe(String(i));
      expect(a.attributes.apiKey).toBe(`k${i}`);
      expect(a.attributes.taskType).toBe(`task_type_${i}`);
      expect(a.attributes.userScope).toEqual({ apiKeyId: `es${i}`, apiKeyCreatedByUser: false });
      expect(a.version).toBe(i % 2 === 0 ? `v${i}` : undefined);
    }
  });
});
