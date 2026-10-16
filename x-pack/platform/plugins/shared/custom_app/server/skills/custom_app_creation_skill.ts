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
3. Call ${CREATE_CUSTOM_APP_TOOL_ID} with the complete app. Read the authoring guide in its description. If it reports problems, fix all of them and call it again.
4. Render the result with \`<render_attachment id="{attachment_id}" version="{version}" />\`. Tell the user they can save it as an app, or to a dashboard, from the card.
5. If a button needs a workflow that does not exist, do not invent an id and do not add the button yet. Draft the workflow with ${platformCoreTools.generateWorkflow}, tell the person to review it and save it in the Workflows application, and wait. Once they say it is saved, find its id with the workflow tools and add the button.
6. For changes, call ${UPDATE_CUSTOM_APP_TOOL_ID} with the \`attachment_id\` and the complete changed app, then render it again.`,
  getRegistryTools: () => [
    CREATE_CUSTOM_APP_TOOL_ID,
    UPDATE_CUSTOM_APP_TOOL_ID,
    platformCoreTools.executeEsql,
    platformCoreTools.generateWorkflow,
  ],
});
