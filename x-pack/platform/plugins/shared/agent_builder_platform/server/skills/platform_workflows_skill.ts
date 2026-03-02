/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { defineSkillType } from '@kbn/agent-builder-server/skills/type_definition';

export const PLATFORM_WORKFLOWS_SKILL = defineSkillType({
  id: 'platform.workflows',
  name: 'workflows',
  basePath: 'skills/platform',
  description: 'Discover, execute and monitor workflows safely',
  content: `# Platform Workflows

## WHEN TO USE THIS TOOL (REQUIRED)

You MUST use this tool when the user asks about:
- Listing available workflows
- Getting workflow details or definitions
- Running/executing a workflow
- Checking workflow execution status

**ALWAYS call the tool - do NOT answer from memory.**

## RESPONSE FORMAT (MANDATORY)

### When listing workflows:
- If workflows found: "Found X workflows:" then list names and IDs
- If none: "No workflows found."

### When getting workflow:
Show the workflow name, description, triggers, and key steps from tool results.

### When running workflow:
Report the execution ID and status from tool results.

### When checking status:
Show execution status, any outputs or errors from tool results.

## FORBIDDEN RESPONSES
- Do NOT explain what workflows are without listing them
- Do NOT describe workflow capabilities in general
- Do NOT add suggestions unless asked

## Available Tools
- \`platform.core.list_workflows\` — list all workflows (read-only)
- \`platform.core.get_workflow\` — get workflow details (read-only)
- \`platform.core.run_workflow\` — run a workflow (**requires confirm: true**)
- \`platform.core.get_workflow_execution_status\` — check execution status
- \`platform.core.create_workflow\` — create a new workflow from YAML (**requires confirm: true**)
- \`platform.core.update_workflow\` — update an existing workflow (**requires confirm: true**)
- \`platform.core.delete_workflow\` — delete workflow(s) (**requires confirm: true**)

## Guardrails
- Running workflows and create/update/delete operations require explicit confirmation.
`,
  getAllowedTools: () => [
    'platform.core.list_workflows',
    'platform.core.get_workflow',
    'platform.core.run_workflow',
    'platform.core.get_workflow_execution_status',
    'platform.core.create_workflow',
    'platform.core.update_workflow',
    'platform.core.delete_workflow',
  ],
});
