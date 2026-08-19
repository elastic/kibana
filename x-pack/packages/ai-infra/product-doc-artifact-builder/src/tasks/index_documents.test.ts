/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import type { ToolingLog } from '@kbn/tooling-log';
import { indexDocuments } from './index_documents';
import type { ExtractedDocument } from './extract_documentation';

const createLog = (): ToolingLog =>
  ({
    info: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    warning: jest.fn(),
  } as unknown as ToolingLog);

const createDocuments = (count: number): ExtractedDocument[] =>
  Array.from({ length: count }, (_, i) => ({
    content_title: `Doc ${i}`,
    content_body: `content ${i}`,
    product_name: 'kibana',
    root_type: 'documentation',
    slug: `doc-${i}`,
    url: `https://example.com/${i}`,
    version: '9.6',
    ai_subtitle: `subtitle ${i}`,
    ai_summary: `summary ${i}`,
    ai_questions_answered: [],
    ai_tags: [],
  }));

describe('indexDocuments', () => {
  it('resolves when bulk indexing succeeds', async () => {
    const bulk = jest.fn().mockResolvedValue({ errors: false, items: [] });
    const client = { bulk } as unknown as Client;
    const log = createLog();

    await expect(
      indexDocuments({
        index: 'kb-docs',
        client,
        documents: createDocuments(2),
        log,
      })
    ).resolves.toBeUndefined();

    expect(bulk).toHaveBeenCalledTimes(1);
    expect(log.info).toHaveBeenCalledWith(expect.stringContaining('Finished indexing process'));
  });

  it('throws a summarized error and stops subsequent chunks on bulk failures', async () => {
    const bulk = jest
      .fn()
      .mockResolvedValueOnce({
        errors: true,
        items: [
          {
            index: {
              status: 400,
              _index: 'kb-docs',
              _id: 'bad-doc',
              error: {
                type: 'mapper_parsing_exception',
                reason: 'failed to parse field [content]',
              },
            },
          },
        ],
      })
      .mockResolvedValue({ errors: false, items: [] });
    const client = { bulk } as unknown as Client;
    const log = createLog();

    // 15 docs => 2 chunks at chunk size 10; failure on first chunk must prevent the second call.
    await expect(
      indexDocuments({
        index: 'kb-docs',
        client,
        documents: createDocuments(15),
        log,
      })
    ).rejects.toThrow(
      /Bulk indexing failed for chunk 1 of 2:.*"failureCount":1.*"bad-doc".*"mapper_parsing_exception"/
    );

    expect(bulk).toHaveBeenCalledTimes(1);
  });
});
