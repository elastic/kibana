/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { RepositoryUtils } from '../../../common/repository_utils';
import { RepositoryUri } from '../../../model';

export const CommitSchema = {
  repoUri: {
    type: 'keyword',
  },
  id: {
    type: 'keyword',
  },
  message: {
    type: 'text',
  },
  body: {
    type: 'text',
  },
  date: {
    type: 'date',
  },
  parents: {
    type: 'keyword',
  },
  author: {
    properties: {
      name: {
        type: 'text',
      },
      email: {
        type: 'text',
      },
    },
  },
  committer: {
    properties: {
      name: {
        type: 'text',
      },
      email: {
        type: 'text',
      },
    },
  },
};

export const CommitIndexNamePrefix = `.code-commit`;
export const CommitIndexName = (repoUri: RepositoryUri) => {
  return `${CommitIndexNamePrefix}-${RepositoryUtils.normalizeRepoUriToIndexName(repoUri)}`;
};
export const CommitSearchIndexWithScope = (repoScope: RepositoryUri[]) => {
  return repoScope.map((repoUri: RepositoryUri) => `${CommitIndexName(repoUri)}*`).join(',');
};
