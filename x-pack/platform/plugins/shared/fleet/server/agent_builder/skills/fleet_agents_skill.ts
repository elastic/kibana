/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { defineSkillType } from '@kbn/agent-builder-server/skills/type_definition';

export const FLEET_AGENTS_SKILL = defineSkillType({
  id: 'fleet.agents',
  name: 'agents',
  basePath: 'skills/fleet',
  description: 'Inspect agent status and troubleshoot enrollment/health (no unenroll)',
  content: `# Fleet Agents

## What this skill does
Helps you troubleshoot Fleet agent health and common states (offline, unhealthy, updating) in a read-heavy, safe way.

## When to use
- Agents are not sending data.\n
- An agent is unhealthy or stuck updating.\n

## Guardrails
- Do not unenroll agents.\n
- Do not delete agents or policies.\n
`,
});



