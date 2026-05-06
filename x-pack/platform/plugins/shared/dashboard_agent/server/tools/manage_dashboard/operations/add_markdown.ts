/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import { MARKDOWN_EMBEDDABLE_TYPE } from '@kbn/dashboard-markdown/server';
import { panelGridSchema } from '@kbn/dashboard-agent-common';
import { z } from '@kbn/zod/v4';
import { appendPanelsToDashboard } from '../dashboard_state';
import { defineOperation } from './types';

export const addMarkdownOperation = defineOperation({
  schema: z.object({
    operation: z.literal('add_markdown'),
    markdownContent: z.string().describe('Markdown content for the panel.'),
    grid: panelGridSchema.describe(
      'Panel layout in grid units. w: width (1–48), h: height, x: column (0–47), y: row.'
    ),
    sectionId: z
      .string()
      .optional()
      .describe(
        'ID of an existing section to add this panel into. The section must already exist (use add_section first). If omitted, panel is added at the top level.'
      ),
  }),
  handler: ({ dashboardData, operation }) => {
    const markdownPanel = {
      type: MARKDOWN_EMBEDDABLE_TYPE,
      config: { content: operation.markdownContent },
      grid: operation.grid,
      id: uuidv4(),
    };

    return appendPanelsToDashboard({
      dashboardData,
      panelsToAdd: [markdownPanel],
      sectionId: operation.sectionId,
    });
  },
});
