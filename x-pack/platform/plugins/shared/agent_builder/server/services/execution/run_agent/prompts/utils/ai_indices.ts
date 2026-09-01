/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { cleanPrompt } from '@kbn/agent-builder-genai-utils/prompts';
import type { AiIndexCatalogEntry } from '../../types';

const PRIVILEGES_PATH = 'permissions.kibana.privileges';
const SPACE_FIELD = `${PRIVILEGES_PATH}.space`;

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
      ({ esqlTarget, description }) =>
        `- \`${esqlTarget}\`${description ? ` — ${description}` : ''}`
    );
  const catalogSection =
    entries.length > 0 ? `Available to this agent:\n\n${entries.join('\n')}` : '';

  // Mirrors `buildVisibilityFilter` in the SML service, minus its `terms_set` privilege check —
  // the agent only scopes by space.
  //
  // `ignore_unmapped` is the one addition: this filter runs across every `ai-index-*` the agent can
  // reach and most do not map `permissions.kibana.privileges` at all, where a `nested` clause errors
  // out by default instead of leaving those documents alone.
  const spaceFilter = {
    bool: {
      should: [
        {
          bool: {
            must_not: {
              nested: {
                path: PRIVILEGES_PATH,
                query: { match_all: {} },
                ignore_unmapped: true,
              },
            },
          },
        },
        {
          nested: {
            path: PRIVILEGES_PATH,
            ignore_unmapped: true,
            query: {
              bool: {
                should: [{ term: { [SPACE_FIELD]: spaceId } }, { term: { [SPACE_FIELD]: '*' } }],
                minimum_should_match: 1,
              },
            },
          },
        },
      ],
      minimum_should_match: 1,
    },
  };

  return cleanPrompt(`
## AI INDICES

An AI index stores Knowledge Indicators (KIs): context prepared for agents, such as data descriptions, summaries, access patterns, queries, or records of Kibana resources. A KI may answer a question directly or help locate and use another source. AI indices are Elasticsearch indices named \`ai-index-idx-*\`, or data streams named \`ai-index-ds-*\`. Use \`execute_esql\` for direct AI-index queries, and follow specialized tool instructions when they apply.

Search relevant AI indices before broader retrieval when their KIs may help. If they do not cover the question, continue with other relevant data or tools. Fields differ between AI indices, so check what an index holds before filtering on one.

${catalogSection}

### Space scoping

Documents in an AI index may be restricted to a single Kibana space. This conversation runs in the space \`${spaceId}\`.

An index is space-aware when its documents carry \`${PRIVILEGES_PATH}\`: one entry per space the document belongs to, each naming that space in its \`space\` field. An entry whose \`space\` is \`*\` means the document belongs to every space. Documents are visible from every space when their index is not space-aware — most AI indices do not define that field at all — and so is a document that carries the field but no entries.

When you query AI indices with \`execute_esql\`, pass the query and space \`filter\` together. Adapt the query to the task, but copy the filter verbatim:

\`\`\`json
${JSON.stringify({ query: 'FROM ai-index-* | LIMIT 100', filter: spaceFilter })}
\`\`\`

Two caveats:

- Use that filter as written. \`ignore_unmapped\` is what keeps indices that are not space-aware in the query — without it Elasticsearch fails the whole query on those indices instead of returning their documents.
- Do not express the space condition as a \`WHERE\` clause. \`${PRIVILEGES_PATH}\` is a \`nested\` field, and ES|QL cannot reference nested fields as columns at all, so the condition only works in the \`filter\`.

`);
};
