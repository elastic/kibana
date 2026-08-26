/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import type { ModelProvider } from '@kbn/agent-builder-server';
import type { Logger } from '@kbn/logging';
import { SupportedChartType } from '@kbn/agent-builder-common/tools/tool_result';
import type { DashboardAttachmentData } from '@kbn/agent-builder-dashboards-common';
import { isSection } from '@kbn/agent-builder-dashboards-common';
import {
  getChartTypeSelectionPromptContent,
  getChartTypeReviewPromptContent,
  getPalettePreviewsPromptContent,
  titleRulesPromptContent,
  numberFormatRulesPromptContent,
} from '@kbn/agent-builder-visualizations-server';
import { LENS_EMBEDDABLE_TYPE } from '@kbn/lens-common';
import { getQueryColumnsFromESQLQuery } from '@kbn/esql-utils';
import { dashboardDesignGuidancePrompt } from '../../../skills/generation_guidance/design';
import type { PanelFacts } from './panel_facts';

/** Maximum number of findings the judge may return. */
const MAX_FINDINGS = 10;

export interface ReviewFinding {
  scope: 'panel' | 'dashboard';
  panel_id?: string;
  severity: 'critical' | 'warning' | 'suggestion';
  issue: string;
  suggestion: string;
}

export interface JudgeResult {
  overall_assessment: string;
  findings: ReviewFinding[];
}

const findingSchema = z.object({
  scope: z.enum(['panel', 'dashboard']),
  panel_id: z.string().optional(),
  severity: z.enum(['critical', 'warning', 'suggestion']),
  issue: z.string(),
  suggestion: z.string(),
});

const judgeOutputSchema = z.object({
  overall_assessment: z.string(),
  // Models routinely omit the array when there are zero findings — default it.
  findings: z.array(findingSchema).max(MAX_FINDINGS).default([]),
});

const SUPPORTED_CHART_TYPES = new Set<string>(Object.values(SupportedChartType));

/** Collect the distinct Lens chart types present on the dashboard. */
const collectUsedChartTypes = (panelFacts: PanelFacts[]): SupportedChartType[] => {
  const used = new Set<SupportedChartType>();
  for (const panel of panelFacts) {
    if (panel.panel_type !== LENS_EMBEDDABLE_TYPE) continue;
    const { type } = panel.config as { type?: unknown };
    if (typeof type === 'string' && SUPPORTED_CHART_TYPES.has(type)) {
      used.add(type as SupportedChartType);
    }
  }
  return [...used];
};

/**
 * Scan Lens panel configs for explicit color usage: `steps[]` arrays (recording
 * their lengths, since gradient palettes sample differently per stop count) and
 * categorical color mappings. Drives whether the judge prompt needs the palette
 * reference and at which stop counts.
 */
const collectExplicitColorUsage = (
  panelFacts: PanelFacts[]
): { stepCounts: number[]; hasCategorical: boolean } => {
  const stepCounts = new Set<number>();
  let hasCategorical = false;

  const visit = (node: unknown): void => {
    if (Array.isArray(node)) {
      node.forEach(visit);
      return;
    }
    if (!node || typeof node !== 'object') return;
    const record = node as Record<string, unknown>;
    if (Array.isArray(record.steps) && record.steps.length > 0) {
      stepCounts.add(record.steps.length);
    }
    if (record.mode === 'categorical') {
      hasCategorical = true;
    }
    Object.values(record).forEach(visit);
  };

  for (const panel of panelFacts) {
    if (panel.panel_type !== LENS_EMBEDDABLE_TYPE) continue;
    visit(panel.config);
  }

  return { stepCounts: [...stepCounts], hasCategorical };
};

const buildPaletteReferenceSection = (panelFacts: PanelFacts[]): string => {
  const { stepCounts, hasCategorical } = collectExplicitColorUsage(panelFacts);
  const previews = getPalettePreviewsPromptContent({
    dynamicStepCounts: stepCounts,
    includeCategorical: hasCategorical,
  });

  if (!previews) {
    return '';
  }

  return `### Color Palette Reference

Panels on this dashboard use explicit colors. Verify them against the canonical Lens palettes below: every \`steps[*].color\` hex must come from exactly ONE palette, sampled at the matching stop count; categorical \`palette\` values must be one of the listed ids. Flag colors that match no palette or mix palettes.

${previews}`;
};

