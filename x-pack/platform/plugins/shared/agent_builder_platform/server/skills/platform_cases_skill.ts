/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { defineSkillType } from '@kbn/agent-builder-server/skills/type_definition';

export const PLATFORM_CASES_SKILL = defineSkillType({
  id: 'platform.cases',
  name: 'cases',
  basePath: 'skills/platform',
  description: 'Work with cases across solutions (Security, Observability, Stack Management)',
  content: `# Platform Cases

## What this skill does
Helps you find and summarize cases across Kibana solutions and (when explicitly requested) create updates via the Cases APIs.

## Tools and operations
- Use \`platform.core.cases\` to:\n
  - get a case by id\n
  - find cases by alert ids\n
  - search cases (optionally filtered by owner)\n

## Response format (CRITICAL - STRICTLY ENFORCED)
After calling the tool, respond **ONLY with what the tool returned**. Do not add any other information.\n

1. If NO cases found: Say ONLY \"No cases found.\" or \"No [status/severity] cases found.\" STOP THERE. Do not explain what cases are.\n
2. If cases found: Start with count (e.g. \"Found N cases\"), then show a markdown table:\n
   - Case: use the tool result's \`markdown_link\` when present\n
   - Status, Severity\n
   - Tags (only if relevant to the question)\n
3. **NEVER add**:\n
   - Explanations of what cases are\n
   - Suggestions for next steps\n
   - Background information\n
   - Any information not in the tool results\n

## Inputs to ask the user for
- If narrowing scope: \`owner\` (securitySolution / observability / cases)\n
- If retrieving: \`caseId\`\n
- If searching: time range, search text, status/severity\n

## Notes
- Prefer read-only use unless the user explicitly asks for modifications.\n
`,
  getAllowedTools: () => ['platform.core.cases'],
});
