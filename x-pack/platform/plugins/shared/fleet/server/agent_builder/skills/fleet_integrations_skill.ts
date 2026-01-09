/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Skill } from '@kbn/onechat-common/skills';

export const FLEET_INTEGRATIONS_SKILL: Skill = {
  namespace: 'fleet.integrations',
  name: 'Fleet Integrations',
  description: 'Discover and manage integrations with guardrails',
  content: `# Fleet Integrations

## What this skill does
Helps you discover integrations/packages and provide safe install/upgrade guidance (guardrails-first).

## When to use
- The user asks “how do I onboard logs/metrics for X?”\n
- You need to identify the right integration package.\n

## Guardrails
- Avoid broad changes without explicit user confirmation.\n
`,
  tools: [],
};



