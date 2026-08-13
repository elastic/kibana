/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { cleanPrompt } from '@kbn/agent-builder-genai-utils/prompts';

/**
 * Space-scoping guidance for AI index queries. Renders nothing for agents with no AI indices.
 *
 * The filter has to tolerate indices that never map `spaces`, because Elasticsearch reuses the
 * ES|QL `filter` as the `index_filter` during field resolution: an index that cannot match is
 * dropped from the query along with its results, and no error is reported.
 */
export const getAiIndicesInstructions = ({
  aiIndices,
  spaceId,
}: {
  aiIndices: string[];
  spaceId: string;
}): string => {
  if (aiIndices.length === 0) {
    return '';
  }

  const spaceFilter = JSON.stringify({
    bool: {
      should: [
        { term: { spaces: spaceId } },
        { term: { spaces: '*' } },
        { bool: { must_not: { exists: { field: 'spaces' } } } },
      ],
      minimum_should_match: 1,
    },
  });

  return cleanPrompt(`
## AI INDICES

Documents in AI indices (\`ai-index-*\`) may be restricted to a single Kibana space. This conversation is running in the space \`${spaceId}\`.

The \`spaces\` field is optional: some AI indices define it, others do not, and an index without it holds documents that are visible from every space. A document whose \`spaces\` contains \`*\` is likewise visible everywhere.

When you query AI indices with \`execute_esql\`, pass this \`filter\` so results are limited to the current space:

\`\`\`json
${spaceFilter}
\`\`\`

Two things to keep in mind:

- Use that filter as written. The final clause is what keeps indices that have no \`spaces\` field in the query — without it Elasticsearch drops those indices entirely and returns fewer results with no error to tell you.
- Do not express the space condition as a \`WHERE\` clause instead. \`WHERE\` would discard every document from indices that do not define \`spaces\`, which is the opposite of what you want.

`);
};
