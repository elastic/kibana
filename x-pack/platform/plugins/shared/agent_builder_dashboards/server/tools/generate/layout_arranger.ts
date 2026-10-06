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
} from '@kbn/dashboard-authoring';

/**
 * Arranges dashboard containers with a dedicated model call. Errors propagate to the layout step,
 * which falls back to a deterministic placement.
 */
export const createLayoutArranger =
  ({ modelProvider }: { modelProvider: ModelProvider }): ArrangeDashboardLayout =>
  async (request) => {
    const { chatModel } = await modelProvider.getDefaultModel();
    const { system, user } = buildLayoutPrompt(request);
    return chatModel
      .withStructuredOutput(layoutArrangementSchema, { name: 'arrange_dashboard_layout' })
      .invoke([
        ['system', system],
        ['human', user],
      ]);
  };
