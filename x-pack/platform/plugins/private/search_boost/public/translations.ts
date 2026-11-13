/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const SEARCH_BOOST_APP_TITLE = i18n.translate('xpack.searchBoost.appTitle', {
  defaultMessage: 'Search boost',
});

export const SEARCH_BOOST_PAGE_DESCRIPTION = i18n.translate('xpack.searchBoost.page.description', {
  defaultMessage:
    'Balance search performance and cost for the indices and data streams in this project.',
});

export const MATCHING_INDICES_TITLE = i18n.translate('xpack.searchBoost.matchingIndicesTitle', {
  defaultMessage: 'Matching indices',
});

export const MATCHING_DATA_STREAMS_TITLE = i18n.translate(
  'xpack.searchBoost.matchingDataStreamsTitle',
  {
    defaultMessage: 'Matching data streams',
  }
);

export const getMatchesCount = (count: number) =>
  i18n.translate('xpack.searchBoost.matchesCount', {
    defaultMessage: '{count, plural, one {# match} other {# matches}}',
    values: { count },
  });

export const getMatchesCountWithOutranked = (count: number, outrankedCount: number) =>
  i18n.translate('xpack.searchBoost.matchesCountWithOutranked', {
    defaultMessage:
      '{count, plural, one {# match} other {# matches}}, {outrankedCount, number} outranked',
    values: { count, outrankedCount },
  });

export const getOutrankedTooltip = (ruleName: string) =>
  i18n.translate('xpack.searchBoost.outrankedTooltip', {
    defaultMessage:
      '"{ruleName}" ranks higher, so it applies instead. To outrank it, increase this rule\'s priority.',
    values: { ruleName },
  });

export const getAdditionalHiddenIndices = (count: number) =>
  i18n.translate('xpack.searchBoost.additionalHiddenIndices', {
    defaultMessage: '+{count, plural, one {# hidden index} other {# hidden indices}}',
    values: { count },
  });

export const getHiddenIndices = (count: number) =>
  i18n.translate('xpack.searchBoost.hiddenIndices', {
    defaultMessage: '{count, plural, one {# hidden index} other {# hidden indices}}',
    values: { count },
  });

export const getAdditionalHiddenDataStreams = (count: number) =>
  i18n.translate('xpack.searchBoost.additionalHiddenDataStreams', {
    defaultMessage: '+{count, plural, one {# hidden data stream} other {# hidden data streams}}',
    values: { count },
  });

export const getHiddenDataStreams = (count: number) =>
  i18n.translate('xpack.searchBoost.hiddenDataStreams', {
    defaultMessage: '{count, plural, one {# hidden data stream} other {# hidden data streams}}',
    values: { count },
  });
