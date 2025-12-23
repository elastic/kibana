/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ActionsMenuGroup, type PublicStepDefinition } from '@kbn/workflows-extensions/public';
import { i18n } from '@kbn/i18n';
import { RunAgentStepTypeId, runAgentStepCommonDefinition } from '../../common/step_types';
import type { RegisterWorkflowStepsDependencies } from '.';

export const getRunAgentStepDefinition = (
  deps: RegisterWorkflowStepsDependencies
): PublicStepDefinition => {
  return {
    ...runAgentStepCommonDefinition,
    label: i18n.translate('xpack.onechat.runAgentStep.label', {
      defaultMessage: 'Run Agent',
    }),
    description: i18n.translate('xpack.onechat.runAgentStep.description', {
      defaultMessage: 'Execute an Onechat AI agent to process input and generate responses',
    }),
    actionsMenuGroup: ActionsMenuGroup.ai,
    documentation: {
      details: i18n.translate('xpack.onechat.runAgentStep.documentation.details', {
        defaultMessage:
          'The onechat.runAgent step allows you to invoke an AI agent within your workflow. The agent will process the input message and return a response, optionally using tools and maintaining conversation context.',
      }),
      examples: [
        `## Basic agent invocation
\`\`\`yaml
- name: run_agent
  type: ${RunAgentStepTypeId}
  with:
    message: "Analyze the following data and provide insights"
\`\`\``,

        `## Use a specific agent
\`\`\`yaml
- name: custom_agent
  type: ${RunAgentStepTypeId}
  agent_id: "my-custom-agent"
  with:
    message: "{{ workflow.input.message }}"
\`\`\``,
      ],
    },
    propertyHandlers: {
      config: {
        agent_id: {
          getCompletions: async () => {
            const internalService = deps.getInternalService();
            const agents = await internalService.agentService.list();
            return agents.map((agent) => ({
              label: agent.id,
              value: agent.id,
              detail: agent.name,
              documentation: agent.description,
            }));
          },
          validate: async (value, context) => {
            if (typeof value !== 'string') {
              return { severity: 'error', message: 'Agent ID must be a string' };
            }
            try {
              const internalService = deps.getInternalService();
              await internalService.agentService.get(value);
              return { severity: null, afterMessage: '✓ Agent connected' };
            } catch (error) {
              if (error?.response?.status === 404) {
                return {
                  severity: 'error',
                  message: `Agent ${value} not found. Select an existing agent or create a new one.`,
                  hoverMessage: `[Open agents management](${await deps.getAgentsManagementUrl()})`,
                };
              }
              return { severity: 'warning', message: 'Cannot validate an agent ID' };
            }
          },
        },
      },
    },
  };
};
