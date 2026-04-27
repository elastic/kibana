/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TaskStatus } from '@kbn/streams-schema';
import { getKiIdentificationStatusToolHandler } from './handler';

describe('getKiIdentificationStatusToolHandler', () => {
  it('returns task status payload with stream and task identifiers', async () => {
    const taskClient = {
      getStatus: jest.fn().mockResolvedValue({ status: TaskStatus.Completed }),
    };

    const result = await getKiIdentificationStatusToolHandler({
      streamName: 'logs.nginx',
      taskClient: taskClient as never,
    });

    expect(taskClient.getStatus).toHaveBeenCalledWith('streams_onboarding_logs.nginx');
    expect(result).toEqual({
      stream_name: 'logs.nginx',
      task_id: 'streams_onboarding_logs.nginx',
      status: TaskStatus.Completed,
    });
  });
});
