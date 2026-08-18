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
  /** Backing Elasticsearch index or data stream, i.e. what the model puts in a `FROM` clause. */
  name: string;
  description: string;
  /** Retrieval advice specific to this index, appended to the description. */
  guidance?: string;
}

/**
 * The AI indices we can describe without asking the Context Engine.
 *
 * An agent declares AI indices by Context Engine id, and only the Context Engine can turn an id
 * into a backing index name. Its start contract exposes no way to read that catalog, so ids absent
 * from this map are reported as undescribed rather than rendered: an id is not an index name, and a
 * model handed a bare id tends to guess a `FROM` target that does not exist.
 */
const knownAiIndices: Record<string, KnownAiIndex> = {
  [agentBuilderDefaultAiIndexId]: {
    name: smlIndexName,
    description: smlAiIndexDescription,
    guidance:
      'Entries here can be attached to the conversation, which loads the full specification of ' +
      'an entry; querying the index returns only its summary. Attach an entry before acting on it.',
  },
};

/**
 * Teaches the agent what AI indices are, which ones it can reach, and how to scope them to the
 * running space. Renders nothing for agents with no AI indices.
 *
 * The space filter has to tolerate indices that never map `spaces`, because Elasticsearch reuses
 * the ES|QL `filter` as the `index_filter` during field resolution: an index that cannot match is
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
        ? 'Further AI indices are available to this agent. Find them with `list_indices` and the pattern `ai-index-*`.'
        : 'The AI indices available to this agent are not named here. Find them with `list_indices` and the pattern `ai-index-*`.'
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

An AI index holds Knowledge Indicators (KIs): records that describe a larger body of data — a Kibana asset, a class of documents, an entity — and that often carry the queries needed to reach the live data behind them. They are ordinary Elasticsearch indices named \`ai-index-idx-*\`, or data streams named \`ai-index-ds-*\`, and you read them with \`execute_esql\`. Search them before scanning the data they describe: they are much smaller, already summarized, and cheaper to read. Their fields differ from one AI index to the next, so check what an index holds before filtering on a field.

${catalog.join('\n\n')}

### Space scoping

Documents in an AI index may be restricted to a single Kibana space. This conversation is running in the space \`${spaceId}\`.

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
