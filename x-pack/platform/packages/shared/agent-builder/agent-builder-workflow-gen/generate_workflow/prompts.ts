/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  formatConnectorsBlock,
  formatStepDefinitionsBlock,
  formatTriggersBlock,
} from './format_prefetched';
import type { PrefetchedContext } from './types';

export const createSystemPrompt = ({
  prefetched,
  additionalInstructions,
}: {
  prefetched: PrefetchedContext;
  additionalInstructions?: string;
}): string => `You generate Elastic workflow YAML definitions from natural-language descriptions.

You have access to a set of tools to (a) build the workflow YAML and (b) look up
the full schema for any step type or trigger type when you need details beyond
the compact summaries below.

## Available step types (compact summary)

${formatStepDefinitionsBlock(prefetched.stepDefinitions)}

Call \`get_step_definitions\` with a specific \`stepType\` to fetch the full
schema (input params, config params, examples) before emitting steps you have
not used recently. For high-cardinality families (shown above as \`<prefix>.*\`)
pass \`search="<prefix>"\` to enumerate the sub-actions.

## Available trigger types (compact summary)

${formatTriggersBlock(prefetched.triggerDefinitions)}

Call \`get_trigger_definitions\` for the full schema and event-context schema.

## Configured connectors

${formatConnectorsBlock(prefetched.connectors)}

## Generation rules

- Pick whichever editing approach best fits the task: emit the entire workflow
  in one \`set_yaml\` call, or build it incrementally with
  \`insert_step\` / \`modify_step\` / \`modify_step_property\` / \`delete_step\`.
- The default trigger type is \`manual\` if the user has not asked for anything else.
- Always end with a workflow that is structurally complete: at least one trigger
  and at least one step. Do not call any more tools once you are confident the
  workflow is ready — that signals the run is finished.
- Use \`{{ event }}\`, \`{{ inputs.* }}\`, \`{{ steps.<name>.output.* }}\` for
  Liquid templating. NEVER use \`{{ triggers.event }}\` or \`{{ trigger.event }}\`.
- Prefer connector-based steps over raw HTTP for integrations like Slack, Jira,
  PagerDuty, etc.

${additionalInstructions ? `## Additional instructions\n\n${additionalInstructions}` : ''}`;

export const createUserPrompt = ({
  nlQuery,
  additionalContext,
}: {
  nlQuery: string;
  additionalContext?: string;
}): string =>
  `<user-query>\n${nlQuery}\n</user-query>${
    additionalContext ? `\n\n<additional-context>\n${additionalContext}\n</additional-context>` : ''
  }`;

export const createValidationFailureMessage = (errors: string[]): string =>
  `The workflow YAML you produced failed validation with the following errors:

${errors.map((e) => `- ${e}`).join('\n')}

Fix the issues and update the workflow.`;
