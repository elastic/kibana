/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getChartTypeSelectionPromptContent } from '@kbn/agent-builder-visualizations-server';
import { dashboardTools } from '../../../common';
import type { DashboardGuidanceModule } from '../guidance_module';
import { dashboardDesignGuidancePrompt } from './design';
import {
  panelEditingReference,
  PANEL_EDITING_REFERENCE_NAME,
  PANEL_EDITING_REFERENCE_PATH,
} from './panel_editing_reference';

const chartTypeSelectionGuidance = getChartTypeSelectionPromptContent();

const guidance = `## Building a Dashboard

The ${dashboardTools.generateDashboard} tool builds the resulting dashboard from the current dashboard (if any) plus an ordered \`operations\` array. The operation schemas describe the mechanics; this section is about what makes a dashboard worth looking at.

For a new dashboard, start with \`set_metadata\`, then create the panels. \`add_panels\` can create all of them in one operation, and \`add_section\` can create a section together with its initial panels — reach for a follow-up \`add_panels\` with \`sectionId\` only when targeting a section that already exists.

For an existing dashboard, prefer \`edit_panels\` to change panel content in place and \`update_panel_layouts\` to resize or move panels, rather than removing and re-adding them.

**Read [${PANEL_EDITING_REFERENCE_NAME}.md](${PANEL_EDITING_REFERENCE_PATH}/${PANEL_EDITING_REFERENCE_NAME}.md) before any \`edit_panels\` call.** Not every panel can be edited in place, and the ones that cannot need the user's confirmation first.

## Panel Inputs

Every new panel comes from one of two sources, and picking the wrong one is the most common way to produce a broken panel:

- \`source: "request"\` resolves a Lens or Vega visualization from a natural-language query. This is how new visualizations are made — the tool generates and validates the ES|QL for you.
- \`source: "config"\` takes content you have already resolved: an existing visualization's config read from an attachment, or markdown you are authoring. The tool never reads an attachment or saved-object store itself, so the config has to be passed by value.

## Chart Type Guidance

${chartTypeSelectionGuidance}

For every new Lens panel, choose and pass \`chartType\`. For a new Vega panel it is an optional authoring hint — omit it when no Lens chart type represents the requested visualization. When editing a Lens panel, omit \`chartType\` to preserve its current chart family, and provide a new \`chartType\` when the request changes the chart family, such as from \`xy\` to \`pie\`.

${dashboardDesignGuidancePrompt}

## Controls

Controls are interactive filters pinned above the dashboard that let users explore without editing queries. Add them with \`add_controls\` and remove them with \`remove_controls\`.

A new dashboard usually deserves a few \`options_list_control\` dropdowns for the categorical fields a reader would actually filter by — typically the low-cardinality keyword fields that already appear in panel \`BY\` and \`WHERE\` clauses, such as \`service.name\`, \`host.name\`, or \`region\`. High-cardinality identifiers like trace or request IDs make useless dropdowns. A dashboard already scoped to a single entity, such as one host or one service, does not need controls at all.

The other two types are situational: \`range_slider_control\` for a numeric threshold worth filtering across several panels, and \`time_slider_control\` for narrowing time within the dashboard's global range.`;

/**
 * Environment-agnostic dashboard *generation* guidance.
 *
 * The `guidance` describes how to build a dashboard, including the detailed design guidance
 * (composition + panel layout) inlined directly. It deliberately says nothing about how the
 * current dashboard is referenced or how the result is returned/surfaced. Those are
 * environment-specific and avoided here so the block can be reused across environments. Pair it with
 * an environment-specific rendering guidance block (e.g. the Kibana one) that explains how the
 * generated dashboard is surfaced.
 *
 * Panel editing details live in `referencedContent`. The body tells the agent to read that file
 * before any `edit_panels` call, so it is loaded on edit requests only.
 */
export const dashboardGeneration: DashboardGuidanceModule = {
  guidance,
  referencedContent: [panelEditingReference],
};
