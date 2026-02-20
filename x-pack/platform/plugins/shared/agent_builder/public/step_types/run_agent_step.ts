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
  label: i18n.translate('xpack.agentBuilder.runAgentStep.label', {
    defaultMessage: 'Run Agent',
  }),
  description: i18n.translate('xpack.agentBuilder.runAgentStep.description', {
    defaultMessage:
      'Execute an AgentBuilder AI agent to process input and generate responses. Optionally provide a JSON schema to receive structured output.',
  }),
  actionsMenuGroup: ActionsMenuGroup.ai,
  documentation: {
    details: i18n.translate('xpack.agentBuilder.runAgentStep.documentation.details', {
      defaultMessage:
        'The agentBuilder.runAgent step allows you to invoke an AI agent within your workflow. The agent will process the input message and return a response, optionally using tools and maintaining conversation context. To receive structured output, provide a JSON schema that defines the expected response format.',
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

      `## Get structured output using a JSON schema
\`\`\`yaml
- name: extract_person_data
  type: ${RunAgentStepTypeId}
  with:
    message: "Extract information about famous scientists from the text"
    schema:
      title: Person Array
      type: array
      items:
        title: Person
        type: object
        properties:
          name:
            type: string
            description: The person's first name
          surname:
            type: string
            description: The person's last name
          field:
            type: string
            description: Their field of study
        required:
          - name
          - surname
\`\`\`

When a schema is provided, the agent's response will be available in \`output.structured_output\` as a typed object, while \`output.message\` will contain a string representation of the structured output.`,

      `## Structured output with simple object schema
\`\`\`yaml
- name: analyze_sentiment
  type: ${RunAgentStepTypeId}
  with:
    message: "Analyze the sentiment of this customer feedback: {{ feedback }}"
    schema:
      type: object
      properties:
        sentiment:
          type: string
          enum: [positive, negative, neutral]
          description: Overall sentiment classification
        confidence:
          type: number
          description: Confidence score between 0 and 1
        key_phrases:
          type: array
          items:
            type: string
          description: Important phrases that influenced the sentiment
      required:
        - sentiment
        - confidence
\`\`\``,
    ],
  },
  editorHandlers: {
    config: {
      'connector-id': {
        connectorIdSelection: {
          connectorTypes: ['inference.unified_completion', 'bedrock', 'gen-ai', 'gemini'],
          enableCreation: false,
        },
      },
    },
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
});
