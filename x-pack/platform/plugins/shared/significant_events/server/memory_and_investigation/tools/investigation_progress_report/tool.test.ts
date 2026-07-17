/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import type { StreamsServer } from '@kbn/streams-plugin/server/types';
import { INVESTIGATION_PROGRESS_UI_EVENT } from '@kbn/significant-events-schema';
import { createMockToolContext, invokeHandler } from '../../../agent_builder/utils/test_helpers';
import { assertSignificantEventsAccess } from '../../../routes/utils/assert_significant_events_access';
import {
  createInvestigationProgressReportTool,
  SIGNIFICANT_EVENTS_INVESTIGATION_PROGRESS_REPORT_TOOL_ID,
} from './tool';

jest.mock('../../../routes/utils/assert_significant_events_access', () => ({
  assertSignificantEventsAccess: jest.fn(),
}));

const createTool = () =>
  createInvestigationProgressReportTool({
    server: {} as unknown as StreamsServer,
    logger: loggerMock.create(),
  });

describe('investigation_progress_report tool', () => {
  it('uses the expected tool id', () => {
    const tool = createTool();

    expect(tool.id).toBe(SIGNIFICANT_EVENTS_INVESTIGATION_PROGRESS_REPORT_TOOL_ID);
  });

  it('availability returns available when access check succeeds', async () => {
    (assertSignificantEventsAccess as jest.Mock).mockResolvedValueOnce(undefined);

    const tool = createTool();
    const result = await tool.availability!.handler({} as never);

    expect(result).toEqual({ status: 'available' });
  });

  it('availability returns unavailable when access check throws', async () => {
    (assertSignificantEventsAccess as jest.Mock).mockRejectedValueOnce(new Error('nope'));

    const tool = createTool();
    const result = await tool.availability!.handler({} as never);

    expect(result.status).toBe('unavailable');
  });

  it('emits a tool_ui event with the full reported state and acknowledges', async () => {
    const tool = createTool();
    const context = createMockToolContext();

    const state = {
      summary: 'Latency spike correlates with a deploy at 14:02.',
      hypotheses: [
        {
          candidate: 'Disk saturation',
          confidence: 0.1,
          status: 'dismissed' as const,
          reason: 'IOPS stayed flat throughout.',
        },
        {
          candidate: 'Connection pool exhaustion after the 14:02 deploy',
          confidence: 0.6,
          status: 'investigating' as const,
        },
      ],
    };

    const result = await invokeHandler(tool as never, state, context);

    expect(context.events.sendUiEvent).toHaveBeenCalledWith(INVESTIGATION_PROGRESS_UI_EVENT, state);
    if ('results' in result) {
      expect(result.results[0].data).toEqual({ acknowledged: true });
    } else {
      throw new Error('Expected a standard tool result');
    }
  });
});
