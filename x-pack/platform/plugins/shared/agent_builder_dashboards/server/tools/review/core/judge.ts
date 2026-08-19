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
const MAX_FINDINGS = 30;

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

Lens panels were authored under the rules below. Flag violations as findings (default severity: warning).

Some rules are conditional on the original user request (e.g. "unless the user asks"). You do not see that request, so when a config deviates in a way those rules permit on explicit request, report it as a \`suggestion\` (a question to raise with the user) rather than a \`warning\` — unless the config is objectively invalid (e.g. a legacy palette id, categorical color mapping on a numeric column).

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
      if (!isSection(section)) continue;
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
      const c = control as { type?: unknown; config?: unknown };
      const config = c.config as { title?: unknown } | undefined;
      const type = typeof c.type === 'string' ? c.type : 'unknown';
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

For each panel consider: does the data make sense for the stated intent, are the chart type and configuration appropriate for the data shape, are there signs of broken queries (all-zero results, empty rows, errors)?

Report up to ${MAX_FINDINGS} findings, prioritising by impact. Use severity:
- critical: the dashboard is broken or actively misleading (query error, all-zero metric, wrong chart type that inverts the meaning)
- warning: noticeably degrades usability or correctness (too many legend items for the panel size, missing title, slow query)
- suggestion: a polish opportunity that would improve clarity or aesthetics

Zero findings is a valid and expected outcome for a well-composed dashboard.

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
