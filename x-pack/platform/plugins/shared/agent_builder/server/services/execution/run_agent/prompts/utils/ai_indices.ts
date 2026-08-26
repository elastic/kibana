/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { cleanPrompt } from '@kbn/agent-builder-genai-utils/prompts';
import { defaultAiIndices } from '../../../../agents/default_ai_indices';

/**
 * Builds the AI INDICES section: what AI indices are, which ones this agent can reach, and how to
 * limit results to the current space. Returns an empty string when disabled or the agent has none.
 */
export const getAiIndicesInstructions = ({
  enabled,
  aiIndices,
  spaceId,
}: {
  enabled: boolean;
  aiIndices: string[];
  spaceId: string;
}): string => {
  if (!enabled || aiIndices.length === 0) {
    return '';
  }

  const described = aiIndices.flatMap((id) => defaultAiIndices[id] ?? []);
  const catalog: string[] = [];

  if (described.length > 0) {
    const entries = described.map(({ name, description, guidance }) =>
      [`- \`${name}\` — ${description}`, guidance].filter(Boolean).join(' ')
    );
    catalog.push('Available to this agent:', entries.join('\n'));
  }

  const spaceFilter = {
    bool: {
      should: [
        { term: { spaces: spaceId } },
        { term: { spaces: '*' } },
        { bool: { must_not: { exists: { field: 'spaces' } } } },
      ],
      minimum_should_match: 1,
    },
  };

  return cleanPrompt(`
## AI INDICES

An AI index stores Knowledge Indicators (KIs): context prepared for agents, such as data descriptions, summaries, access patterns, queries, or records of Kibana resources. A KI may answer a question directly or help locate and use another source. AI indices are Elasticsearch indices named \`ai-index-idx-*\`, or data streams named \`ai-index-ds-*\`. Use \`execute_esql\` for direct AI-index queries, and follow specialized tool instructions when they apply.

Search relevant AI indices before broader retrieval when their KIs may help. If they do not cover the question, continue with other relevant data or tools. Fields differ between AI indices, so check what an index holds before filtering on one.

${catalog.join('\n\n')}

### Space scoping

Documents in an AI index may be restricted to a single Kibana space. This conversation runs in the space \`${spaceId}\`.

The \`spaces\` field is optional: some AI indices define it, others do not, and an index without it holds documents visible from every space. A document whose \`spaces\` contains \`*\` is likewise visible everywhere.

When you query AI indices with \`execute_esql\`, pass the query and space \`filter\` together. Adapt the query to the task, but copy the filter verbatim:

\`\`\`json
${JSON.stringify({ query: 'FROM ai-index-* | LIMIT 100', filter: spaceFilter })}
\`\`\`

Two caveats:

- Use that filter as written. The final clause keeps indices with no \`spaces\` field in the query — without it Elasticsearch drops those indices entirely and returns fewer results with no error.
- Do not express the space condition as a \`WHERE\` clause. \`WHERE\` discards every document from indices that do not define \`spaces\`, the opposite of what you want.

`);
};
