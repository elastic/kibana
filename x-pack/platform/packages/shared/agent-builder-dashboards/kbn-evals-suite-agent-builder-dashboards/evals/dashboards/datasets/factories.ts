/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { platformCoreTools } from '@kbn/agent-builder-common';
import type { ScreenContextAttachmentData } from '@kbn/agent-builder-common/attachments';
import type { DashboardAttachmentData } from '@kbn/agent-builder-dashboards-common';
import type {
  ControlsGold,
  DashboardDatasetExample,
  DashboardRoute,
  DashboardStructureGold,
  EnhanceMode,
  LayoutEditGold,
  PanelEditGold,
  ReplaceConfirmationGold,
  UnavailableRequestGold,
  VisualizationAttachment,
} from '../../../src/types';
import { getDefectScope } from '../../../src/evaluators/seed_defects';
import { GENERATE_DASHBOARD_TOOL_ID } from '../../../src/extract_dashboard';
import { DISSECT_LOGS_RESULTS } from '../../../src/fixtures/dissect_logs_results';
import {
  MESSY_LOGS_DASHBOARD,
  MESSY_LOGS_DASHBOARD_DEFECTS,
} from '../../../src/fixtures/messy_logs_dashboard';
import { SAMPLE_LOGS_MAPPED_FIELDS } from '../../../src/fixtures/sample_logs_fields';
import { SECTIONED_LOGS_DASHBOARD } from '../../../src/fixtures/sectioned_logs_dashboard';

/** Slicing keys stored on every example so golden-cluster results can be split by behaviour. */
export interface ExampleMetadata {
  behaviour:
    | 'creation'
    | 'routing'
    | 'enhance'
    | 'discover_results'
    | 'layout_edit'
    | 'edit_scenario';
  /** `logs_dissect` is the sample logs index read through a `DISSECT` query attached from Discover. */
  dataSource: 'logs' | 'logs_dissect';
  enhanceMode?: EnhanceMode;
  [key: string]: unknown;
}

/**
 * The data-aware default for `kibana_sample_data_logs`. The sample data spans
 * install time -10d to +50d, so it reads as live data and gets the 1-day window.
 */
export const SAMPLE_LOGS_DEFAULT_TIME_RANGE = { from: 'now-24h', to: 'now' } as const;

/** A home page screen context, whose time range a request that names no window must ignore. */
export const HOME_SCREEN_CONTEXT: ScreenContextAttachmentData = {
  app: 'home',
  url: '/app/home#/',
  // Deliberately improbable value: it never occurs as a default or a real picker choice.
  time_range: { from: 'now-37m', to: 'now-3m' },
};

/**
 * A dashboard request; `structure` holds only what the prompt pins down. No
 * prompt names a time window, so every dashboard must get the data-aware
 * default, with or without a `screenContext`.
 */
export const dashboardExample = ({
  question,
  structure,
  screenContext,
}: {
  question: string;
  structure: DashboardStructureGold;
  screenContext?: ScreenContextAttachmentData;
}): DashboardDatasetExample => ({
  input: { question, ...(screenContext ? { screenContext } : {}) },
  metadata: { behaviour: 'creation', dataSource: 'logs' } satisfies ExampleMetadata,
  output: {
    route: 'dashboard',
    structure,
    timeRange: SAMPLE_LOGS_DEFAULT_TIME_RANGE,
    goldenToolPath: ['load_skill', GENERATE_DASHBOARD_TOOL_ID],
  },
});

/** A request that must not become a dashboard. */
export const routingExample = ({
  question,
  route,
}: {
  question: string;
  route: Exclude<DashboardRoute, 'dashboard'>;
}): DashboardDatasetExample => ({
  input: { question },
  metadata: { behaviour: 'routing', dataSource: 'logs' } satisfies ExampleMetadata,
  output: { route },
});

/**
 * A dashboard request nothing of which the data can back. The dashboard skill
 * loads, but no dashboard may be written, and the reply names each request.
 */
export const unavailableDashboardExample = ({
  question,
  unavailableRequests,
}: {
  question: string;
  unavailableRequests: readonly UnavailableRequestGold[];
}): DashboardDatasetExample => ({
  input: { question },
  metadata: { behaviour: 'routing', dataSource: 'logs' } satisfies ExampleMetadata,
  output: { route: 'dashboard', noDashboard: true, unavailableRequests },
});

/**
 * Enhance request over the seeded messy logs dashboard. The mode is answered
 * with `mode` if the agent asks; the gold defects are the seeded ones `mode`
 * may fix, since appearance mode must leave the duplicate panel and missing
 * controls alone.
 */
