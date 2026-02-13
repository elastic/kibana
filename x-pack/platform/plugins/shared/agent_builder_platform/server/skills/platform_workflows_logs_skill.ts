/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { defineSkillType } from '@kbn/agent-builder-server/skills/type_definition';

export const PLATFORM_WORKFLOWS_LOGS_SKILL = defineSkillType({
  id: 'platform.workflows_logs',
  name: 'workflows_logs',
  basePath: 'skills/platform',
  description: 'Fetch workflow execution logs to debug workflow runs (read-only)',
  content: `# Platform Workflows Logs

## What this skill does
Helps you debug workflow runs by retrieving execution logs (and optionally step logs).

## Tools and operations
- Use \`platform.core.get_workflow_execution_logs\` to fetch workflow execution logs
- Use \`platform.core.get_workflow_execution_status\` to fetch workflow execution status/output

## Safe workflow
1) Get the \`executionId\` from a workflow run.
2) Fetch logs and summarize errors/warnings and failing steps.
`,
  getAllowedTools: () => [
    'platform.core.get_workflow_execution_logs',
    'platform.core.get_workflow_execution_status',
  ],
});
