/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { platformCoreTools } from '@kbn/agent-builder-common';
import {
  getChartTypeSelectionPromptContent,
  seriesStatisticsAgentGuidance,
} from '@kbn/agent-builder-visualizations-server';
import {
  buildControlsGuidance,
  buildPanelTypeSelectionGuidance,
  formatPanelKindLabels,
} from '@kbn/dashboard-authoring';
import { dashboardTools } from '../../../common';
import type { DashboardGuidanceModule } from '../guidance_module';
import { dashboardCompositionPrompt } from './design/composition';
import { ENHANCE_DASHBOARD_REFERENCE_NAME, enhanceDashboardReference } from './enhance_guidance';

const chartTypeSelectionGuidance = getChartTypeSelectionPromptContent();
const requestPanelKinds = formatPanelKindLabels('request');
const configPanelKinds = formatPanelKindLabels('config');

const guidance = `## Dashboard Changes

The ${
  dashboardTools.generateDashboard
} tool applies the changes you describe to the current dashboard (if any). Describe the desired result, keyed by id, rather than steps: \`set\` for metadata, \`sections\` and \`panels\` to create or update, \`controls\` to add, \`remove\` for ids to delete, and \`layout\` for the user's layout instructions. Everything you leave out stays unchanged. See the environment workflow below for how the current dashboard is referenced and how the result is surfaced.

## Improving an Existing Dashboard (Enhance)

When asked to enhance, improve, or clean up a dashboard, first read the referenced file \`${ENHANCE_DASHBOARD_REFERENCE_NAME}.md\` and follow its workflow. It takes precedence over guidance for creating dashboards.

## Describing Changes

The tool schema describes each field. The rules below cover what the schema cannot express.

Make all changes in a single ${
  dashboardTools.generateDashboard
} call whenever possible. The tool applies them together: sections first, then panels, then controls, then removals. Place panels in a new section in the same call that creates it.

For an existing dashboard:
- Edit a panel by its id with \`content\` of the same kind rather than removing and re-adding it. Reorganizing or enhancing a dashboard does not require replacing panels. Edits work for ${requestPanelKinds} panels (\`source: "request"\` with the panel's \`renderer\`), and for ${configPanelKinds} panels (\`source: "config"\` with the panel's \`type\`).
- For focused edits, pass only the requested change in the \`query\` (e.g. "make the error series blue"). The chart author preserves unrelated presentation settings.
- DSL-based, form-based, and other non-ES|QL Lens panels cannot be edited. When the user asks to change one, say so, propose replacing it with a new ES|QL-based Lens panel, and wait for explicit confirmation before replacing it.

## Panel Content

Each visualization request is authored in a separate context. New-panel authors do not see the dashboard attachment or other panels, so describe the measure, fields, and filters in \`query\`. Edits of existing panels receive the original configuration and queries automatically through the panel id.

- Use \`source: "request"\` to create or edit a ${requestPanelKinds} panel from a natural-language query — this is the only way to make a **new** generated panel.
- Use \`source: "attachment"\` to place a visualization that \`${
  platformCoreTools.createVisualization
}\` already returned in this conversation. A \`source: "request"\` would generate a **new**, different panel instead.
- Use \`source: "config"\` for panels you author by value: ${configPanelKinds} panels.

## Panel Type Selection

Choose the first panel type that fits:

${buildPanelTypeSelectionGuidance()}

## Chart Type Guidance

Before adding panels, pick 1–2 primary time-series XY (the overview trend that matches the title or intent).
On a new dashboard, phrase at least one and at most two of those primary time-series XY queries as "<measure> over time, show avg/min/max in the legend" (e.g. "log volume over time, show avg/min/max in the legend"). Skip categorical bar charts and queries whose measure is already AVG/MIN/MAX of a field.

${seriesStatisticsAgentGuidance}

${chartTypeSelectionGuidance}

${dashboardCompositionPrompt}

${buildControlsGuidance()}`;

/**
 * Dashboard generation guidance. It says nothing about how the current dashboard is referenced or
 * how the result is surfaced. Grid rules are left to the tool's layout step.
 */
export const dashboardGeneration: DashboardGuidanceModule = {
  guidance,
  referencedContent: [enhanceDashboardReference],
};
