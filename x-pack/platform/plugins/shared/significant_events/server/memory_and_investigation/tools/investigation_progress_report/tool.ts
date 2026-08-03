/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { platformSignificantEventsTools, ToolType } from '@kbn/agent-builder-common';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server';
import type { Logger } from '@kbn/core/server';
import { i18n } from '@kbn/i18n';
import {
  INVESTIGATION_PROGRESS_UI_EVENT,
  investigationStateSchema,
} from '@kbn/significant-events-schema';
import type { StreamsServer } from '@kbn/streams-plugin/server/types';
import dedent from 'dedent';
import { createSignificantEventsAvailability } from '../../../agent_builder/tools/significant_events_availability';

export const SIGNIFICANT_EVENTS_INVESTIGATION_PROGRESS_REPORT_TOOL_ID =
  platformSignificantEventsTools.reportInvestigationProgress;

const toolDescription = dedent`
  ${i18n.translate(
    'xpack.significantEvents.agentBuilder.tools.investigationProgressReport.description',
    {
      defaultMessage:
        'Report the full current state of the investigation, so the user can see live progress before the investigation finishes. This is a snapshot, not a diff: every call must include every hypothesis considered so far, each with its own confidence and status — not just what changed since the last call.',
    }
  )}

  ${i18n.translate(
    'xpack.significantEvents.agentBuilder.tools.investigationProgressReport.description.rules',
    {
      defaultMessage:
        'Call this whenever a hypothesis is added, its confidence changes, or its status changes (investigating, dismissed, confirmed). Keep "summary" short (one or two sentences) describing what is happening right now. This tool does not end the investigation — keep working after calling it.',
    }
  )}
`;

export const createInvestigationProgressReportTool = ({
  server,
  logger,
}: {
  server: StreamsServer;
  logger: Logger;
}): BuiltinToolDefinition<typeof investigationStateSchema> => ({
  id: SIGNIFICANT_EVENTS_INVESTIGATION_PROGRESS_REPORT_TOOL_ID,
  type: ToolType.builtin,
  description: toolDescription,
  schema: investigationStateSchema,
  tags: ['streams', 'investigation'],
  availability: createSignificantEventsAvailability({ server, logger }),
  handler: async (state, context) => {
    context.events.sendUiEvent(INVESTIGATION_PROGRESS_UI_EVENT, state);

    return {
      results: [
        {
          type: ToolResultType.other,
          data: { acknowledged: true },
        },
      ],
    };
  },
});
