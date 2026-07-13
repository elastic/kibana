/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import type { ScopedModel } from '@kbn/agent-builder-server';
import {
  isSection,
  type AttachmentPanel,
  type DashboardAttachmentData,
} from '@kbn/agent-builder-dashboards-common';
import { SupportedChartType } from '@kbn/agent-builder-common/tools/tool_result';
import {
  getLensConfigGuidance,
  getVegaAuthoringGuidance,
} from '@kbn/agent-builder-visualizations-server';
import { VEGA_VIS_TYPE } from '@kbn/agent-builder-visualizations-common';
import { LENS_EMBEDDABLE_TYPE } from '@kbn/lens-common';
import { dashboardCompositionPrompt, gridLayoutPrompt } from './prompts/design';

export const critiqueFindingSchema = z.object({
  target: z
    .string()
    .optional()
    .describe('Panel or section id the finding refers to, when applicable.'),
  category: z
    .enum(['presentation', 'layout', 'composition', 'data'])
    .describe('The kind of improvement being recommended.'),
  issue: z.string().describe('What is wrong or falls short of the request.'),
  suggestion: z.string().describe('A concrete improvement the author should apply.'),
  requiresDataChange: z
    .boolean()
    .describe("Whether applying this finding requires changing an existing panel's ES|QL query."),
});

const critiqueResultSchema = z.object({
  findings: z
    .array(critiqueFindingSchema)
    .describe(
      'Improvements worth applying. Return an empty array when the dashboard fulfils the request well.'
    ),
});

export type CritiqueFinding = z.infer<typeof critiqueFindingSchema>;

const supportedChartTypes = new Set<string>(Object.values(SupportedChartType));

const getPanels = (dashboard: DashboardAttachmentData): AttachmentPanel[] =>
  dashboard.panels.flatMap((widget) => (isSection(widget) ? widget.panels : [widget]));

const getLensChartTypes = (panels: AttachmentPanel[]): SupportedChartType[] => {
  const chartTypes = panels.flatMap(({ type, config }) => {
    const chartType = config.type;
    return type === LENS_EMBEDDABLE_TYPE &&
      typeof chartType === 'string' &&
      supportedChartTypes.has(chartType)
      ? [chartType as SupportedChartType]
      : [];
  });

  return [...new Set(chartTypes)];
};

const createCritiqueSystemPrompt = (dashboard: DashboardAttachmentData): string => {
  const panels = getPanels(dashboard);
  const lensChartTypes = getLensChartTypes(panels);
  const hasLensPanels = panels.some(({ type }) => type === LENS_EMBEDDABLE_TYPE);
  const hasVegaPanels = panels.some(({ type }) => type === VEGA_VIS_TYPE);
  const visualizationGuidance = [
    hasLensPanels ? getLensConfigGuidance(lensChartTypes) : '',
    hasVegaPanels ? getVegaAuthoringGuidance() : '',
  ]
    .filter(Boolean)
    .join('\n\n');

  return `You are a critical reviewer helping an author prettify and improve an existing Kibana dashboard. You did not build the dashboard. Inspect the dashboard as a whole and inspect every panel with fresh eyes.

REVIEW CONTRACT:
- Review presentation, layout, composition, and data semantics. Return only concrete, actionable findings; do not invent requirements unrelated to the user's request or the dashboard's purpose.
- Existing working ES|QL queries should be preserved by default. Presentation-only changes must not change a query.
- Recommend changing an existing query only for a clear semantic defect, such as an aggregation or field that contradicts the panel's title or intended purpose. Explain that defect and set requiresDataChange to true.
- You may recommend adding, removing, or replacing panels when that materially improves a poor dashboard. Give a clear rationale for every such recommendation.
- Inspect non-ES|QL panels, but skip them without recommending modifications; the first version of prettify supports only ES|QL-backed panels.
- Use the panel or section id as target whenever a finding applies to a specific dashboard element. Omit target only for dashboard-wide findings.
- The author must later report material decisions such as additions, removals, replacements, query changes, and skipped work. Make the rationale in each material finding clear enough to relay to the user.
- An empty findings list is appropriate when the existing dashboard already serves its purpose well.

${dashboardCompositionPrompt}

${gridLayoutPrompt}
${
  visualizationGuidance
    ? `\n\n## Visualization Authoring Guidelines\n\n${visualizationGuidance}`
    : ''
}`;
};

export interface RunCritiqueParams {
  model: ScopedModel;
  /** The user's current natural-language request for the existing dashboard. */
  request: string;
  /** The full existing dashboard payload to inspect. */
  dashboard: DashboardAttachmentData;
}

/**
 * Fresh-eyes critique: a separate LLM call on a clean transcript (never the
 * authoring agent's message log), returning structured findings. Callers
 * treat the result as advisory.
 */
export const runCritique = async ({
  model,
  request,
  dashboard,
}: RunCritiqueParams): Promise<CritiqueFinding[]> => {
  const structuredModel = model.chatModel.withStructuredOutput(critiqueResultSchema, {
    name: 'report_dashboard_critique',
  });

  const response = await structuredModel.invoke([
    { role: 'system', content: createCritiqueSystemPrompt(dashboard) },
    {
      role: 'user',
      content: `The user asked for:\n${request}\n\nThe existing dashboard to critique:\n${JSON.stringify(
        dashboard,
        null,
        2
      )}`,
    },
  ]);

  return response.findings ?? [];
};
