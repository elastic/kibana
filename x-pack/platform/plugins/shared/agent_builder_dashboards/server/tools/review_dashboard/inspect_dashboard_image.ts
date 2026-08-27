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
import { dashboardDesignPracticesPrompt } from '../../skills/generation_guidance/design';
import { filterDashboardFindings } from './filter_dashboard_findings';
import type {
  ControlCatalogEntry,
  DashboardFinding,
  DashboardImage,
  PanelCatalogEntry,
  SectionCatalogEntry,
} from './types';

const panelGridSchema = z.object({
  x: z.number(),
  y: z.number(),
  w: z.number(),
  h: z.number(),
});

const dashboardReviewSchema = z.object({
  findings: z.array(
    z.discriminatedUnion('rule', [
      z.object({
        rule: z.literal('pack_layout'),
        what: z.string(),
        fix: z.object({
          panels: z.array(
            z.object({
              panel_id: z.string(),
              grid: panelGridSchema,
              section_id: z.string().nullable().optional(),
            })
          ),
        }),
      }),
      z.object({
        rule: z.literal('weak_sections'),
        what: z.string(),
        fix: z.object({
          sections: z.array(
            z.object({
              id: z.string(),
              title: z.string(),
              panel_ids: z.array(z.string()),
            })
          ),
        }),
      }),
      z.object({
        rule: z.literal('monotone_chart_types'),
        what: z.string(),
        fix: z.object({
          changes: z.array(
            z.object({
              panel_id: z.string(),
              chartType: z.string(),
            })
          ),
        }),
      }),
      z.object({
        rule: z.literal('wrong_chart_type'),
        panel_id: z.string(),
        what: z.string(),
        fix: z.object({ chartType: z.string() }),
      }),
      z.object({
        rule: z.literal('duplicate_inner_title'),
        panel_id: z.string(),
        what: z.string(),
        fix: z.object({ hide_title: z.literal(true) }),
      }),
      z.object({
        rule: z.literal('one_category_chart'),
        panel_id: z.string(),
        what: z.string(),
        fix: z.object({ chartType: z.string() }),
      }),
      z.object({
        rule: z.literal('metric_fill'),
        panel_id: z.string(),
        what: z.string(),
        fix: z.object({ clear_background: z.literal(true) }),
      }),
      z.object({
        rule: z.literal('thin_metric'),
        panel_id: z.string(),
        what: z.string(),
        fix: z.object({ enhance: z.literal('trendline') }),
      }),
      z.object({
        rule: z.literal('weak_controls'),
        what: z.string(),
        fix: z.object({
          add: z.array(
            z.object({
              type: z.literal('options_list_control'),
              field_name: z.string(),
              index: z.string(),
              title: z.string().optional(),
            })
          ),
        }),
      }),
    ])
  ),
});

