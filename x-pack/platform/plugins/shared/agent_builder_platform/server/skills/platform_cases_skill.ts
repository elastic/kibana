/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Skill } from '@kbn/onechat-common/skills';
import { platformCoreTools } from '@kbn/onechat-common';
import { createToolProxy } from './utils/create_tool_proxy';

export const PLATFORM_CASES_SKILL: Skill = {
  namespace: 'platform.cases',
  name: 'Platform Cases',
  description: 'Work with cases across solutions (Security, Observability, Stack Management)',
  content: `# Platform Cases

## What this skill does
Helps you find and summarize cases across Kibana solutions and (when explicitly requested) create updates via the Cases APIs.

## Tools and operations
- Use \`${platformCoreTools.cases}\` to:\n
  - get a case by id\n
  - find cases by alert ids\n
  - search cases (optionally filtered by owner)\n

## Inputs to ask the user for
- If narrowing scope: \`owner\` (securitySolution / observability / cases)\n
- If retrieving: \`caseId\`\n
- If searching: time range, search text, status/severity\n

## Notes
- Prefer read-only use unless the user explicitly asks for modifications.\n
`,
  tools: [createToolProxy({ toolId: platformCoreTools.cases })],
};



