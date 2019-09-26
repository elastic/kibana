/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { RepositoryUtils } from '../../../common/repository_utils';
import { RepositoryUri } from '../../../model';

export const SymbolSchema = {
  qname: {
    type: 'text',
    analyzer: 'qname_path_hierarchy_case_sensitive_analyzer',
    fields: {
      // Create a 'lowercased' field to match query in lowercased mode.
      lowercased: {
        type: 'text',
        analyzer: 'qname_path_hierarchy_case_insensitive_analyzer',
      },
    },
  },
  symbolInformation: {
    properties: {
      name: {
        type: 'text',
        analyzer: 'qname_path_hierarchy_case_sensitive_analyzer',
        fields: {
          // Create a 'lowercased' field to match query in lowercased mode.
          lowercased: {
            type: 'text',
            analyzer: 'qname_path_hierarchy_case_insensitive_analyzer',
          },
        },
      },
      kind: {
        type: 'integer',
        index: false,
      },
      location: {
        properties: {
          uri: {
            // Indexed now for symbols batch deleting in incremental indexing
            type: 'keyword',
          },
        },
      },
    },
  },
};

export const SymbolAnalysisSettings = {
  analysis: {
    analyzer: {
      qname_path_hierarchy_case_sensitive_analyzer: {
        type: 'custom',
        tokenizer: 'qname_path_hierarchy_tokenizer',
      },
      qname_path_hierarchy_case_insensitive_analyzer: {
        type: 'custom',
        tokenizer: 'qname_path_hierarchy_tokenizer',
        filter: ['lowercase'],
      },
    },
    tokenizer: {
      qname_path_hierarchy_tokenizer: {
        type: 'path_hierarchy',
        delimiter: '.',
        reverse: 'true',
      },
    },
  },
};

export const SymbolIndexNamePrefix = `.code-symbol`;
export const SymbolIndexName = (repoUri: RepositoryUri) => {
  return `${SymbolIndexNamePrefix}-${RepositoryUtils.normalizeRepoUriToIndexName(repoUri)}`;
};
export const SymbolSearchIndexWithScope = (repoScope: RepositoryUri[]) => {
  return repoScope.map((repoUri: RepositoryUri) => `${SymbolIndexName(repoUri)}*`).join(',');
};
