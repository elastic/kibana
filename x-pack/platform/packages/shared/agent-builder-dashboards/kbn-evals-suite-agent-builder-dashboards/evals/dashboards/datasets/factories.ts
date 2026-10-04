/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { platformCoreTools } from '@kbn/agent-builder-common';
import type {
  ControlsGold,
  DashboardDatasetExample,
  DashboardRoute,
  DashboardStructureGold,
  EnhanceMode,
} from '../../../src/evaluate_dataset';
import { getDefectScope } from '../../../src/evaluators/seed_defects';
import { GENERATE_DASHBOARD_TOOL_ID } from '../../../src/extract_dashboard';
import { DISSECT_LOGS_RESULTS } from '../../../src/fixtures/dissect_logs_results';
import {
  MESSY_LOGS_DASHBOARD,
  MESSY_LOGS_DASHBOARD_DEFECTS,
} from '../../../src/fixtures/messy_logs_dashboard';
import { SAMPLE_LOGS_MAPPED_FIELDS } from '../../../src/fixtures/sample_logs_fields';

/** Slicing keys stored on every example so golden-cluster results can be split by behaviour. */
export interface ExampleMetadata {
  behaviour: 'creation' | 'routing' | 'enhance' | 'discover_results';
  /** `logs_dissect` is the sample logs index read through a `DISSECT` query attached from Discover. */
  dataSource: 'logs' | 'logs_dissect';
  enhanceMode?: EnhanceMode;
  [key: string]: unknown;
}

/** A dashboard request; `structure` holds only what the prompt pins down. */
export const dashboardExample = ({
  question,
  structure,
}: {
  question: string;
  structure: DashboardStructureGold;
}): DashboardDatasetExample => ({
  input: { question },
  metadata: { behaviour: 'creation', dataSource: 'logs' } satisfies ExampleMetadata,
  output: {
    route: 'dashboard',
    structure,
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
