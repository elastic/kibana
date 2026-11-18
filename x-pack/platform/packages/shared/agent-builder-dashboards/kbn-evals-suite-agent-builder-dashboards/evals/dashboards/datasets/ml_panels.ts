/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { randomBytes } from 'crypto';
import type { DashboardDatasetExample } from '../../../src/types';
import { mlPanelExample } from './factories';

/**
 * ML anomaly panels. Their config schemas are not in the `generate_dashboard` tool schema, so
 * the agent has to read each type's reference before writing it. The spec creates these jobs
 * so the panels render without a "No known job" error. ML jobs are cluster-global, so the IDs
 * carry a per-run suffix: the run never touches, and cleans up only, the jobs it created.
 */
const RUN_SUFFIX = randomBytes(4).toString('hex');
export const ML_PANEL_JOB_IDS = [
  `eval-web-traffic-anomalies-${RUN_SUFFIX}`,
  `eval-cpu-usage-anomalies-${RUN_SUFFIX}`,
] as const;

export const DASHBOARD_ML_PANEL_EXAMPLES: DashboardDatasetExample[] = [
  mlPanelExample({
    question: `Create a dashboard with an anomaly swim lane and anomaly charts for the anomaly detection job "${ML_PANEL_JOB_IDS[0]}".`,
    panelConfigTypes: ['ml_anomaly_swimlane', 'ml_anomaly_charts'],
  }),
  mlPanelExample({
    question: `Create a dashboard with a single metric viewer for the anomaly detection job "${ML_PANEL_JOB_IDS[1]}".`,
    panelConfigTypes: ['ml_single_metric_viewer'],
  }),
];
