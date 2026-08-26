/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MARKDOWN_EMBEDDABLE_TYPE } from '@kbn/dashboard-markdown/common';
import {
  isSection,
  type AttachmentPanel,
  type DashboardAttachmentData,
} from '@kbn/agent-builder-dashboards-common';

const flattenPanels = (panels: DashboardAttachmentData['panels']): AttachmentPanel[] => {
  const result: AttachmentPanel[] = [];
  for (const widget of panels) {
    if (isSection(widget)) {
      result.push(...widget.panels);
    } else {
      result.push(widget);
    }
  }
  return result;
};

/**
 * Prettify is offered when the dashboard has at least one visualization.
 * Markdown is ignored.
 */
export const isPrettifyCompatibleDashboard = (data: DashboardAttachmentData): boolean =>
  flattenPanels(data.panels).some((panel) => panel.type !== MARKDOWN_EMBEDDABLE_TYPE);
