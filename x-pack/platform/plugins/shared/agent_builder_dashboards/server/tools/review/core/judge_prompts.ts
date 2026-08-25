/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

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
import { dashboardDesignReviewPrompt } from '../../../skills/generation_guidance/design';
import type { PanelFacts } from './panel_facts';

const SUPPORTED_CHART_TYPES = new Set<string>(Object.values(SupportedChartType));

/** Collect the distinct Lens chart types present in the given panel facts. */
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

Panels under review use explicit colors. Verify them against the canonical Lens palettes below: every \`steps[*].color\` hex must come from exactly ONE palette, sampled at the matching stop count; categorical \`palette\` values must be one of the listed ids. Flag colors that match no palette or mix palettes.

${previews}`;
};

/**
 * Chart authoring rules scoped to the given panels' chart types and color
 * usage. The framing differs per mode: 'context' (self-review) treats the
 * rules as background for spotting objective defects; 'enforce' (facts-based
 * audit) enforces them fully against configs and executed results; 'visual'
 * (screenshot audit) enforces what is verifiable from the rendered image and
 * omits the config-based palette reference.
 */
export const buildChartAuthoringRulesSection = (
  panelFacts: PanelFacts[],
  mode: 'context' | 'enforce' | 'visual'
): string => {
  const chartTypeReviewContent = getChartTypeReviewPromptContent(collectUsedChartTypes(panelFacts));
  const paletteReference = mode === 'visual' ? '' : buildPaletteReferenceSection(panelFacts);

  const framing =
    mode === 'enforce'
      ? `Lens panels must follow the rules below. Enforce them fully: any deviation that is verifiable from the config or the executed results is a finding.`
      : mode === 'visual'
      ? `Lens panels must follow the rules below. Enforce them fully: any deviation that is verifiable from the rendered screenshot is a finding.`
      : `Lens panels were authored under the rules below. Use them as context for judging whether a panel is genuinely broken or misleading — not as a checklist to enforce. Only report a rule violation when it is objectively verifiable from the information provided (e.g. a legacy palette id, categorical color mapping on a numeric column, a panel title that duplicates what the chart already displays — such as a title on a metric/gauge panel restating the metric label) or clearly harms readability of the rendered chart.

Some rules are conditional on the original user request (e.g. "unless the user asks"). You do not see that request, so a deviation those rules permit on explicit request is NOT a finding — assume it was intentional.`;

  return `## Chart Authoring Rules

${framing}

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
  } else if (panel.execution_status === 'not_executed') {
    lines.push(
      `${detailIndent}Execution: not executed — judge the rendered result from the attached screenshot`
    );
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

/**
 * Walk the dashboard's section/panel structure and render every panel's facts
 * with the given renderer, preserving section context and appending any panels
 * that are missing from the layout.
 */
const buildPanelBlocksText = (
  dashboardData: DashboardAttachmentData,
  panelFacts: PanelFacts[],
  renderPanel: (panel: PanelFacts, indent: string, gridLabel: string) => string
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
          lines.push(renderPanel(facts, '    ', 'Grid within section'));
        }
      }
      blocks.push(lines.join('\n'));
      continue;
    }

    const facts = factsByPanelId.get(widget.id);
    if (facts) {
      emittedPanelIds.add(widget.id);
      blocks.push(`Top-level panel:\n${renderPanel(facts, '  ', 'Dashboard grid')}`);
    }
  }

  const unplacedFacts = panelFacts.filter((panel) => !emittedPanelIds.has(panel.panel_id));
  if (unplacedFacts.length > 0) {
    blocks.push(
      `Unplaced panel facts:\n${unplacedFacts
        .map((panel) => renderPanel(panel, '  ', 'Grid'))
        .join('\n\n')}`
    );
  }

  return blocks.join('\n\n');
};

const buildPanelFactsText = (
  dashboardData: DashboardAttachmentData,
  panelFacts: PanelFacts[]
): string => buildPanelBlocksText(dashboardData, panelFacts, buildPanelFactText);

/**
 * Compact map entry for screenshot-based reviews: identity, title, type, and
 * grid only — no config, query, or execution facts. The judge maps what it
 * sees in the image to these panel ids.
 */
const buildPanelMapEntry = (panel: PanelFacts, indent: string, gridLabel: string): string => {
  const chartType = (panel.config as { type?: unknown }).type;
  return [
    `${indent}Panel id: ${panel.panel_id}`,
    `${indent}  Title: ${panel.title ?? '(none)'}`,
    `${indent}  Type: ${panel.panel_type}${typeof chartType === 'string' ? ` (${chartType})` : ''}`,
    `${indent}  ${gridLabel}: x=${panel.grid.x} y=${panel.grid.y} w=${panel.grid.w} h=${panel.grid.h}`,
  ].join('\n');
};

const buildPanelMapText = (
  dashboardData: DashboardAttachmentData,
  panelFacts: PanelFacts[]
): string => buildPanelBlocksText(dashboardData, panelFacts, buildPanelMapEntry);

/** Maximum number of `format` config snippets included per panel digest. */
const MAX_FORMAT_HINTS = 3;

/**
 * Collect compact snippets of `format` config values so the holistic pass can
 * judge cross-panel unit/format consistency without carrying full configs.
 */
const collectFormatHints = (config: unknown): string[] => {
  const hints: string[] = [];

  const visit = (node: unknown): void => {
    if (hints.length >= MAX_FORMAT_HINTS) return;
    if (Array.isArray(node)) {
      node.forEach(visit);
      return;
    }
    if (!node || typeof node !== 'object') return;
    for (const [key, value] of Object.entries(node as Record<string, unknown>)) {
      if (key === 'format' && value != null) {
        hints.push(JSON.stringify(value).slice(0, 80));
        if (hints.length >= MAX_FORMAT_HINTS) return;
        continue;
      }
      visit(value);
    }
  };

  visit(config);
  return hints;
};

/**
 * One compact block per panel for the holistic audit pass: identity, layout,
 * query, and column shape — no raw configs or sample rows.
 */
const buildPanelDigestText = (panel: PanelFacts, sectionTitle: string | undefined): string => {
  const chartType = (panel.config as { type?: unknown }).type;
  const lines: string[] = [
    `Panel id: ${panel.panel_id}${sectionTitle ? ` (in section "${sectionTitle}")` : ''}`,
    `  Title: ${panel.title ?? '(none)'}`,
    `  Type: ${panel.panel_type}${typeof chartType === 'string' ? ` (${chartType})` : ''}`,
    `  ${sectionTitle ? 'Grid within section' : 'Dashboard grid'}: x=${panel.grid.x} y=${
      panel.grid.y
    } w=${panel.grid.w} h=${panel.grid.h}`,
  ];

  if (panel.query) lines.push(`  Query: ${panel.query}`);

  if (panel.execution_status === 'error') {
    lines.push(`  Execution: ERROR — ${panel.error}`);
  } else if (panel.execution_status === 'not_executed') {
    lines.push(
      `  Execution: not executed — judge the rendered result from the attached screenshot`
    );
  } else if (panel.execution_status === 'ok') {
    const columns = [
      ...(panel.numeric_columns ?? []).map((col) => `${col.name} (${col.type})`),
      ...(panel.keyword_columns ?? []).map(
        (col) => `${col.name} (${col.type}, ${col.distinct_count} distinct)`
      ),
    ];
    lines.push(`  Execution: ok (${panel.row_count} rows)`);
    if (columns.length > 0) lines.push(`  Columns: ${columns.join(', ')}`);
  }

  const formatHints = collectFormatHints(panel.config);
  if (formatHints.length > 0) {
    lines.push(`  Value formats: ${formatHints.join(', ')}`);
  }

  return lines.join('\n');
};

const buildPanelDigestsText = (
  dashboardData: DashboardAttachmentData,
  panelFacts: PanelFacts[]
): string => {
  const factsByPanelId = new Map(panelFacts.map((panel) => [panel.panel_id, panel]));
  const emittedPanelIds = new Set<string>();
  const blocks: string[] = [];

  for (const widget of dashboardData.panels) {
    if (isSection(widget)) {
      blocks.push(
        `Section id: ${widget.id} — "${widget.title}" (collapsed: ${widget.collapsed}, dashboard grid y=${widget.grid.y})`
      );
      for (const panel of widget.panels) {
        const facts = factsByPanelId.get(panel.id);
        if (facts) {
          emittedPanelIds.add(panel.id);
          blocks.push(buildPanelDigestText(facts, widget.title));
        }
      }
      continue;
    }

    const facts = factsByPanelId.get(widget.id);
    if (facts) {
      emittedPanelIds.add(widget.id);
      blocks.push(buildPanelDigestText(facts, undefined));
    }
  }

  for (const panel of panelFacts) {
    if (!emittedPanelIds.has(panel.panel_id)) {
      blocks.push(buildPanelDigestText(panel, undefined));
    }
  }

  return blocks.join('\n\n');
};

const buildNonIssuesSection = (hasImage: boolean): string => `## Non-Issues — never report these

- Time filtering with \`?_tstart\`/\`?_tend\`: Kibana ALWAYS applies the dashboard time range to every panel via a Query DSL range filter on the panel's time field, independent of the query text. The \`?_tstart\`/\`?_tend\` named params are an ADDITIONAL, optional mechanism (e.g. to size \`BUCKET()\` extents). A query that omits them, or uses them only inside \`BUCKET()\`, is fully time-filtered. NEVER report a missing, partial, or "inconsistent" use of \`?_tstart\`/\`?_tend\` — in any panel, at any severity.${
  hasImage
    ? ''
    : ' This review executed every query with the same two mechanisms, so the row counts and samples above already reflect correct time filtering.'
}
- Absence of an explicit \`WHERE\` clause on the time field — covered by the same range filter.
- Panels intentionally without a title (metric, gauge, tagcloud, waffle) — per the title rules above.`;

const dataDefectChecklist = `- execution errors, or a query returning 0 rows (the panel renders empty)
- an all-zero metric or all-zero numeric column
- null or empty-string values in a column used as a category, breakdown, or axis (\`top_values\` containing null, or a high \`null_share\`) — Lens renders these as a "(blank)" bucket; suggest excluding them in the query (e.g. \`WHERE field IS NOT NULL\`) or labelling them via \`COALESCE\` when they carry meaning. When the "(blank)" bucket is the largest or a dominant category, the chart is actively misleading — report it as \`critical\`; otherwise \`warning\`
- a panel \`title\` that duplicates what the chart already renders inside itself — e.g. a metric/gauge/tagcloud/waffle panel whose title restates the metric label or value column shown by the chart. The title rules say to omit the title on these chart types; report as \`warning\` with the suggestion to remove the title`;

const screenshotDefectChecklist = `- a panel that renders an error, "No results", or an empty chart in the screenshot
- a metric or chart whose rendered values are all zero
- a "(blank)" or null category bucket visible in a chart or its legend — suggest excluding nulls in the query (e.g. \`WHERE field IS NOT NULL\`) or labelling them via \`COALESCE\` when they carry meaning. When the "(blank)" bucket is the largest or a dominant category, the chart is actively misleading — report it as \`critical\`; otherwise \`warning\`
- a panel \`title\` that duplicates what the chart already renders inside itself — e.g. a metric/gauge/tagcloud/waffle panel whose title restates the metric label or value column shown by the chart. The title rules say to omit the title on these chart types; report as \`warning\` with the suggestion to remove the title
- visual readability defects only pixels reveal: overlapping or truncated labels, an illegible or overcrowded legend, axis scales that hide the signal, panels rendered too small for their content`;

const screenshotSection = `## Rendered Screenshot

A screenshot of the rendered dashboard is attached as an image. Panel queries were NOT re-executed for this review — judge data-dependent defects (empty panels, errors, blank buckets, readability) from the rendered pixels, and use the panel information below to map what you see to the correct panel ids.`;

const auditSeverityGuidance = `Use severity:
- critical: the dashboard is broken or actively misleading (query error, empty or all-zero results, a chart that misrepresents its data)
- warning: an objective violation of the rules above that degrades correctness, readability, or consistency for a viewer
- suggestion: concrete polish that moves the dashboard closer to the authoring rules`;

/**
 * Single-pass judge prompt used for scope "recent_changes": high-precision
 * self-review of freshly generated content.
 */
export const buildSinglePassJudgePrompt = (
  dashboardData: DashboardAttachmentData,
  panelFacts: PanelFacts[],
  focus: string | undefined,
  maxFindings: number,
  hasImage: boolean = false
): string => `You are a Kibana dashboard quality reviewer. Your job is to evaluate the dashboard below against the rules it was authored with, considering all panels together as a whole.

${dashboardDesignReviewPrompt}

---

## Chart Type Reference

Each panel's chart type should fit the intent and shape of its data.

${getChartTypeSelectionPromptContent()}

---

${buildChartAuthoringRulesSection(panelFacts, 'context')}

---

## Dashboard to Review

${buildDashboardSummary(dashboardData)}

${
  hasImage
    ? `${screenshotSection}

## Panel Map

${buildPanelMapText(dashboardData, panelFacts)}`
    : `## Panel Facts

${buildPanelFactsText(dashboardData, panelFacts)}`
}

${focus ? `## Review Focus\n\n${focus}\n\n` : ''}## Instructions

Review the dashboard holistically against the design review criteria above, plus cross-panel consistency (units, color semantics) that the criteria do not enumerate.

For each panel consider: does the data make sense for the stated intent, and are the chart type and configuration appropriate for the data shape?

${
  hasImage
    ? `Always check each panel's rendered appearance in the attached screenshot for these defects — they are real findings, not judgment calls:
${screenshotDefectChecklist}`
    : `Always check each panel's execution facts for these data defects — they are real findings, not judgment calls:
${dataDefectChecklist}`
}

Also check — report only when objectively verifiable from the ${
  hasImage ? 'screenshot or the panel information' : 'facts'
} above:
- near-duplicate panels: queries that are identical or trivially different, or panels answering the same question
- the same measure or field formatted with different units or number formats across panels
- time bucketing that yields a single bucket or hundreds of buckets in the executed results
- a breakdown cardinality too high for the chart type (e.g. a pie or legend with far more categories than fit legibly)
- a panel title that contradicts what its query computes
- controls whose field appears in no panel query, or duplicate controls
- empty or single-panel sections
- a missing or placeholder dashboard title or description

You are a high-precision reviewer: your findings trigger automated fixes and user-facing follow-ups, so every false positive has a real cost. Report a finding ONLY when you are confident it describes a real, observable defect — grounded in the panel facts above (an error, a data shape that contradicts the config, an objectively invalid config value) — and fixing it would materially change what a viewer sees or understands. Do NOT report:
- stylistic preferences, alternative phrasings of titles/descriptions, or "could also" ideas (a title duplicating the chart's own rendered label is NOT phrasing — it is on the checklist above)
- hypothetical concerns not evidenced by the executed results (e.g. "might be slow on larger data")
- deviations from the guidelines that could plausibly be intentional
- duplicate findings — if one root cause affects several panels, report it once, listing every affected panel id in \`panel_ids\`

When in doubt, omit the finding. Zero findings is a valid and expected outcome for a well-composed dashboard.

Report up to ${maxFindings} findings, prioritising by impact. Use severity:
- critical: the dashboard is broken or actively misleading (query error, all-zero metric, wrong chart type that inverts the meaning)
- warning: a real defect that noticeably degrades correctness or readability for a viewer (e.g. a legend so crowded the chart is unreadable, a number format that misstates units)
- suggestion: a concrete, high-value improvement — not routine polish

For each finding, provide a concrete suggestion in plain prose describing what to change, and set \`panel_ids\` to the affected panel id(s) for panel-scope findings.

${buildNonIssuesSection(hasImage)}`;

/**
 * Per-panel batch prompt for the full-audit fan-out: each panel is judged in
 * isolation against the authoring rules, with full enforcement.
 */
export const buildPanelBatchPrompt = (
  batch: PanelFacts[],
  maxFindings: number
): string => `You are a Kibana dashboard panel reviewer. The user asked to improve this dashboard, so review each panel below against the authoring rules with full enforcement: any deviation that is objectively verifiable from the config or the executed results is a finding. The yardstick: would Kibana's dashboard generation flow have produced this panel?

## Chart Type Reference

Each panel's chart type should fit the intent and shape of its data:

${getChartTypeSelectionPromptContent()}

---

${buildChartAuthoringRulesSection(batch, 'enforce')}

---

## Panels to Review

${batch.map((panel) => buildPanelFactText(panel, '', 'Grid')).join('\n\n')}

## Instructions

Judge each panel independently. For every panel, check:

Data defects — always findings, not judgment calls:
${dataDefectChecklist}

Configuration against the rules above:
- chart type fit: is this the right chart type for the shape of the executed results?
- time bucketing that yields a single bucket or hundreds of buckets
- breakdown cardinality too high for the chart type (e.g. a pie or legend with far more categories than fit legibly)
- titles: missing where the chart type needs one (xy, heatmap, pie, datatable), or contradicting what the query computes
- number formats that misstate the data (durations, bytes, percentages)
- explicit colors that violate the palette reference, when one is included above

Report only per-panel findings for the panels listed above, setting \`panel_ids\` to the affected panel id and \`scope\` to "panel". Do NOT report cross-panel concerns (redundancy between panels, consistency across panels, layout, ordering, sections, controls, dashboard metadata) — a separate pass covers those.

${auditSeverityGuidance}

Zero findings for a clean panel is expected. Report up to ${maxFindings} findings, prioritising by impact, with a concrete suggestion in plain prose for each.

${buildNonIssuesSection(false)}`;

/**
 * Holistic pass for the full-audit fan-out: cross-panel and dashboard-level
 * review over compact panel digests, plus the overall assessment.
 */
export const buildHolisticAuditPrompt = (
  dashboardData: DashboardAttachmentData,
  panelFacts: PanelFacts[],
  focus: string | undefined,
  maxFindings: number
): string => `You are a Kibana dashboard quality reviewer. The user asked to improve this dashboard, so review it with full enforcement of the design rules: any deviation that is verifiable from the information below is a finding. The yardstick: would Kibana's dashboard generation flow have produced this dashboard?

${dashboardDesignReviewPrompt}

---

## Dashboard to Review

${buildDashboardSummary(dashboardData)}

## Panel Digest

${buildPanelDigestsText(dashboardData, panelFacts)}

${focus ? `## Review Focus\n\n${focus}\n\n` : ''}## Instructions

Report only cross-panel and dashboard-level findings — per-panel data and configuration defects are covered by a separate pass. Check:

- near-duplicate panels: queries that are identical or trivially different, or panels answering the same question with no added insight
- the same measure or field formatted with different units or number formats across panels (compare the \`Value formats\` lines and query columns)
- inconsistent title style across panels (casing, naming pattern)
- layout defects and composition problems, per the design review criteria above
- section hygiene: empty or single-panel sections, overview KPIs hidden inside collapsed sections
- controls whose field appears in no panel query, or duplicate controls
- a missing or placeholder dashboard title or description

Group findings by root cause: one finding per cause, listing every affected panel id in \`panel_ids\` (use \`scope\` "dashboard" for findings about the dashboard as a whole).

${auditSeverityGuidance}

Report up to ${maxFindings} findings, prioritising by impact, with a concrete suggestion in plain prose for each. Also provide an \`overall_assessment\` summarising the state of the dashboard in a few sentences.

## Non-Issues — never report these

- Time filtering with \`?_tstart\`/\`?_tend\`: Kibana ALWAYS applies the dashboard time range to every panel via a Query DSL range filter on the panel's time field, independent of the query text. NEVER report a missing, partial, or "inconsistent" use of \`?_tstart\`/\`?_tend\` — in any panel, at any severity.
- Absence of an explicit \`WHERE\` clause on the time field — covered by the same range filter.
- Panels without a title where the chart renders its own label (metric, gauge, tagcloud, waffle).`;

/**
 * Single-call visual audit used for scope "full_audit" when a rendered
 * screenshot is available: per-panel and cross-panel checks run in one pass,
 * judging rendered defects from the image instead of executed data facts.
 */
export const buildVisualAuditPrompt = (
  dashboardData: DashboardAttachmentData,
  panelFacts: PanelFacts[],
  focus: string | undefined,
  maxFindings: number
): string => `You are a Kibana dashboard quality reviewer. The user asked to improve this dashboard, so review it with full enforcement of the design rules: any deviation that is verifiable from the attached screenshot or the panel information below is a finding. The yardstick: would Kibana's dashboard generation flow have produced this dashboard?

${dashboardDesignReviewPrompt}

---

## Chart Type Reference

Each panel's chart type should fit the intent and shape of its data.

${getChartTypeSelectionPromptContent()}

---

${buildChartAuthoringRulesSection(panelFacts, 'visual')}

---

## Dashboard to Review

${buildDashboardSummary(dashboardData)}

${screenshotSection}

## Panel Map

${buildPanelMapText(dashboardData, panelFacts)}

${focus ? `## Review Focus\n\n${focus}\n\n` : ''}## Instructions

Review every panel and the dashboard as a whole in a single pass.

Rendered defects — always findings, not judgment calls:
${screenshotDefectChecklist}

Per-panel checks against the rules above — judged from the rendered result:
- chart type fit: is this the right chart type for the intent and the rendered data?
- time bucketing that renders a single bucket or hundreds of buckets
- breakdown cardinality too high for the chart type (e.g. a pie or legend with far more categories than fit legibly)
- titles: missing where the chart type needs one (xy, heatmap, pie, datatable), or contradicting what the chart shows
- rendered number formats that misstate the data (durations, bytes, percentages)

Cross-panel and dashboard-level checks:
- near-duplicate panels: panels that visibly show the same data or answer the same question with no added insight
- the same measure rendered with different units or number formats across panels
- inconsistent title style across panels (casing, naming pattern)
- layout defects and composition problems, per the design review criteria above — verify against the screenshot
- section hygiene: empty or single-panel sections, overview KPIs hidden inside collapsed sections
- duplicate controls
- a missing or placeholder dashboard title or description

Group findings by root cause: one finding per cause, listing every affected panel id in \`panel_ids\` (use \`scope\` "dashboard" for findings about the dashboard as a whole).

${auditSeverityGuidance}

Report up to ${maxFindings} findings, prioritising by impact, with a concrete suggestion in plain prose for each. Also provide an \`overall_assessment\` summarising the state of the dashboard in a few sentences.

${buildNonIssuesSection(true)}`;
