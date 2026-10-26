/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { defineSkillType } from '@kbn/agent-builder-server/skills/type_definition';
import { platformCoreTools } from '@kbn/agent-builder-common';
import type { PluginStartContract as ActionsPluginStart } from '@kbn/actions-plugin/server';
import { createListConnectorsTool } from './list_connectors_tool';
import { createGetConnectorSubActionsTool } from './get_connector_sub_actions_tool';

const CONNECTOR_DISCOVERY_CONTENT = [
  '## Connector Discovery',
  '',
  'This agent may have connectors that reach external services (APIs, messaging systems, databases, etc.).',
  '',
  "When a user's request could be fulfilled by an external integration:",
  '',
  "- Use `list_connectors` to see the connectors this agent can call, and `get_connector_sub_actions` to load a connector's sub-actions and parameter schemas.",
  '- Reuse results already in the conversation; call these again only if the user says connectors changed or you no longer have the result.',
  '- Call `execute_connector_sub_action` with `{ "connectorId": "<id>", "subAction": "<exact action name>", "params": { ... } }`. Use the sub-action name exactly as returned, and put every argument inside `params`.',
  '- When a sub-action fails because the service is rate limiting or failing, follow the guidance in the error: wait the stated retry delay, make at most 3 attempts in total, then tell the user what failed. Do not switch to other sub-actions to work around the failure. Do not retry authentication or permission errors; tell the user to check the connector credentials.',
  '',
  "If no connector matches the user's need, say so rather than guessing or inventing connector IDs. If the user asks for a connector that is not in the list, call `list_connectors` with `include_unassigned: true` to check whether it exists. If it does, tell the user it is not assigned to this agent and that they can add it in the agent's connector settings.",
].join('\n');

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
    content: CONNECTOR_DISCOVERY_CONTENT,
    getInlineTools: () => [
      createListConnectorsTool({ getActionsStart }),
      createGetConnectorSubActionsTool({ getActionsStart }),
    ],
    getRegistryTools: () => [platformCoreTools.executeConnectorSubAction],
  });
