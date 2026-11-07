/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DashboardAttachmentData } from '@kbn/agent-builder-dashboards-common';
import { LENS_EMBEDDABLE_TYPE } from '@kbn/lens-common';
import type { PanelContent } from '../resolve_panel';
import { applyPlan } from './apply';
import type { PlannedPanel, UpsertPlan } from './plan';
import type { ResolvedPanel } from './resolve';

/**
 * The content a planned panel will resolve to, as far as the layout needs it: its kind and a label.
 * `undefined` when the kind or size depends on what resolution returns: attachments, custom content,
 * whose height follows its generated template, and new Vega panels.
 */
const predictPanel = (panel: PlannedPanel): ResolvedPanel | undefined => {
  if (panel.existingPanel) {
    const { content, existingPanel } = panel;
    if (content === undefined || content.source === 'config') {
      return { ...panel, content: content?.panelContent };
    }
    if (content.source === 'attachment' || content.request.renderer === 'custom_content') {
      return undefined;
    }
    const { renderer, chartType } = content.request;
    const predictedContent: PanelContent | undefined =
      renderer === 'lens' && chartType !== undefined
        ? { type: existingPanel.type, config: { ...existingPanel.config, type: chartType } }
        : undefined;
    return { ...panel, content: predictedContent };
  }

  const { content } = panel;
  if (content.source === 'config') {
    return { ...panel, content: content.panelContent };
  }
  if (content.source === 'attachment') {
    return undefined;
  }
  const { request } = content;
  if (request.renderer === 'custom_content' || request.renderer === 'vega') {
    return undefined;
  }
  if (request.chartType === undefined) {
    return undefined;
  }
  // The request describes the panel before it has a title, which is enough to group panels.
  return {
    ...panel,
    content: {
      type: LENS_EMBEDDABLE_TYPE,
      config: { type: request.chartType, title: request.nlQuery },
    },
  };
};

/**
 * The dashboard the plan leads to when every panel resolves to the kind it asked for, for laying
 * it out while panel content resolves. `undefined` when a panel's kind or size is known only after
 * resolution.
 */
export const predictPlannedDashboard = (
  dashboardData: DashboardAttachmentData,
  plan: UpsertPlan
): DashboardAttachmentData | undefined => {
  const panels: ResolvedPanel[] = [];
  for (const plannedPanel of plan.panels) {
    const predictedPanel = predictPanel(plannedPanel);
    if (!predictedPanel) {
      return undefined;
    }
    panels.push(predictedPanel);
  }
  return applyPlan({ dashboardData, changes: { ...plan, panels, controls: [] } });
};