const DASHBOARD_REVIEW_PROMPT = `You are Dashboard Review, a high-precision vision sensor for a Kibana dashboard screenshot.

Findings trigger an automated generate. Every false positive has a real cost: the agent may rebuild working visualizations. Report a finding ONLY when you are confident it is a real, observable defect in the painted dashboard and fixing it would materially change what a viewer sees.

You receive:
- A PNG of the painted dashboard
- A catalog of panels (ids, types, titles, grid, chart_type, esql, section_id, hide_title, apply_color_to, has_secondary_metric, background_chart)
- Existing sections (id, title)
- Existing controls (id, type, title)

The catalog is what each panel is (query and chart family). The PNG is how it looks. Do not invent ES|QL. Do not invent control fields. Do not treat a table as a metric.

Judge the screenshot against the dashboard design practices below. Use those practices to decide layout packing, section grouping, chart-type invert, chart-type variety, missing filters, stacked panel titles, one-category charts, invented metric backgrounds, and sparse KPIs. Do not invent extra rules. Do not add or remove panels.

${dashboardDesignPracticesPrompt}

Zero findings is valid and expected for a well-composed dashboard. When in doubt, omit.

## Rules (only these)

- pack_layout: the grid has holes, a row's widths do not sum to 48, or side-by-side panels do not share height. Also shrink too-tall xy (prefer h around 10, not 20+), stretched KPIs (metric w 6–12, h 5–6), and oversized pies (w: 12). Widen a panel whose legend is clipped. Prefer a primary time series at w: 48 and other series at w: 24. fix.panels MUST list EVERY catalog panel exactly once with a packed {x,y,w,h}. Inside a section, coordinates are section-relative (that section starts at y: 0). Set section_id to an existing section id, or to an id from weak_sections on a flat dashboard, or omit/null for top-level. Prefer w values that divide 48: 6, 8, 12, 24, 48. Never shrink a data table below w 24 (prefer 48).
- weak_sections: the dashboard is FLAT (catalog sections is empty), has roughly 6 or more visualization panels or distinct topics, and needs grouping. fix.sections: review-chosen ids (e.g. section-overview), titles, and existing panel_ids. Do not add charts. Do not emit this when sections already exist.
- wrong_chart_type: ONE panel's chart family inverts the data (a pie or treemap for a time series; a metric for a distribution). Not "a bar could also be a line". fix: { chartType } from the chart-type practices, keeping the same data.
- one_category_chart: a bar/xy with a SINGLE category (one bar, one slice, one ranking row painted as a chart) should be a metric (one number) or pie (part-to-whole). Same ES|QL. At most 3. Never change metric, gauge, pie, or data_table. invert wins on the same panel. fix: { chartType: "metric" | "pie" }.
- monotone_chart_types: a MAJORITY of visualizations share one family (e.g. all xy/line) even though the catalog shows mixed data shapes. At most 3 changes. Keep the primary time series. Prefer converting categorical breakdowns (one-bar lines, rankings) to bar/pie/heatmap. Never change metric, gauge, or data_table. Same ES|QL. Skip panels already in invert or one_category_chart. fix.changes: [{ panel_id, chartType }].
- weak_controls: fewer than 2 options_list_control dropdowns AND catalog ES|QL has unused low-cardinality fields in BY/WHERE. At most 3 adds. field_name and index MUST appear in catalog ES|QL. type must be options_list_control. Do not remove controls. Do not report control widths or filter-bar chrome.
- duplicate_inner_title: the dashboard panel chrome title AND the visualization's inner title are both painted and say the same thing (typical for metric/gauge: "Requests" above the box and "Requests" inside). fix: { hide_title: true } to hide the chrome title. Do not rewrite the inner title. Skip if catalog hide_title is already true.
- metric_fill: a metric paints an invented BACKGROUND color (mustard, brown, pink, etc.), not a colored value. Catalog apply_color_to is "background". fix: { clear_background: true }. Do not restyle bar/pie palettes. Do not report value coloring.
- thin_metric: a sparse KPI that is only a number on white, with no secondary value and no sparkline (catalog has_secondary_metric and background_chart are absent). fix: { enhance: "trendline" } to add a sparkline from the same query. At most 4. Do not invent a second ES|QL column (no secondary metric). Skip if the metric already has a secondary or background_chart.

## Non-issues — never report

- Alternative titles, generic titles like "Metric", technical or ES|QL-looking titles, or "could be clearer"
- Rewriting titles. Title-only edit_panels rebuilds the chart. duplicate_inner_title hides chrome; it does not rename.
- Kibana chrome: hover action toolbars, drag handles, grid outlines, filter bars, time picker, panel menus
- Crowded or overlapping chrome; only the visualization itself matters
- Empty-looking panels that still show a number or chart. thin_metric is only for a metric that is a lone number with no sparkline/secondary — not empty charts or empty tables.
- Color palette preferences or restyling every chart. Invented metric BACKGROUND fill is metric_fill; leave bar/pie palettes alone.
- Invented broken ES|QL
- Adding or removing panels
- Full-width data tables. Tables need width so columns stay readable (w: 24–48, prefer 48). Never shrink a data table.
- Rebuilding existing sections or changing their titles
- Removing controls
- Line-to-area series fill. Still xy; not a chart-type change.

Use catalog panel ids. If you cannot tell which panel, skip. Consult each catalog entry's \`chart_type\`.`;

export const inspectDashboardImage = async ({
  panels,
  controls,
  sections,
  image,
  modelProvider,
}: {
  panels: PanelCatalogEntry[];
  controls: ControlCatalogEntry[];
  sections: SectionCatalogEntry[];
  image: DashboardImage;
  modelProvider: ModelProvider;
}): Promise<DashboardFinding[]> => {
  const model = await modelProvider.selectModel({ effortLevel: EffortLevels.medium });
  const reviewModel = model.chatModel.withStructuredOutput(dashboardReviewSchema, {
    name: 'dashboard_review',
  });
  const response = await reviewModel.invoke([
    createUserMessage(
      `${DASHBOARD_REVIEW_PROMPT}

Dashboard catalog:
${JSON.stringify({ panels, sections, controls })}`,
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

  const findings = Array.isArray(response?.findings) ? response.findings : [];
  return filterDashboardFindings({ findings, panels, controls, sections });
};
