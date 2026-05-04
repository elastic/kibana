/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TaskStatus } from '@kbn/streams-schema';
import { createKiIdentificationCancelTool } from './tool';
import { createMockGetScopedClients, createMockToolContext } from '../../utils/test_helpers';

describe('createKiIdentificationCancelTool', () => {
  const setup = () => {
    const { getScopedClients, taskClient } = createMockGetScopedClients();
    const tool = createKiIdentificationCancelTool({ getScopedClients });
    const context = createMockToolContext();
    return { tool, context, taskClient };
  };

  it('cancels task and returns being_canceled status', async () => {
    const { tool, context, taskClient } = setup();

    const result = await tool.handler({ stream_name: 'logs.nginx' }, context);

    expect(taskClient.cancel).toHaveBeenCalledWith('streams_onboarding_logs.nginx');

    if ('results' in result) {
      expect(result.results[0].type).toBe('other');
      expect(result.results[0].data).toEqual({
        stream_name: 'logs.nginx',
        task_id: 'streams_onboarding_logs.nginx',
        status: TaskStatus.BeingCanceled,
      });
    }
  });

  it('returns error result when cancellation fails', async () => {
    const { tool, context, taskClient } = setup();
    taskClient.cancel.mockRejectedValueOnce(new Error('boom'));

    const result = await tool.handler({ stream_name: 'logs.nginx' }, context);

    if ('results' in result) {
      expect(result.results[0].type).toBe('error');
      const data = result.results[0].data as Record<string, unknown>;
      expect(data.message).toContain('Failed to cancel KI identification background task');
      expect(data.operation).toBe('ki_identification_cancel');
    }
  });
});
