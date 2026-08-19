/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { cleanPrompt } from '@kbn/agent-builder-genai-utils/prompts';
import { agentBuilderDefaultAiIndexId } from '@kbn/agent-builder-common';
import { smlAiIndexDescription, smlIndexName } from '@kbn/agent-builder-sml-plugin/server';

interface KnownAiIndex {
  /** The Elasticsearch index or data stream to query, i.e. what goes in a `FROM` clause. */
  name: string;
  description: string;
  /** Extra advice for this index, printed after the description. */
  guidance?: string;
}

// The AI indices we can name without asking the Context Engine.
const knownAiIndices: Record<string, KnownAiIndex> = {
  [agentBuilderDefaultAiIndexId]: {
    name: smlIndexName,
    description: smlAiIndexDescription,
    guidance:
      "Entries can be attached to the conversation, which loads an entry's full specification; " +
      'querying the index returns only its summary. Attach an entry before acting on it.',
  },
};

/**
 * Builds the AI INDICES section: what AI indices are, which ones this agent can reach, and how to
 * limit results to the current space. Returns an empty string when the agent has none.
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

  const described = aiIndices.flatMap((id) => knownAiIndices[id] ?? []);
  const catalog: string[] = [];

  if (described.length > 0) {
    const entries = described.map(({ name, description, guidance }) =>
      [`- \`${name}\` — ${description}`, guidance].filter(Boolean).join(' ')
    );
    catalog.push('Available to this agent:', entries.join('\n'));
  }

  if (described.length < aiIndices.length) {
    catalog.push(
      described.length > 0
        ? 'This agent has further AI indices. Find them with `list_indices` and the pattern `ai-index-*`.'
        : "This agent's AI indices are not named here. Find them with `list_indices` and the pattern `ai-index-*`."
    );
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

An AI index holds Knowledge Indicators: facts recorded ahead of time about a body of data, so you can find your way around it without reading the data itself. A KI tells you what a class of information covers and what it leaves out, and often hands you a query to fill in and run against the live data. AI indices are Elasticsearch indices named \`ai-index-idx-*\`, or data streams named \`ai-index-ds-*\`, and you read them with \`execute_esql\`.

Search them before scanning the data they describe: they are far smaller and cheaper to read. Three things follow:

- A KI points at data more often than it contains it. Run the query it gives you rather than answering from the KI alone, and treat any figure written into one as possibly out of date.
- KIs speed retrieval up, they do not replace it. If no KI covers the question, query the underlying data directly rather than concluding there is nothing to find.
- Fields differ from one AI index to the next, so check what an index holds before filtering on one.

${catalog.join('\n\n')}

### Space scoping

Documents in an AI index may be restricted to a single Kibana space. This conversation runs in the space \`${spaceId}\`.

The \`spaces\` field is optional: some AI indices define it, others do not, and an index without it holds documents visible from every space. A document whose \`spaces\` contains \`*\` is likewise visible everywhere.

When you query AI indices with \`execute_esql\`, pass this \`filter\` to limit results to the current space:

\`\`\`json
${spaceFilter}
\`\`\`

Two caveats:

- Use that filter as written. The final clause keeps indices with no \`spaces\` field in the query — without it Elasticsearch drops those indices entirely and returns fewer results with no error.
- Do not express the space condition as a \`WHERE\` clause. \`WHERE\` discards every document from indices that do not define \`spaces\`, the opposite of what you want.

`);
};