const buildChartAuthoringRulesSection = (panelFacts: PanelFacts[]): string => {
  const chartTypeReviewContent = getChartTypeReviewPromptContent(collectUsedChartTypes(panelFacts));
  const paletteReference = buildPaletteReferenceSection(panelFacts);

  return `## Chart Authoring Rules

Lens panels were authored under the rules below. Use them as context for judging whether a panel is genuinely broken or misleading — not as a checklist to enforce. Only report a rule violation when it is objectively verifiable from the config (e.g. a legacy palette id, categorical color mapping on a numeric column, a panel title that duplicates what the chart already displays — such as a title on a metric/gauge panel restating the metric label) or clearly harms readability of the rendered chart.

Some rules are conditional on the original user request (e.g. "unless the user asks"). You do not see that request, so a deviation those rules permit on explicit request is NOT a finding — assume it was intentional.

${titleRulesPromptContent}

${numberFormatRulesPromptContent}${chartTypeReviewContent ? `\n\n${chartTypeReviewContent}` : ''}${
    paletteReference ? `\n\n${paletteReference}` : ''
  }`;
};

const getControlField = (config: unknown): string | undefined => {
  if (!config || typeof config !== 'object') {
    return undefined;
  }

  const { field_name: fieldName, esql_query: esqlQuery } = config as Record<string, unknown>;
  if (typeof fieldName === 'string' && fieldName.length > 0) {
    return fieldName;
  }
  if (typeof esqlQuery !== 'string' || esqlQuery.length === 0) {
    return undefined;
  }

  try {
    const columns = getQueryColumnsFromESQLQuery(esqlQuery);
    return columns[columns.length - 1];
  } catch {
    return undefined;
  }
};

const buildDashboardSummary = (dashboardData: DashboardAttachmentData): string => {
  const sections = dashboardData.panels.filter(isSection);
  const topLevelPanels = dashboardData.panels.filter((w) => !isSection(w));
  const controls = dashboardData.pinned_panels ?? [];

  const lines: string[] = [
    `Title: ${dashboardData.title}`,
    `Description: ${dashboardData.description ?? '(none)'}`,
    `Time range: ${JSON.stringify(dashboardData.time_range ?? '(default)')}`,
    `Sections: ${sections.length}`,
    `Top-level panels: ${topLevelPanels.length}`,
    `Controls: ${controls.length}`,
  ];

  if (sections.length > 0) {
    lines.push('\nSections:');
    for (const section of sections) {
      lines.push(
        `  - "${section.title}" (collapsed: ${section.collapsed ?? false}, panels: ${
          section.panels.length
        })`
      );
    }
  }

  if (controls.length > 0) {
    lines.push('\nControls (pinned filters):');
    for (const control of controls) {
      const config = control.config as { title?: unknown } | undefined;
      const type = typeof control.type === 'string' ? control.type : 'unknown';
      const title = typeof config?.title === 'string' ? config.title : '(none)';
      const field = getControlField(config) ?? '(none)';
      lines.push(`  - type: ${type}, title: ${title}, field: ${field}`);
    }
  }

  return lines.join('\n');
};

