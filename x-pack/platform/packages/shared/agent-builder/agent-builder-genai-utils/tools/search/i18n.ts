/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const progressMessages = {
  selectingTarget: () => {
    return i18n.translate('xpack.agentBuilder.tools.search.progress.selectingTarget', {
      defaultMessage: 'Identifying the most relevant data source',
    });
  },
  resolvingSearchStrategy: ({ target }: { target: string }) => {
    return i18n.translate('xpack.agentBuilder.tools.search.progress.searchStrategy', {
      defaultMessage: 'Analyzing strategy to search against "{target}"',
      values: {
        target,
      },
    });
  },
  performingRelevanceSearch: ({ term }: { term: string }) => {
    return i18n.translate('xpack.agentBuilder.tools.search.progress.performingRelevanceSearch', {
      defaultMessage: 'Searching documents for "{term}"',
      values: {
        term,
      },
    });
  },
  performingNlSearch: ({ query }: { query: string }) => {
    return i18n.translate('xpack.agentBuilder.tools.search.progress.performingTextSearch', {
      defaultMessage: 'Generating an ES|QL query for "{query}"',
      values: {
        query,
      },
    });
  },
};
