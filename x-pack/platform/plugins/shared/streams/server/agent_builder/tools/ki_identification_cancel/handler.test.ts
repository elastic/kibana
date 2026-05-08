/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TaskStatus } from '@kbn/streams-schema';
import { cancelKiIdentificationToolHandler } from './handler';

describe('cancelKiIdentificationToolHandler', () => {
  it('cancels task and returns cancel acknowledgement payload', async () => {
    const taskClient = {
      cancel: jest.fn().mockResolvedValue(undefined),
    };

    const result = await cancelKiIdentificationToolHandler({
      stream_name: 'logs.nginx',
      task_client: taskClient as never,
    });

    expect(taskClient.cancel).toHaveBeenCalledWith('streams_onboarding_logs.nginx');
    expect(result).toEqual({
      stream_name: 'logs.nginx',
      task_id: 'streams_onboarding_logs.nginx',
      status: TaskStatus.BeingCanceled,
    });
  });
});
