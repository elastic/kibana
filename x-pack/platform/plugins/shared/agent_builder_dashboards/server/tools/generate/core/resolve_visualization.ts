/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SupportedChartType } from '@kbn/agent-builder-common/tools/tool_result';
import type { AttachmentPanel } from '@kbn/agent-builder-dashboards-common';
import type { VisualizationFailure } from './utils';

/**
 * Contract for inline visualization resolution.
 *
 * The generate core consumes this to turn an inline visualization request
 * (natural language / ES|QL) into panel content, without depending on any
 * environment-specific implementation. The host (e.g. Kibana) provides the
 * concrete resolver — see `visualization_resolver.ts`.
 */
export type VisualizationAttempt =
  | {
      type: 'success';
      visContent: Pick<AttachmentPanel, 'type' | 'config'>;
    }
  | {
      type: 'failure';
      failure: VisualizationFailure;
    };

type InlineVisualizationOperationType = 'add_section' | 'add_panels' | 'edit_panels';

interface ResolveVisualizationConfigParams {
  operationType: InlineVisualizationOperationType;
  identifier: string;
  nlQuery: string;
  index?: string;
  chartType?: SupportedChartType;
  esql?: string;
  existingPanel?: AttachmentPanel;
}

export type ResolveVisualizationConfig = (
  params: ResolveVisualizationConfigParams
) => Promise<VisualizationAttempt>;

export const createVisualizationFailureResult = (
  type: VisualizationFailure['type'],
  identifier: string,
  error: string
): Extract<VisualizationAttempt, { type: 'failure' }> => ({
  type: 'failure',
  failure: {
    type,
    identifier,
    error,
  },
});
