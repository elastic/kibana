/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import { ToolingLog } from '@kbn/tooling-log';
import { createUrlRepository } from './url_repository';

const log = new ToolingLog({
  level: 'silent',
  writeTo: {
    write: () => {},
  },
});

describe('createUrlRepository', () => {
  it('passes validation for file:// URLs', () => {
    const repository = createUrlRepository('file:///tmp/repo');

    expect(() => repository.validate()).not.toThrow();
  });

  it('throws for non-file:// URLs', () => {
    const repository = createUrlRepository('https://example.com/repo');

    expect(() => repository.validate()).toThrow(
      'Only file:// snapshot URLs are supported (received: https:)'
    );
  });

  it('throws for invalid URLs', () => {
    const repository = createUrlRepository('not-a-valid-url');

    expect(() => repository.validate()).toThrow('Invalid snapshot URL: not-a-valid-url');
  });

  it('registers a URL repository in Elasticsearch', async () => {
    const createRepository = jest.fn().mockResolvedValue(undefined);
    const esClient = {
      snapshot: {
        createRepository,
      },
    } as unknown as Client;
    const repository = createUrlRepository('file:///tmp/repo');

    await repository.register({ esClient, log, repoName: 'test-repo' });

    expect(createRepository).toHaveBeenCalledWith({
      name: 'test-repo',
      body: {
        type: 'url',
        settings: {
          url: 'file:///tmp/repo',
        },
      },
    });
  });
});
