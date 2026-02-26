/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TaskOutput } from '@kbn/evals';
import { extractSearchRetrievedDocs } from './rag_extractor';

describe('extractSearchRetrievedDocs', () => {
  it('extracts docs from direct data.reference shape', () => {
    const output = {
      steps: [
        {
          type: 'tool_call',
          tool_id: 'platform.core.search',
          results: [{ data: { reference: { index: 'elastic_knowledge_base', id: '3325_4' } } }],
        },
      ],
    } satisfies TaskOutput;

    expect(extractSearchRetrievedDocs(output)).toEqual([
      { index: 'elastic_knowledge_base', id: '3325_4' },
    ]);
  });

  it('extracts docs from resource_list data.resources[].reference shape', () => {
    const output = {
      steps: [
        {
          type: 'tool_call',
          tool_id: 'platform.core.search',
          results: [
            {
              data: {
                resources: [
                  { reference: { index: 'elastic_knowledge_base', id: '3325_1' } },
                  { reference: { index: 'elastic_knowledge_base', id: '3325_3' } },
                ],
              },
            },
          ],
        },
      ],
    } satisfies TaskOutput;

    expect(extractSearchRetrievedDocs(output)).toEqual([
      { index: 'elastic_knowledge_base', id: '3325_1' },
      { index: 'elastic_knowledge_base', id: '3325_3' },
    ]);
  });

  it('handles mixed result shapes and ignores malformed references', () => {
    const output = {
      steps: [
        {
          type: 'tool_call',
          tool_id: 'platform.core.search',
          results: [
            {
              data: {
                reference: { index: 'elastic_knowledge_base', id: '7158_1' },
              },
            },
            {
              data: {
                resources: [
                  { reference: { index: 'elastic_knowledge_base', id: '7158_2' } },
                  { reference: { index: 'elastic_knowledge_base' } },
                  { reference: { id: '7158_3' } },
                ],
              },
            },
          ],
        },
      ],
    } satisfies TaskOutput;

    expect(extractSearchRetrievedDocs(output)).toEqual([
      { index: 'elastic_knowledge_base', id: '7158_1' },
      { index: 'elastic_knowledge_base', id: '7158_2' },
    ]);
  });

  it('ignores non-search tool calls and non tool_call steps', () => {
    const output = {
      steps: [
        {
          type: 'tool_call',
          tool_id: 'platform.core.get_document_by_id',
          results: [{ data: { reference: { index: 'elastic_knowledge_base', id: '3325_4' } } }],
        },
        {
          type: 'reasoning',
          tool_id: 'platform.core.search',
          results: [{ data: { reference: { index: 'elastic_knowledge_base', id: '3325_1' } } }],
        },
      ],
    } satisfies TaskOutput;

    expect(extractSearchRetrievedDocs(output)).toEqual([]);
  });
});
