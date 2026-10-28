/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isRecord } from '../../evaluator_utils';

const GENERATE_DASHBOARD_TOOL_ID = 'platform.dashboard.generate_dashboard';
const CREATE_VISUALIZATION_TOOL_ID = 'platform.core.create_visualization';

/**
 * The renderers the agent asked for, from the arguments of its tool calls. Which one it picked is
 * the routing decision, and it is in the request whichever tool stores the panel: a dashboard panel
 * names its renderer (Lens when it names none) and a visualization names it as the target type.
 */
export const getRequestedRenderers = (
  steps: Array<Record<string, unknown>> | undefined
): string[] => {
  const renderers = (steps ?? []).flatMap((step): string[] => {
    if (step.type !== 'tool_call' || !isRecord(step.params)) {
      return [];
    }
    const { params } = step;

    if (step.tool_id === GENERATE_DASHBOARD_TOOL_ID && Array.isArray(params.panels)) {
      return params.panels.flatMap((item: unknown) =>
        isRecord(item) && isRecord(item.content) && item.content.source === 'request'
          ? [typeof item.content.renderer === 'string' ? item.content.renderer : 'lens']
          : []
      );
    }

    if (step.tool_id === CREATE_VISUALIZATION_TOOL_ID && isRecord(params.target)) {
      const { type } = params.target;
      if (type === 'custom_content' || type === 'vega') {
        return [type];
      }
      return typeof type === 'string' && type !== 'attachment' ? ['lens'] : [];
    }

    return [];
  });

  return [...new Set(renderers)];
};
