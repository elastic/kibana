/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import type { ToolingLog } from '@kbn/tooling-log';
import { indexDocuments } from './index_documents';
import type { IndexedSecurityLabsDocument } from '../types';

const createLog = (): ToolingLog =>
  ({
    info: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    warning: jest.fn(),
  } as unknown as ToolingLog);

const createDocuments = (count: number): IndexedSecurityLabsDocument[] =>
  Array.from({ length: count }, (_, i) => ({
    title: `Doc ${i}`,
    slug: `doc-${i}`,
    date: '2026-07-22',
    description: `description ${i}`,
    authors: 'author',
    categories: ['malware'],
    content: `content ${i}`,
    resource_type: 'security_labs',
  }));

describe('indexDocuments', () => {
  it('resolves when bulk indexing succeeds', async () => {
    const bulk = jest.fn().mockResolvedValue({ errors: false, items: [] });
    const client = { bulk } as unknown as Client;
    const log = createLog();

    await expect(
      indexDocuments({
        index: 'kb-security-labs',
        client,
        documents: createDocuments(2),
        log,
      })
    ).resolves.toBeUndefined();

    expect(bulk).toHaveBeenCalledTimes(1);
    expect(log.info).toHaveBeenCalledWith('Finished indexing process');
  });

  it('throws on bulk failures and stops subsequent chunks', async () => {
    const bulk = jest
      .fn()
      .mockResolvedValueOnce({
        errors: true,
        items: [
          {
            index: {
              status: 400,
              _index: 'kb-security-labs',
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

    await expect(
      indexDocuments({
        index: 'kb-security-labs',
        client,
        documents: createDocuments(15),
        log,
      })
    ).rejects.toThrow(/Bulk indexing failed for chunk 1 of 2/);

    expect(bulk).toHaveBeenCalledTimes(1);
  });
});
