/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SupportedChartType } from '@kbn/agent-builder-common/tools/tool_result';
import type { AttachmentPanel } from '@kbn/agent-builder-dashboards-common';
import type { PanelFailure } from './utils';

/**
 * Contract for inline panel content resolution.
 *
 * The generate core consumes this to turn an inline panel request (natural
 * language / ES|QL) into panel content, without depending on any
 * environment-specific implementation. The host (e.g. Kibana) provides the
 * concrete resolver — see `panel_resolver.ts`.
 */
export type PanelContentAttempt =
  | {
      type: 'success';
      panelContent: Pick<AttachmentPanel, 'type' | 'config'>;
    }
  | {
      type: 'failure';
      failure: PanelFailure;
    };

type InlinePanelOperationType = 'add_section' | 'add_panels' | 'edit_panels';

interface ResolvePanelContentParams {
  operationType: InlinePanelOperationType;
  identifier: string;
  nlQuery: string;
  index?: string;
  chartType?: SupportedChartType;
  esql?: string;
  existingPanel?: AttachmentPanel;
}

export type ResolvePanelContent = (
  params: ResolvePanelContentParams
) => Promise<PanelContentAttempt>;

export const createPanelFailureResult = (
  type: PanelFailure['type'],
  identifier: string,
  error: string
): Extract<PanelContentAttempt, { type: 'failure' }> => ({
  type: 'failure',
  failure: {
    type,
    identifier,
    error,
  },
});
