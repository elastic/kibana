/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TaskStatus } from '@kbn/streams-schema';
import { createKiIdentificationStatusTool } from './tool';
import { createMockGetScopedClients, createMockToolContext } from '../test_helpers';

describe('createKiIdentificationStatusTool', () => {
  const setup = () => {
    const { getScopedClients, taskClient } = createMockGetScopedClients();
    const tool = createKiIdentificationStatusTool({ getScopedClients });
    const context = createMockToolContext();
    return { tool, context, taskClient };
  };

  it('returns onboarding status for stream', async () => {
    const { tool, context, taskClient } = setup();
    taskClient.getStatus.mockResolvedValueOnce({
      status: TaskStatus.Completed,
      queriesTaskResult: {
        status: TaskStatus.Completed,
        queries: [],
      },
    });

    const result = await tool.handler({ stream_name: 'logs.nginx' }, context);

    expect(taskClient.getStatus).toHaveBeenCalledWith('streams_onboarding_logs.nginx');

    if ('results' in result) {
      expect(result.results[0].type).toBe('other');
      expect(result.results[0].data).toEqual(
        expect.objectContaining({
          stream_name: 'logs.nginx',
          task_id: 'streams_onboarding_logs.nginx',
          status: TaskStatus.Completed,
          queriesTaskResult: {
            status: TaskStatus.Completed,
            queries: [],
          },
        })
      );
    }
  });

  it('uses save_queries to resolve task id', async () => {
    const { tool, context, taskClient } = setup();

    await tool.handler(
      {
        stream_name: 'logs.nginx',
        save_queries: false,
      },
      context
    );

    expect(taskClient.getStatus).toHaveBeenCalledWith(
      'streams_onboarding_logs.nginx_no_save_queries'
    );
  });

  it('returns error result when status retrieval fails', async () => {
    const { tool, context, taskClient } = setup();
    taskClient.getStatus.mockRejectedValueOnce(new Error('boom'));

    const result = await tool.handler({ stream_name: 'logs.nginx' }, context);

    if ('results' in result) {
      expect(result.results[0].type).toBe('error');
      const data = result.results[0].data as Record<string, unknown>;
      expect(data.message).toContain('Failed to get KI identification onboarding status');
      expect(data.operation).toBe('ki_identification_status');
    }
  });
});
