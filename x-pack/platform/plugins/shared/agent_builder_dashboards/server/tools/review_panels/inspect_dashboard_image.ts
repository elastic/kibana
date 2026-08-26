/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { EffortLevels } from '@kbn/agent-builder-common';
import type { ModelProvider } from '@kbn/agent-builder-server';
import { createUserMessage } from '@kbn/agent-builder-genai-utils/langchain';
import type { PanelCatalogEntry } from './catalog_dashboard_panels';
import type { DashboardImage, PanelFinding } from './types';

const panelReviewSchema = z.object({
  findings: z.array(
    z.object({
      panel_id: z.string().describe('id of the panel from the catalog'),
      rule: z.string().describe('which visual rule was broken'),
      what: z.string().describe('what is wrong in the screenshot for that panel'),
    })
  ),
});

const PANEL_REVIEW_PROMPT = `You are Panel Review, a vision sensor for a Kibana dashboard screenshot.

You receive:
- A PNG of the painted dashboard
- A catalog of panels with ids, types, titles, and grid sizes

Return only panel-level visual findings. Do not suggest adding or removing panels. Do not restyle every chart. Do not invent broken ES|QL. If a panel looks fine, omit it.

Rules to check:
- Disproportionate panel sizes (a panel is far larger or smaller than its importance)
- Wrong or inconsistent color usage
- Duplicate titles (panel title repeats the metric or chart label)
- Crowded or truncated text, overlapping chrome, empty-looking panels that still have a title
- Chart type that does not match the data shown (e.g. a pie for a time series)

Use catalog panel ids. If you cannot tell which panel, skip the finding.`;

export const inspectDashboardImage = async ({
  panels,
  image,
  modelProvider,
}: {
  panels: PanelCatalogEntry[];
  image: DashboardImage;
  modelProvider: ModelProvider;
}): Promise<PanelFinding[]> => {
  const model = await modelProvider.selectModel({ effortLevel: EffortLevels.medium });
  const reviewModel = model.chatModel.withStructuredOutput(panelReviewSchema, {
    name: 'panel_review',
  });
  const response = await reviewModel.invoke([
    createUserMessage(
      `${PANEL_REVIEW_PROMPT}

Panel catalog:
${JSON.stringify(panels)}`,
      {
        images: [
          {
            base64: image.bytes.toString('base64'),
            mimeType: image.mimeType,
          },
        ],
      }
    ),
  ]);

  return Array.isArray(response?.findings) ? response.findings : [];
};