const buildPanelFactText = (panel: PanelFacts, indent: string, gridLabel: string): string => {
  const detailIndent = `${indent}  `;
  const nestedIndent = `${detailIndent}  `;
  const lines: string[] = [
    `${indent}Panel id: ${panel.panel_id}`,
    `${detailIndent}Title: ${panel.title ?? '(none)'}`,
    `${detailIndent}Type: ${panel.panel_type}`,
    `${detailIndent}${gridLabel}: x=${panel.grid.x} y=${panel.grid.y} w=${panel.grid.w} h=${panel.grid.h}`,
    `${detailIndent}Config: ${JSON.stringify(panel.config)}`,
  ];

  if (panel.query) lines.push(`${detailIndent}Query: ${panel.query}`);

  if (panel.execution_status === 'no_query') {
    lines.push(`${detailIndent}Execution: no ES|QL query`);
  } else if (panel.execution_status === 'error') {
    lines.push(
      `${detailIndent}Execution: ERROR — ${panel.error}${
        panel.duration_ms != null ? ` (${panel.duration_ms}ms)` : ''
      }`
    );
  } else {
    lines.push(`${detailIndent}Execution: ok (${panel.duration_ms}ms, ${panel.row_count} rows)`);
    if (panel.numeric_columns?.length) {
      lines.push(`${detailIndent}Numeric columns:`);
      for (const col of panel.numeric_columns) {
        lines.push(
          `${nestedIndent}${col.name} (${col.type}): min=${col.min}, max=${col.max}, all_zero=${
            col.all_zero
          }, null_share=${col.null_share.toFixed(2)}`
        );
      }
    }
    if (panel.keyword_columns?.length) {
      lines.push(`${detailIndent}Keyword/text columns:`);
      for (const col of panel.keyword_columns) {
        lines.push(
          `${nestedIndent}${col.name} (${col.type}): ${
            col.distinct_count
          } distinct, top values: ${JSON.stringify(col.top_values)}`
        );
      }
    }
    if (panel.sample_rows?.length) {
      lines.push(
        `${detailIndent}Sample rows${
          panel.sample_truncated ? ` (first ${panel.sample_rows.length} of ${panel.row_count})` : ''
        }: ${JSON.stringify(panel.sample_rows)}`
      );
    }
  }

  return lines.join('\n');
};

const buildPanelFactsText = (
  dashboardData: DashboardAttachmentData,
  panelFacts: PanelFacts[]
): string => {
  const factsByPanelId = new Map(panelFacts.map((panel) => [panel.panel_id, panel]));
  const emittedPanelIds = new Set<string>();
  const blocks: string[] = [];

  for (const widget of dashboardData.panels) {
    if (isSection(widget)) {
      const lines = [
        `Section id: ${widget.id}`,
        `  Title: ${widget.title}`,
        `  Collapsed: ${widget.collapsed}`,
        `  Dashboard grid: y=${widget.grid.y}`,
        `  Panels:`,
      ];
      for (const panel of widget.panels) {
        const facts = factsByPanelId.get(panel.id);
        if (facts) {
          emittedPanelIds.add(panel.id);
          lines.push(buildPanelFactText(facts, '    ', 'Grid within section'));
        }
      }
      blocks.push(lines.join('\n'));
      continue;
    }

    const facts = factsByPanelId.get(widget.id);
    if (facts) {
      emittedPanelIds.add(widget.id);
      blocks.push(`Top-level panel:\n${buildPanelFactText(facts, '  ', 'Dashboard grid')}`);
    }
  }

  const unplacedFacts = panelFacts.filter((panel) => !emittedPanelIds.has(panel.panel_id));
  if (unplacedFacts.length > 0) {
    blocks.push(
      `Unplaced panel facts:\n${unplacedFacts
        .map((panel) => buildPanelFactText(panel, '  ', 'Grid'))
        .join('\n\n')}`
    );
  }

  return blocks.join('\n\n');
};

const buildJudgePrompt = (
  dashboardData: DashboardAttachmentData,
  panelFacts: PanelFacts[],
  focus: string | undefined
): string => `You are a Kibana dashboard quality reviewer. Your job is to evaluate the dashboard below against the guidelines it was authored with, considering all panels together as a whole.

## Authoring Guidelines

${dashboardDesignGuidancePrompt}

---

${getChartTypeSelectionPromptContent()}

---

${buildChartAuthoringRulesSection(panelFacts)}

---

## Dashboard to Review

${buildDashboardSummary(dashboardData)}

## Panel Facts

${buildPanelFactsText(dashboardData, panelFacts)}

${focus ? `## Review Focus\n\n${focus}\n\n` : ''}## Instructions

Review the dashboard holistically. Consider how panels relate to each other — redundancy, ordering, composition, cross-panel consistency (units, color semantics), and whether the overall layout tells a coherent story.

For each panel consider: does the data make sense for the stated intent, and are the chart type and configuration appropriate for the data shape?

