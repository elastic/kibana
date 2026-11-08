/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HYPOTHESES_ATTACHMENT_TYPE } from '../hypotheses/constants';
import { IMPACT_MAP_ATTACHMENT_TYPE } from '../impact_map/constants';

/** Where the Elastic CLI's install guide lives. */
export const ELASTIC_CLI_INSTALL_DOCS_URL =
  'https://github.com/elastic/cli/blob/main/docs/cli/installation.md';

export interface AgentInstructionsOptions {
  /** The investigation's id, which is its Agent Builder conversation id. */
  investigationId: string;
  /** The Kibana the investigation lives in, with any base path, and no trailing slash. */
  kibanaUrl: string;
}

/**
 * Plain-text instructions a person pastes into a local coding agent so it can read an
 * investigation through the Elastic CLI. They hold no credentials: the agent is told to ask for
 * an API key rather than being handed one.
 */
export const buildAgentInstructions = ({
  investigationId,
  kibanaUrl,
}: AgentInstructionsOptions): string => {
  const url = kibanaUrl.replace(/\/+$/, '');
  return [
    `Bring the Elastic Observability investigation ${investigationId} into this session, using the Elastic CLI.`,
    '',
    '1. Install the Elastic CLI if `elastic --version` fails.',
    `   Follow ${ELASTIC_CLI_INSTALL_DOCS_URL} (in short: \`npm install -g @elastic/cli\`).`,
    '',
    `2. Make sure the CLI has a context for this Kibana (${url}). Check with \`elastic config context list\`.`,
    '   If there is none, ask me for an API key and never print or store it in a file:',
    `   \`elastic config context add nightshift --kb-url "${url}" --kb-api-key "$KIBANA_API_KEY"\``,
    '   Then run `elastic status` to confirm it works.',
    '',
    '3. Read the investigation. It is an Agent Builder conversation:',
    `   \`elastic kb agent-builder get-agent-builder-conversations-conversation-id --conversation-id ${investigationId}\``,
    '   Run it with `--help --json` first if the command is not found.',
    '',
    '4. From the result, tell me:',
    '   - the title, the summary and the conclusion (the conversation metadata `summary` and `verdict`)',
    `   - the impact map, with its entities and events (attachment type \`${IMPACT_MAP_ATTACHMENT_TYPE}\`)`,
    `   - the hypotheses and what supported or ruled them out (attachment type \`${HYPOTHESES_ATTACHMENT_TYPE}\`)`,
    "   - the agent's final message in the last round",
    '',
    'Read only. Do not change, close or delete the investigation.',
  ].join('\n');
};
