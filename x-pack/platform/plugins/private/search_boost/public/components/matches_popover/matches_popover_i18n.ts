/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

/** Localized strings for the matches popover. */
export const matchesPopoverStrings = {
  indicesTitle: () =>
    i18n.translate('xpack.searchBoost.matchesPopover.indicesTitle', {
      defaultMessage: 'Matching indices',
    }),

  dataStreamsTitle: () =>
    i18n.translate('xpack.searchBoost.matchesPopover.dataStreamsTitle', {
      defaultMessage: 'Matching data streams',
    }),

  matchesCount: (count: number) =>
    i18n.translate('xpack.searchBoost.matchesPopover.matchesCount', {
      defaultMessage: '{count, plural, one {# match} other {# matches}}',
      values: { count },
    }),

  matchesCountWithOutranked: (count: number, outrankedCount: number) =>
    i18n.translate('xpack.searchBoost.matchesPopover.matchesCountWithOutranked', {
      defaultMessage:
        '{count, plural, one {# match} other {# matches}}, {outrankedCount} outranked',
      values: { count, outrankedCount },
    }),

  outrankedTooltip: (ruleName: string) =>
    i18n.translate('xpack.searchBoost.matchesPopover.outrankedTooltip', {
      defaultMessage:
        '"{ruleName}" ranks higher, so it applies instead. To outrank it, increase this rule\'s priority.',
      values: { ruleName },
    }),

  additionalHiddenIndices: (count: number) =>
    i18n.translate('xpack.searchBoost.matchesPopover.additionalHiddenIndices', {
      defaultMessage: '+{count, plural, one {# hidden index} other {# hidden indices}}',
      values: { count },
    }),

  hiddenIndices: (count: number) =>
    i18n.translate('xpack.searchBoost.matchesPopover.hiddenIndices', {
      defaultMessage: '{count, plural, one {# hidden index} other {# hidden indices}}',
      values: { count },
    }),

  additionalHiddenDataStreams: (count: number) =>
    i18n.translate('xpack.searchBoost.matchesPopover.additionalHiddenDataStreams', {
      defaultMessage: '+{count, plural, one {# hidden data stream} other {# hidden data streams}}',
      values: { count },
    }),

  hiddenDataStreams: (count: number) =>
    i18n.translate('xpack.searchBoost.matchesPopover.hiddenDataStreams', {
      defaultMessage: '{count, plural, one {# hidden data stream} other {# hidden data streams}}',
      values: { count },
    }),
};
