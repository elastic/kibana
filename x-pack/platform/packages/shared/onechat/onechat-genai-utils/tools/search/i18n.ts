/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const progressMessages = {
  selectingTarget: () => {
    return i18n.translate('xpack.onechat.tools.search.progress.selectingTarget', {
      defaultMessage: 'Selecting the best target for this query',
    });
  },
  selectedTarget: (target: string) => {
    return i18n.translate('xpack.onechat.tools.search.progress.selectedTarget', {
      defaultMessage: 'Selected "{target}" as the next search target',
      values: {
        target,
      },
    });
  },
  resolvingSearchStrategy: () => {
    return i18n.translate('xpack.onechat.tools.search.progress.searchStrategy', {
      defaultMessage: 'Thinking about the search strategy to use',
    });
  },
  performingRelevanceSearch: ({ term }: { term: string }) => {
    return i18n.translate('xpack.onechat.tools.search.progress.performingRelevanceSearch', {
      defaultMessage: 'Searching documents for "{term}"',
      values: {
        term,
      },
    });
  },
  performingNlSearch: ({ query }: { query: string }) => {
    return i18n.translate('xpack.onechat.tools.search.progress.performingTextSearch', {
      defaultMessage: 'Generating an ES|QL for "{query}"',
      values: {
        query,
      },
    });
  },
};
