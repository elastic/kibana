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
import { dashboardTools } from '../../../common';
import type { DashboardGuidanceModule } from '../guidance_module';
import { ENHANCE_GUIDANCE_PATH, enhanceGuidanceReference } from './enhance_guidance';

const chartTypeSelectionGuidance = getChartTypeSelectionPromptContent();

const guidance = `## Dashboard Changes

The ${dashboardTools.generateDashboard} tool applies the changes you describe to the current dashboard (if any). Its tool and field descriptions say what each field means and how to compose a dashboard: which content to cover, when to use sections, which panel kind to pick, which controls to add, and how to edit panels. This skill adds how to use the tool in Agent Builder. See the environment workflow below for how the current dashboard is referenced and how the result is surfaced.

## Improving an Existing Dashboard (Enhance)

When asked to enhance, improve, or clean up an existing dashboard, read \`${ENHANCE_GUIDANCE_PATH}\` with \`read_file\` before inspecting the dashboard or calling any other tool. Follow that file. It takes precedence over the create-dashboard guidance in this skill. Do not enhance without reading it.

## Panels in Agent Builder

- Use \`source: "attachment"\` to place a visualization that \`${platformCoreTools.createVisualization}\` already returned in this conversation. A \`source: "request"\` would generate a **new**, different panel instead.
- When the user asks to change a DSL-based, form-based, or other non-ES|QL Lens panel, say that it cannot be edited, propose replacing it with a new ES|QL-based Lens panel, and wait for explicit confirmation before replacing it.

## ES|QL

Omit \`esql\` on Lens and Vega panels unless the query came from \`${platformCoreTools.generateEsql}\` or the user pasted it: their query is generated from \`query\`. A custom content panel that shows live data needs \`esql\`: build it with \`${platformCoreTools.generateEsql}\`, or use one the user supplied verbatim. If Elasticsearch rejects it, the panel fails with the reason; correct the query and retry.

## Chart Type Guidance

Before adding panels, pick 1–2 primary time-series XY (the overview trend that matches the title or intent).
On a new dashboard, phrase at least one and at most two of those primary time-series XY queries as "<measure> over time, show avg/min/max in the legend" (e.g. "log volume over time, show avg/min/max in the legend"). Skip categorical bar charts and queries whose measure is already AVG/MIN/MAX of a field.

${seriesStatisticsAgentGuidance}

${chartTypeSelectionGuidance}`;

/**
 * Environment-agnostic dashboard *generation* guidance.
 *
 * The `guidance` adds what the generation tool's own descriptions do not carry: the enhance
 * workflow, reuse of existing visualizations, confirmation before replacing a panel, which Agent
 * Builder tools build ES|QL, and chart type selection. It deliberately says nothing about how the
 * current dashboard is referenced or how the result is returned/surfaced. Those are
 * environment-specific and avoided here so the block can be reused across environments. Pair it with
 * an environment-specific rendering guidance block (e.g. the Kibana one) that explains how the
 * generated dashboard is surfaced.
 */
export const dashboardGeneration: DashboardGuidanceModule = {
  guidance,
  referencedContent: [enhanceGuidanceReference],
};
