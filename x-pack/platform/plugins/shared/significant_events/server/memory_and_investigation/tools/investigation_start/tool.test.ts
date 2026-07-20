/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SIGNIFICANT_EVENTS_INVESTIGATION_WORKFLOW_ID } from '@kbn/workflows/managed';
import { SignificantEventsPausedError } from '../../../lib/errors/significant_events_paused_error';
import { createInvestigationStartTool } from './tool';

describe('createInvestigationStartTool', () => {
  const request = { headers: {} } as never;

  const setup = ({ state = 'enabled' }: { state?: 'enabled' | 'paused' } = {}) => {
    const maintenanceService = {
      getState: jest.fn().mockResolvedValue(state),
    };
    const executeWorkflow = jest.fn().mockResolvedValue({
      workflowExecutionId: 'exec-1',
      timedOut: false,
      execution: { id: 'exec-1', status: 'completed' },
    });
    const tool = createInvestigationStartTool({
      maintenanceService: maintenanceService as never,
      getWorkflowApi: () => ({ executeWorkflow } as never),
      getSpaceId: () => 'default',
    });
    return { tool, maintenanceService, executeWorkflow };
  };

  it('asserts not paused then executes the investigation workflow', async () => {
    const { tool, maintenanceService, executeWorkflow } = setup();

    const result = await tool.handler(
      {
        message: 'Checkout errors spiked',
        stream_names: ['logs-checkout'],
        waitForCompletion: true,
      },
      { request } as never
    );

    expect(maintenanceService.getState).toHaveBeenCalledWith({ request });
    expect(executeWorkflow).toHaveBeenCalledWith(
      expect.objectContaining({
        workflowId: SIGNIFICANT_EVENTS_INVESTIGATION_WORKFLOW_ID,
        spaceId: 'default',
        request,
        waitForCompletion: true,
        inputs: expect.objectContaining({
          message: 'Checkout errors spiked',
          stream_names: ['logs-checkout'],
        }),
      })
    );
    if ('results' in result) {
      expect(result.results[0].type).toBe('other');
      expect(result.results[0].data).toEqual(
        expect.objectContaining({ workflowExecutionId: 'exec-1' })
      );
    }
  });

  it('returns an error result when paused without starting the workflow', async () => {
    const { tool, executeWorkflow } = setup({ state: 'paused' });

    const result = await tool.handler(
      { message: 'should not run', waitForCompletion: true },
      { request } as never
    );

    expect(executeWorkflow).not.toHaveBeenCalled();
    if ('results' in result) {
      expect(result.results[0].type).toBe('error');
      const data = result.results[0].data as Record<string, unknown>;
      expect(data.message).toContain(new SignificantEventsPausedError().message);
      expect(data.likely_cause).toContain('paused');
    }
  });
});
