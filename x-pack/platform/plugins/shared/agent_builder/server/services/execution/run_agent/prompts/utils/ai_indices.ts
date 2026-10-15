/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { cleanPrompt } from '@kbn/agent-builder-genai-utils/prompts';
import { kiRetrievalSkillId } from '@kbn/agent-builder-common';
import type { AiIndexCatalogEntry } from '../../types';

/**
 * Builds the AI INDICES prompt section from the resolved catalog. Empty when disabled or when
 * the catalog has no entries.
 */
export const getAiIndicesInstructions = ({
  enabled,
  catalog,
  spaceId,
}: {
  enabled: boolean;
  catalog: AiIndexCatalogEntry[];
  spaceId: string;
}): string => {
  if (!enabled || catalog.length === 0) {
    return '';
  }

  // Unresolved entries are omitted: the id is not a valid `FROM` target.
  const entries = catalog
    .filter(({ esqlTarget }) => esqlTarget !== undefined)
    .map(
      ({ id, esqlTarget, description }) =>
        `- Registry ID: \`${id}\`; ES|QL target: ${esqlTarget}${
          description ? ` — ${description}` : ''
        }`
    );
  const catalogSection =
    entries.length > 0 ? `Available to this agent:\n\n${entries.join('\n')}` : '';

  return cleanPrompt(`
## AI INDICES

An AI Index stores Knowledge Indicators (KIs): context prepared for agents, such as data descriptions, summaries, access patterns, queries, or records of Kibana resources. A KI may answer a question directly or help locate and use another source. AI Indices are Elasticsearch indices named \`ai-index-idx-*\`, or data streams named \`ai-index-ds-*\`.

Search relevant AI Indices before broader retrieval when their KIs may help. If they do not cover the question, continue with other relevant data or tools.

${catalogSection}

Load the \`${kiRetrievalSkillId}\` skill before you work with an AI Index: it carries the AI Index tools and the guidance for using them.

Query everything else, including a source a KI points you to, with your other data tools, such as \`generate_esql\` and \`execute_esql\`, as you would without AI Indices.

This conversation runs in the space \`${spaceId}\`.
`);
};
