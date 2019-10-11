/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { RepositoryUtils } from '../../../common/repository_utils';
import { RepositoryUri } from '../../../model';

// The field name of repository object nested in the Document index.
export const RepositoryReservedField = 'repository';
// The field name of repository git status object nested in the Document index.
export const RepositoryGitStatusReservedField = 'repository_git_status';
// The field name of repository delete status object nested in the Document index.
export const RepositoryDeleteStatusReservedField = 'repository_delete_status';
// The field name of repository lsp index status object nested in the Document index.
export const RepositoryIndexStatusReservedField = 'repository_index_status';
// The field name of repository config object nested in the Document index.
export const RepositoryConfigReservedField = 'repository_config';
// The field name of repository config object nested in the Document index.
export const RepositoryRandomPathReservedField = 'repository_random_path';

export const ALL_RESERVED = [
  RepositoryReservedField,
  RepositoryGitStatusReservedField,
  RepositoryDeleteStatusReservedField,
  RepositoryIndexStatusReservedField,
  RepositoryConfigReservedField,
  RepositoryRandomPathReservedField,
];

// Correspond to model/search/Document
export const DocumentSchema = {
  repoUri: {
    type: 'keyword',
  },
  path: {
    type: 'text',
    analyzer: 'path_analyzer',
    fields: {
      hierarchy: {
        type: 'text',
        analyzer: 'path_hierarchy_analyzer',
      },
      keyword: {
        type: 'keyword',
      },
    },
  },
  content: {
    type: 'text',
    analyzer: 'content_analyzer',
  },
  qnames: {
    type: 'text',
    analyzer: 'qname_path_hierarchy_analyzer',
  },
  language: {
    type: 'keyword',
  },
  sha1: {
    type: 'text',
    index: false,
    norms: false,
  },
  // Repository object resides in this document index.
  // There is always a single Repository object in this index.
  [RepositoryReservedField]: {
    properties: {
      uri: {
        type: 'text',
      },
      url: {
        type: 'text',
        index: false,
      },
      name: {
        type: 'text',
      },
      org: {
        type: 'text',
      },
      defaultBranch: {
        type: 'keyword',
      },
      revision: {
        type: 'keyword',
      },
      indexedRevision: {
        type: 'keyword',
      },
    },
  },
  [RepositoryConfigReservedField]: {
    properties: {
      uri: {
        type: 'text',
      },
      disableGo: {
        type: 'boolean',
      },
      disableJava: {
        type: 'boolean',
      },
      disableTypescript: {
        type: 'boolean',
      },
    },
  },
  [RepositoryRandomPathReservedField]: {
    type: 'keyword',
  },
  // A single Repository Git Status object resides in this document index.
  [RepositoryGitStatusReservedField]: {
    properties: {
      uri: {
        type: 'text',
      },
      progress: {
        type: 'integer',
      },
      timestamp: {
        type: 'date',
      },
      revision: {
        type: 'keyword',
      },
      errorMessage: {
        type: 'text',
      },
      cloneProgress: {
        properties: {
          isCloned: {
            type: 'boolean',
          },
          receivedObjects: {
            type: 'integer',
          },
          indexedObjects: {
            type: 'integer',
          },
          totalObjects: {
            type: 'integer',
          },
          localObjects: {
            type: 'integer',
          },
          totalDeltas: {
            type: 'integer',
          },
          indexedDeltas: {
            type: 'integer',
          },
          receivedBytes: {
            type: 'integer',
          },
        },
      },
    },
  },
  // A single Repository Delete Status object resides in this document index.
  [RepositoryDeleteStatusReservedField]: {
    properties: {
      uri: {
        type: 'text',
      },
      progress: {
        type: 'integer',
      },
      timestamp: {
        type: 'date',
      },
      revision: {
        type: 'keyword',
      },
    },
  },
  // A single Repository LSP Index Status object resides in this document index.
  [RepositoryIndexStatusReservedField]: {
    properties: {
      uri: {
        type: 'text',
      },
      progress: {
        type: 'integer',
      },
      timestamp: {
        type: 'date',
      },
      revision: {
        type: 'keyword',
      },
      indexProgress: {
        properties: {
          type: {
            type: 'keyword',
          },
          total: {
            type: 'integer',
          },
          success: {
            type: 'integer',
          },
          fail: {
            type: 'integer',
          },
          percentage: {
            type: 'integer',
          },
          checkpoint: {
            type: 'object',
          },
        },
      },
      commitIndexProgress: {
        properties: {
          type: {
            type: 'keyword',
          },
          total: {
            type: 'integer',
          },
          success: {
            type: 'integer',
          },
          fail: {
            type: 'integer',
          },
          percentage: {
            type: 'integer',
          },
          checkpoint: {
            type: 'object',
          },
        },
      },
    },
  },
};

export const DocumentAnalysisSettings = {
  analysis: {
    analyzer: {
      content_analyzer: {
        tokenizer: 'standard',
        char_filter: ['content_char_filter'],
        filter: ['lowercase'],
      },
      lowercase_analyzer: {
        type: 'custom',
        filter: ['lowercase'],
        tokenizer: 'keyword',
      },
      path_analyzer: {
        type: 'custom',
        filter: ['lowercase'],
        tokenizer: 'path_tokenizer',
      },
      path_hierarchy_analyzer: {
        type: 'custom',
        tokenizer: 'path_hierarchy_tokenizer',
        filter: ['lowercase'],
      },
      qname_path_hierarchy_analyzer: {
        type: 'custom',
        tokenizer: 'qname_path_hierarchy_tokenizer',
        filter: ['lowercase'],
      },
    },
    char_filter: {
      content_char_filter: {
        type: 'pattern_replace',
        pattern: '[.]',
        replacement: ' ',
      },
    },
    tokenizer: {
      path_tokenizer: {
        type: 'pattern',
        pattern: '[\\\\./]',
      },
      qname_path_hierarchy_tokenizer: {
        type: 'path_hierarchy',
        delimiter: '.',
        reverse: 'true',
      },
      path_hierarchy_tokenizer: {
        type: 'path_hierarchy',
        delimiter: '/',
        reverse: 'true',
      },
    },
  },
};

export const DocumentIndexNamePrefix = `.code-document`;
export const DocumentIndexName = (repoUri: RepositoryUri) => {
  return `${DocumentIndexNamePrefix}-${RepositoryUtils.normalizeRepoUriToIndexName(repoUri)}`;
};
export const DocumentSearchIndexWithScope = (repoScope: RepositoryUri[]) => {
  return repoScope.map((repoUri: RepositoryUri) => `${DocumentIndexName(repoUri)}*`).join(',');
};
