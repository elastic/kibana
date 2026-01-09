/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Skill } from '@kbn/onechat-common/skills';

export const ML_DATA_FRAME_ANALYTICS_SKILL: Skill = {
  namespace: 'ml.data_frame_analytics',
  name: 'ML Data Frame Analytics',
  description: 'Explain DFA jobs, configs, and results (guidance)',
  content: `# ML Data Frame Analytics

## What this skill does
Provides read-only guidance for data frame analytics: what each analysis type does, common configuration fields, and how to interpret results.

## When to use
- The user asks about DFA jobs, training/inference results, or job configuration.\n
- You need to diagnose why results are missing (job not started, destination index issues, permissions).\n

## Guardrails
- Do not delete jobs.\n
- Do not stop/close jobs.\n
`,
  tools: [],
};



