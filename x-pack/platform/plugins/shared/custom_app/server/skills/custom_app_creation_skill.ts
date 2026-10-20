/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { defineSkillType } from '@kbn/agent-builder-server/skills/type_definition';
import { platformCoreTools } from '@kbn/agent-builder-common';
import {
  CREATE_CUSTOM_APP_TOOL_ID,
  UPDATE_CUSTOM_APP_TOOL_ID,
} from '../tools/update_custom_app_tool';

export const CUSTOM_APP_CREATION_SKILL_ID = 'custom-app-creation';

export const customAppCreationSkill = defineSkillType({
  id: CUSTOM_APP_CREATION_SKILL_ID,
  name: CUSTOM_APP_CREATION_SKILL_ID,
  basePath: 'skills/platform',
  description:
    'Create an interactive custom app: filters, tables and detail views, each backed by ES|QL, that the user can save to a dashboard.',
  content: `## When to Use This Skill

Use this skill when the user asks for an app, a small interactive tool or an explorer: filters that narrow a table, a row that opens details, stats next to a list.

Do **not** use it for a single chart (use the visualization skill) or to lay out a dashboard.

## Workflow

1. Ground the index and its fields first. Every ES|QL query must use fields that exist.
2. Try each query with ${platformCoreTools.executeEsql} before using it. Parameters (\`?name\`) cannot be tried without a value; give them a literal while testing.
3. If the app has a button or a form that must run a workflow, find one that does it with the workflow tools. If none exists, draft it now with ${platformCoreTools.generateWorkflow}, passing a \`workflowId\` that you chose (lowercase letters, digits and hyphens, such as "escalate-a-case") and that no existing workflow has, so that the draft is saved under it. Use the workflow's own input names.
4. Call ${CREATE_CUSTOM_APP_TOOL_ID} with the complete app, buttons and forms included, using that workflow id. Do not leave the button or the form out because the draft is not saved yet: the app shows it as not ready until it is. Read the authoring guide in its description. If it reports problems, fix all of them and call it again.
5. Render the result with \`<render_attachment id="{attachment_id}" version="{version}" />\`, and the workflow draft as the workflow tool says. Tell the user to save the workflow draft, which is the only thing left for them to do before the button works. Tell them they can save it as an app, or to a dashboard, from the card. You cannot save a workflow yourself.
6. For changes, call ${UPDATE_CUSTOM_APP_TOOL_ID} with the \`attachment_id\` and the complete changed app, then render it again.`,
  getRegistryTools: () => [
    CREATE_CUSTOM_APP_TOOL_ID,
    UPDATE_CUSTOM_APP_TOOL_ID,
    platformCoreTools.executeEsql,
    platformCoreTools.generateWorkflow,
  ],
});
