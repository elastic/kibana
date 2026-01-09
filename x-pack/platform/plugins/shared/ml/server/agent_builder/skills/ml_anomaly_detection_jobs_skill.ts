/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Skill } from '@kbn/onechat-common/skills';

export const ML_ANOMALY_DETECTION_JOBS_SKILL: Skill = {
  namespace: 'ml.jobs_anomaly_detection',
  name: 'ML Anomaly Detection Jobs',
  description: 'List jobs, interpret job state, and navigate results (guidance)',
  content: `# ML Anomaly Detection Jobs

## What this skill does
Provides read-only guidance for discovering anomaly detection jobs, understanding job health/state, and navigating results.

## When to use
- The user asks about anomaly detection jobs, their status, or how to interpret anomalies.\n
- You need to explain why anomalies are missing (job stopped, datafeed stopped, no data, permissions).\n

## Guardrails
- Do not stop/close jobs.\n
- Do not delete jobs.\n
`,
  tools: [],
};



