/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CUSTOM_CONTENT_GENERATE_DASHBOARD_TOOL_ID } from '@kbn/custom-content-common';
import { isRecord } from '../../evaluator_utils';

const CREATE_VISUALIZATION_TOOL_ID = 'platform.core.create_visualization';

const GENERATED_PANEL_TYPES: ReadonlySet<unknown> = new Set(['vis', 'vega', 'custom_content']);

/**
 * The panel types the agent asked for, from the arguments of its tool calls. Which one it picked is
 * the routing decision, and it is in the request whichever tool stores the panel: a dashboard panel
 * names it as its content type (`vis` for Lens) and a visualization as its target type.
 */
export const getRequestedPanelTypes = (
  steps: Array<Record<string, unknown>> | undefined
): string[] => {
  const panelTypes = (steps ?? []).flatMap((step): string[] => {
    if (step.type !== 'tool_call' || !isRecord(step.params)) {
      return [];
    }
    const { params } = step;

    if (
      step.tool_id === CUSTOM_CONTENT_GENERATE_DASHBOARD_TOOL_ID &&
      Array.isArray(params.panels)
    ) {
      return params.panels.flatMap((item: unknown) =>
        isRecord(item) && isRecord(item.content) && GENERATED_PANEL_TYPES.has(item.content.type)
          ? [String(item.content.type)]
          : []
      );
    }

    if (step.tool_id === CREATE_VISUALIZATION_TOOL_ID && isRecord(params.target)) {
      const { type } = params.target;
      if (type === 'custom_content' || type === 'vega') {
        return [type];
      }
      return typeof type === 'string' && type !== 'attachment' ? ['vis'] : [];
    }

    return [];
  });

  return [...new Set(panelTypes)];
};