export const enhanceExample = ({
  question,
  mode,
  asksMode,
}: {
  question: string;
  mode: EnhanceMode;
  asksMode: boolean;
}): DashboardDatasetExample => ({
  input: { question, dashboard: MESSY_LOGS_DASHBOARD, modeAnswer: mode },
  metadata: {
    behaviour: 'enhance',
    dataSource: 'logs',
    enhanceMode: mode,
  } satisfies ExampleMetadata,
  output: {
    route: 'dashboard',
    enhance: {
      mode,
      asksMode,
      defects: MESSY_LOGS_DASHBOARD_DEFECTS.filter(
        (rule) => mode === 'content' || getDefectScope(rule) === 'appearance'
      ),
    },
    // Content mode changes queries, so it reads the mapping before writing.
    // Appearance mode changes no query, so reading the attachment is enough.
    goldenToolPath:
      mode === 'content'
        ? ['load_skill', platformCoreTools.getIndexMapping, GENERATE_DASHBOARD_TOOL_ID]
        : ['load_skill', GENERATE_DASHBOARD_TOOL_ID],
  },
});

/**
 * Bare enhance request over the seeded messy logs dashboard, where the user
 * answers the mode question with free text that names specific charts. The
 * agent edits only those charts, with the default presentation applied to them.
 */
export const scopedEnhanceExample = ({
  question,
  answer,
  panelIds,
}: {
  question: string;
  answer: string;
  panelIds: string[];
}): DashboardDatasetExample => ({
  input: { question, dashboard: MESSY_LOGS_DASHBOARD, modeAnswer: { text: answer } },
  metadata: { behaviour: 'enhance', dataSource: 'logs' } satisfies ExampleMetadata,
  output: {
    route: 'dashboard',
    scopedEnhance: { panelIds },
    goldenToolPath: ['load_skill', GENERATE_DASHBOARD_TOOL_ID],
  },
});

/**
 * Dashboard request over Discover ES|QL results that parse the sample logs
 * with `DISSECT`, attached the way the "AI Agent" action attaches them. The
 * derived columns are not mapped on the index, so controls may only use
 * mapped fields. The agent reads the attachment rather than the mapping, so
 * the trajectory is the same as a plain creation request.
 */
export const discoverResultsExample = ({
  question,
  controls,
  structure,
}: {
  question: string;
  controls: Omit<ControlsGold, 'mappedFields'>;
  structure?: DashboardStructureGold;
}): DashboardDatasetExample => ({
  input: { question, esqlResults: DISSECT_LOGS_RESULTS },
  metadata: { behaviour: 'discover_results', dataSource: 'logs_dissect' } satisfies ExampleMetadata,
  output: {
    route: 'dashboard',
    ...(structure ? { structure } : {}),
    controls: { mappedFields: SAMPLE_LOGS_MAPPED_FIELDS, ...controls },
    goldenToolPath: ['load_skill', GENERATE_DASHBOARD_TOOL_ID],
  },
});

/**
 * A request that adds, removes, moves or edits panels of the seeded sectioned
 * logs dashboard. `layoutEdit` names the containers the edit may rearrange
 * and where the prompt puts things; the other gold covers what else the
 * prompt asks of the edit. `visualizations` are charts the agent created
 * earlier in the conversation. `edit_scenario` tags the edits beyond moving
 * ES|QL panels.
 */
export const layoutEditExample = ({
  question,
  controls,
  visualizations,
  dashboard = SECTIONED_LOGS_DASHBOARD,
  behaviour = 'layout_edit',
  ...gold
}: {
  question: string;
  layoutEdit?: LayoutEditGold;
  panelEdits?: readonly PanelEditGold[];
  structure?: DashboardStructureGold;
  controls?: Omit<ControlsGold, 'mappedFields'>;
  replaceConfirmation?: ReplaceConfirmationGold;
  unavailableRequests?: readonly UnavailableRequestGold[];
  visualizations?: readonly VisualizationAttachment[];
  dashboard?: DashboardAttachmentData;
  behaviour?: 'layout_edit' | 'edit_scenario';
}): DashboardDatasetExample => ({
  input: { question, dashboard, ...(visualizations ? { visualizations } : {}) },
  metadata: { behaviour, dataSource: 'logs' } satisfies ExampleMetadata,
  output: {
    route: 'dashboard',
    ...gold,
    ...(controls ? { controls: { mappedFields: SAMPLE_LOGS_MAPPED_FIELDS, ...controls } } : {}),
    // A replace confirmation ends without a write, and Trajectory skips it.
    ...(gold.replaceConfirmation
      ? {}
      : { goldenToolPath: ['load_skill', GENERATE_DASHBOARD_TOOL_ID] }),
  },
});
