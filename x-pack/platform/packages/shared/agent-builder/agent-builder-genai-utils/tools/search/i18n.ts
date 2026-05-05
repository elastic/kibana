/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const progressMessages = {
  dispatchingSearch: () => {
    return i18n.translate('xpack.agentBuilder.tools.search.progress.dispatchingSearch', {
      defaultMessage: 'Identifying the best data source and search strategy',
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
