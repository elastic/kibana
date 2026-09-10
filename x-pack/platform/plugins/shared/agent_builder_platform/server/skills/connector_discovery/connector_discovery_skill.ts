/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import dedent from 'dedent';
import { defineSkillType } from '@kbn/agent-builder-server/skills/type_definition';
import { platformCoreTools } from '@kbn/agent-builder-common';
import type { PluginStartContract as ActionsPluginStart } from '@kbn/actions-plugin/server';
import { createListConnectorsTool } from './list_connectors_tool';
import { createGetConnectorSubActionsTool } from './get_connector_sub_actions_tool';

interface ConnectorDiscoverySkillDeps {
  getActionsStart: () => Promise<ActionsPluginStart>;
}

/**
 * Built-in skill that lets an agent discover and invoke connectors without
 * relying on SML indexing. The agent uses the two inline tools to list
 * available connectors and load their sub-actions, then calls
 * execute_connector_sub_action to run an action.
 *
 * This is an interim mechanism for 9.6 while SML is not yet available.
 * When SML lands and connectors are indexed and attachable, this skill
 * can be retired in favour of the SML attach flow.
 */
export const connectorDiscoverySkill = ({ getActionsStart }: ConnectorDiscoverySkillDeps) =>
  defineSkillType({
    id: 'connector-discovery',
    name: 'connector-discovery',
    basePath: 'skills/platform/agent-builder',
    description:
      "Use when the user's request might involve an external service or integration — such as creating a GitHub issue, sending a Slack message, querying a database, or taking any action that an external tool could handle. Also use when the user asks what the agent can do or connect to.",
    content: dedent(`
## Connector Discovery

This agent may have connectors that reach external services (APIs, messaging systems, databases, etc.).

When a user's request could be fulfilled or assisted by an external integration:

1. Call \`list_connectors\` to see what connectors are available to this agent. If the list is empty, tell the user no connectors are set up and the task is out of scope.

2. If a connector looks applicable, call \`get_connector_sub_actions\` with its \`connector_id\` to load its available sub-actions and their parameter schemas.

3. Call \`execute_connector_sub_action\` with:
   \`\`\`json
   { "connectorId": "<id>", "subAction": "<exact action name>", "params": { ... } }
   \`\`\`
   Use the sub-action name exactly as returned by \`get_connector_sub_actions\`. Put every sub-action argument inside \`params\`.

If no connector matches the user's need, say so clearly rather than guessing or inventing connector IDs.
    `),
    getInlineTools: () => [
      createListConnectorsTool({ getActionsStart }),
      createGetConnectorSubActionsTool({ getActionsStart }),
    ],
    getRegistryTools: () => [platformCoreTools.executeConnectorSubAction],
  });
