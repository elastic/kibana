/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { INVESTIGATION_PROGRESS_UI_EVENT } from '@kbn/significant-events-schema';
import { createMockToolContext, invokeHandler } from '../../../agent_builder/utils/test_helpers';
import {
  createInvestigationProgressReportTool,
  SIGNIFICANT_EVENTS_INVESTIGATION_PROGRESS_REPORT_TOOL_ID,
} from './tool';

describe('investigation_progress_report tool', () => {
  it('uses the expected tool id', () => {
    const tool = createInvestigationProgressReportTool();

    expect(tool.id).toBe(SIGNIFICANT_EVENTS_INVESTIGATION_PROGRESS_REPORT_TOOL_ID);
  });

  it('emits a tool_ui event with the full reported state and acknowledges', async () => {
    const tool = createInvestigationProgressReportTool();
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
