/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RepositoryStrategy } from './types';
import { resolveRepository } from '.';

describe('resolveRepository', () => {
  it('throws when both repository and snapshotUrl are provided', () => {
    const repository: RepositoryStrategy = {
      type: 'gcs',
      validate: () => {},
      register: async () => {},
    };

    expect(() =>
      resolveRepository({
        repository,
        snapshotUrl: 'file:///tmp/repo',
      })
    ).toThrow('Cannot provide both repository and snapshotUrl');
  });

  it('returns the provided repository strategy', () => {
    const repository: RepositoryStrategy = {
      type: 'gcs',
      validate: () => {},
      register: async () => {},
    };

    expect(resolveRepository({ repository })).toBe(repository);
  });

  it('creates a URL repository from snapshotUrl', () => {
    const repository = resolveRepository({ snapshotUrl: 'file:///tmp/repo' });

    expect(repository.type).toBe('url');
    expect(() => repository.validate()).not.toThrow();
  });

  it('throws when neither repository nor snapshotUrl are provided', () => {
    expect(() => resolveRepository({})).toThrow(
      'Either repository or snapshotUrl must be provided'
    );
  });
});
