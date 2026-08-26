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

const PANEL_REVIEW_RULES = ['disproportionate_size', 'wrong_chart_type'] as const;

const panelReviewSchema = z.object({
  findings: z.array(
    z.object({
      panel_id: z.string().describe('id of the panel from the catalog'),
      rule: z.enum(PANEL_REVIEW_RULES).describe('which visual rule was broken'),
      what: z.string().describe('what is wrong in the screenshot for that panel'),
      fix: z
        .string()
        .describe(
          'Concrete change: target grid {x,y,w,h} for size, or the chartType to switch to while keeping the same data'
        ),
    })
  ),
});

const PANEL_REVIEW_PROMPT = `You are Panel Review, a high-precision vision sensor for a Kibana dashboard screenshot.

Findings trigger an automated generate. Every false positive has a real cost: the agent may rebuild working visualizations. Report a finding ONLY when you are confident it is a real, observable defect in the painted dashboard and fixing it would materially change what a viewer sees.

You receive:
- A PNG of the painted dashboard
- A catalog of panels with ids, types, titles, grid, chart_type, and esql when present

The catalog is what each panel is (query and chart family). The PNG is how it looks. Do not invent ES|QL. Do not treat a table as a metric.

Return panel-level findings. If a panel looks fine, omit it. Zero findings is valid and expected for a well-composed dashboard. When in doubt, omit.

## Rules (only these)

- disproportionate_size: a panel is far larger or smaller than neighboring panels of the same kind, or a metric/gauge is stretched full-width. fix: the target grid {x, y, w, h} using the 48-column layout (metrics w:6–12 h:5–6; xy w:24 h:10 unless it is the primary full-width time series).
- wrong_chart_type: the chart family inverts the data (a pie or treemap for a time series; a metric for a distribution). Not "a bar could also be a line". fix: the chartType to use, keeping the same data.

## Non-issues — never report

- Alternative titles, generic titles like "Metric", technical or ES|QL-looking titles, or "could be clearer"
- Duplicate titles / titles that restate the metric label — title-only edits rebuild the chart
- Kibana chrome: hover action toolbars, drag handles, grid outlines, filter bars, time picker, panel menus
- Crowded or overlapping chrome; only the visualization itself matters
- Empty-looking panels that still show a number or chart
- Color palette preferences or restyling every chart
- Invented broken ES|QL
- Adding or removing panels
- Full-width data tables. Tables need width so columns stay readable (w: 24–48, prefer 48). Never shrink a data table.

Use catalog panel ids. If you cannot tell which panel, skip. Consult each catalog entry's \`chart_type\`.`;

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

  const allowedRules = new Set<string>(PANEL_REVIEW_RULES);
  const findings = Array.isArray(response?.findings) ? response.findings : [];
  const panelsById = new Map(panels.map((panel) => [panel.id, panel]));
  return findings.filter((finding) => {
    if (!allowedRules.has(finding.rule)) {
      return false;
    }
    if (finding.rule === 'disproportionate_size') {
      const panel = panelsById.get(finding.panel_id);
      if (panel?.chart_type === 'data_table') {
        return false;
      }
    }
    return true;
  });
};
