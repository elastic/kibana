/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ModelProvider } from '@kbn/agent-builder-server';
import {
  buildLayoutPrompt,
  layoutArrangementSchema,
  type ArrangeDashboardLayout,
} from '@kbn/dashboard-agent-authoring';

const LAYOUT_TOOL_NAME = 'arrange_dashboard_layout';

/**
 * Arranges dashboard containers with a dedicated model call. Errors propagate to the layout step,
 * which keeps the current layout.
 */
export const createLayoutArranger =
  ({ modelProvider }: { modelProvider: ModelProvider }): ArrangeDashboardLayout =>
  async (request) => {
    const { chatModel } = await modelProvider.getDefaultModel();
    const { system, user } = buildLayoutPrompt(request);

    const response = await chatModel
      .bindTools(
        [
          {
            name: LAYOUT_TOOL_NAME,
            description: 'Returns the grid of every panel and the row of every section.',
            schema: layoutArrangementSchema,
          },
        ],
        { tool_choice: 'auto' }
      )
      .invoke([
        ['system', system],
        ['human', `${user}\n\nAnswer by calling \`${LAYOUT_TOOL_NAME}\`.`],
      ]);

    const toolCall = response.tool_calls?.find(({ name }) => name === LAYOUT_TOOL_NAME);
    if (!toolCall) {
      throw new Error(`The model did not call ${LAYOUT_TOOL_NAME}`);
    }
    return layoutArrangementSchema.parse(toolCall.args);
  };
