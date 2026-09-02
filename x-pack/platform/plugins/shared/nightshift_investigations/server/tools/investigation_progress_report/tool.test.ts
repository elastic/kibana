/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggerMock } from '@kbn/logging-mocks';
import { agentBuilderMocks } from '@kbn/agent-builder-plugin/server/mocks';
import { INVESTIGATION_PROGRESS_UI_EVENT } from '@kbn/significant-events-schema';
import {
  createInvestigationProgressReportTool,
  SIGNIFICANT_EVENTS_INVESTIGATION_PROGRESS_REPORT_TOOL_ID,
} from './tool';

const createTool = () =>
  createInvestigationProgressReportTool({
    logger: loggerMock.create(),
  });

describe('investigation_progress_report tool', () => {
  it('uses the expected tool id', () => {
    const tool = createTool();

    expect(tool.id).toBe(SIGNIFICANT_EVENTS_INVESTIGATION_PROGRESS_REPORT_TOOL_ID);
  });

  it('is not gated by an availability check', () => {
    const tool = createTool();

    expect(tool.availability).toBeUndefined();
  });

  it('emits a tool_ui event with the full reported state and acknowledges', async () => {
    const tool = createTool();
    const context = agentBuilderMocks.tools.createHandlerContext();

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

    const result = await tool.handler(state, context);

    expect(context.events.sendUiEvent).toHaveBeenCalledWith(INVESTIGATION_PROGRESS_UI_EVENT, state);
    if ('results' in result) {
      expect(result.results[0].data).toEqual({ acknowledged: true });
    } else {
      throw new Error('Expected a standard tool result');
    }
  });
});