Always check each panel's execution facts for these data defects — they are real findings, not judgment calls:
- execution errors, or a query returning 0 rows (the panel renders empty)
- an all-zero metric or all-zero numeric column
- null or empty-string values in a column used as a category, breakdown, or axis (\`top_values\` containing null, or a high \`null_share\`) — Lens renders these as a "(blank)" bucket; suggest excluding them in the query (e.g. \`WHERE field IS NOT NULL\`) or labelling them via \`COALESCE\` when they carry meaning. When the "(blank)" bucket is the largest or a dominant category, the chart is actively misleading — report it as \`critical\`; otherwise \`warning\`
- a panel \`title\` that duplicates what the chart already renders inside itself — e.g. a metric/gauge/tagcloud/waffle panel whose title restates the metric label or value column shown by the chart. The title rules say to omit the title on these chart types; report as \`warning\` with the suggestion to remove the title

You are a high-precision reviewer: your findings trigger automated fixes and user-facing follow-ups, so every false positive has a real cost. Report a finding ONLY when you are confident it describes a real, observable defect — grounded in the panel facts above (an error, a data shape that contradicts the config, an objectively invalid config value) — and fixing it would materially change what a viewer sees or understands. Do NOT report:
- stylistic preferences, alternative phrasings of titles/descriptions, or "could also" ideas (a title duplicating the chart's own rendered label is NOT phrasing — it is on the checklist above)
- hypothetical concerns not evidenced by the executed results (e.g. "might be slow on larger data")
- deviations from the guidelines that could plausibly be intentional
- duplicate findings — if one root cause affects several panels, report it once at dashboard scope

When in doubt, omit the finding. Zero findings is a valid and expected outcome for a well-composed dashboard.

Report up to ${MAX_FINDINGS} findings, prioritising by impact. Use severity:
- critical: the dashboard is broken or actively misleading (query error, all-zero metric, wrong chart type that inverts the meaning)
- warning: a real defect that noticeably degrades correctness or readability for a viewer (e.g. a legend so crowded the chart is unreadable, a number format that misstates units)
- suggestion: a concrete, high-value improvement — not routine polish

For each finding, provide a concrete suggestion in plain prose describing what to change.

## Non-Issues — never report these

- Time filtering with \`?_tstart\`/\`?_tend\`: Kibana ALWAYS applies the dashboard time range to every panel via a Query DSL range filter on the panel's time field, independent of the query text. The \`?_tstart\`/\`?_tend\` named params are an ADDITIONAL, optional mechanism (e.g. to size \`BUCKET()\` extents). A query that omits them, or uses them only inside \`BUCKET()\`, is fully time-filtered. NEVER report a missing, partial, or "inconsistent" use of \`?_tstart\`/\`?_tend\` — in any panel, at any severity. This review executed every query with the same two mechanisms, so the row counts and samples above already reflect correct time filtering.
- Absence of an explicit \`WHERE\` clause on the time field — covered by the same range filter.
- Panels intentionally without a title (metric, gauge, tagcloud, waffle) — per the title rules above.`;

/**
 * Call the default model to judge the dashboard and return structured findings.
 */
export const judgeDashboard = async ({
  dashboardData,
  panelFacts,
  focus,
  modelProvider,
  logger,
}: {
  dashboardData: DashboardAttachmentData;
  panelFacts: PanelFacts[];
  focus: string | undefined;
  modelProvider: ModelProvider;
  logger: Logger;
}): Promise<JudgeResult> => {
  const defaultModel = await modelProvider.getDefaultModel();
  const judgeModel = defaultModel.chatModel.withStructuredOutput(judgeOutputSchema, {
    name: 'review_dashboard',
  });

  const prompt = buildJudgePrompt(dashboardData, panelFacts, focus);

  logger.debug(`Invoking dashboard judge for "${dashboardData.title}"`);

  const rawResult = await judgeModel.invoke([{ role: 'user', content: prompt }]);

  // withStructuredOutput only uses the schema for the tool definition and returns
  // the model's arguments unvalidated — enforce the schema (and its defaults) here.
  const result = judgeOutputSchema.parse(rawResult);

  logger.info(
    `Dashboard judge returned ${result.findings.length} finding(s) for "${dashboardData.title}"`
  );

  return result;
};
