/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ActionsMenuGroup, createPublicStepDefinition } from '@kbn/workflows-extensions/public';
import { i18n } from '@kbn/i18n';
import { fromJSONSchema } from '@kbn/zod/v4/from_json_schema';
import {
  RunAgentStepTypeId,
  runAgentStepCommonDefinition,
  RunAgentOutputSchema,
} from '../../common/step_types';

export const runAgentStepDefinition = createPublicStepDefinition({
  ...runAgentStepCommonDefinition,
  editorHandlers: {
    dynamicSchema: {
      getOutputSchema: ({ input }) => {
        if (!input.schema) {
          return RunAgentOutputSchema;
        }

        return RunAgentOutputSchema.extend({
          structured_output: fromJSONSchema(input.schema),
        });
      },
    },
  },
  label: i18n.translate('xpack.agentBuilder.runAgentStep.label', {
    defaultMessage: 'Run Agent',
  }),
  description: i18n.translate('xpack.agentBuilder.runAgentStep.description', {
    defaultMessage: 'Execute an AgentBuilder AI agent to process input and generate responses',
  }),
  actionsMenuGroup: ActionsMenuGroup.ai,
  documentation: {
    details: i18n.translate('xpack.agentBuilder.runAgentStep.documentation.details', {
      defaultMessage:
        'The agentBuilder.runAgent step allows you to invoke an AI agent within your workflow. The agent will process the input message and return a response, optionally using tools and maintaining conversation context.',
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
  agent-id: "my-custom-agent"
  with:
    message: "{{ workflow.input.message }}"
\`\`\``,

      `## Create a conversation and reuse it in a follow-up step
\`\`\`yaml
- name: initial_analysis
  type: ${RunAgentStepTypeId}
  agent-id: "my-custom-agent"
  create-conversation: true
  with:
    message: "Analyze the event and suggest next steps. {{ event | json }}"

- name: followup
  type: ${RunAgentStepTypeId}
  agent-id: "my-custom-agent"
  with:
    conversation_id: "{{ steps.initial_analysis.output.conversation_id }}"
    message: "Continue from the previous analysis and complete any missing steps."
\`\`\``,
    ],
  },
});
