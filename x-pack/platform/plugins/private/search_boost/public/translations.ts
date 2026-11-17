/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { BoostProfileType } from '../common/types';

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

export const OUTRANKED_ICON_LABEL = i18n.translate('xpack.searchBoost.outrankedIconLabel', {
  defaultMessage: 'Outranked',
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

export const PROJECT_DEFAULTS_TITLE = i18n.translate('xpack.searchBoost.projectDefaults.title', {
  defaultMessage: 'Project defaults',
});

export const PROFILE_TYPE_LABELS: Readonly<Record<BoostProfileType, string>> = {
  indices: i18n.translate('xpack.searchBoost.profileType.indices', { defaultMessage: 'Indices' }),
  data_streams: i18n.translate('xpack.searchBoost.profileType.dataStreams', {
    defaultMessage: 'Data streams',
  }),
};

const TARGET_COUNT_MESSAGES: Readonly<Record<BoostProfileType, (count: number) => string>> = {
  indices: (count) =>
    i18n.translate('xpack.searchBoost.targetCount.indices', {
      defaultMessage: '{count, plural, one {# index} other {# indices}}',
      values: { count },
    }),
  data_streams: (count) =>
    i18n.translate('xpack.searchBoost.targetCount.dataStreams', {
      defaultMessage: '{count, plural, one {# data stream} other {# data streams}}',
      values: { count },
    }),
};

export const getTargetCount = (type: BoostProfileType, count: number): string =>
  TARGET_COUNT_MESSAGES[type](count);

const DEFAULT_RULE_TIP_MESSAGES: Readonly<Record<BoostProfileType, (ruleName: string) => string>> =
  {
    indices: (ruleName) =>
      i18n.translate('xpack.searchBoost.projectDefaults.indicesRuleTip', {
        defaultMessage:
          'Sets the boost profile of the default rule "{ruleName}", which applies to every index no other rule targets.',
        values: { ruleName },
      }),
    data_streams: (ruleName) =>
      i18n.translate('xpack.searchBoost.projectDefaults.dataStreamsRuleTip', {
        defaultMessage:
          'Sets the boost profile of the default rule "{ruleName}", which applies to every data stream no other rule targets.',
        values: { ruleName },
      }),
  };

export const getDefaultRuleTip = (type: BoostProfileType, ruleName: string): string =>
  DEFAULT_RULE_TIP_MESSAGES[type](ruleName);

const DEFAULT_RULE_TIP_LABELS: Readonly<Record<BoostProfileType, string>> = {
  indices: i18n.translate('xpack.searchBoost.projectDefaults.indicesRuleTipLabel', {
    defaultMessage: 'About the default for indices',
  }),
  data_streams: i18n.translate('xpack.searchBoost.projectDefaults.dataStreamsRuleTipLabel', {
    defaultMessage: 'About the default for data streams',
  }),
};

export const getDefaultRuleTipLabel = (type: BoostProfileType): string =>
  DEFAULT_RULE_TIP_LABELS[type];

export const EDIT_BUTTON_LABEL = i18n.translate('xpack.searchBoost.projectDefaults.editButton', {
  defaultMessage: 'Edit',
});

const EDIT_PROJECT_DEFAULT_LABELS: Readonly<Record<BoostProfileType, string>> = {
  indices: i18n.translate('xpack.searchBoost.projectDefaults.indicesEditLabel', {
    defaultMessage: 'Edit the project default for indices',
  }),
  data_streams: i18n.translate('xpack.searchBoost.projectDefaults.dataStreamsEditLabel', {
    defaultMessage: 'Edit the project default for data streams',
  }),
};

export const getEditProjectDefaultLabel = (type: BoostProfileType): string =>
  EDIT_PROJECT_DEFAULT_LABELS[type];

export const CUSTOM_PROFILE_DESCRIPTION = i18n.translate(
  'xpack.searchBoost.projectDefaults.customProfile',
  {
    defaultMessage: 'Using a selected custom boost profile.',
  }
);

export const getViewProfileLabel = (profileName: string): string =>
  i18n.translate('xpack.searchBoost.projectDefaults.viewProfile', {
    defaultMessage: 'View boost profile "{profileName}"',
    values: { profileName },
  });

const SHOW_DEFAULT_MATCHES_A11Y_LABELS: Readonly<
  Record<BoostProfileType, (count: number) => string>
> = {
  indices: (count) =>
    i18n.translate('xpack.searchBoost.projectDefaults.indicesShowMatches', {
      defaultMessage:
        '{count, plural, one {# index} other {# indices}}. Show what the default for indices matches',
      values: { count },
    }),
  data_streams: (count) =>
    i18n.translate('xpack.searchBoost.projectDefaults.dataStreamsShowMatches', {
      defaultMessage:
        '{count, plural, one {# data stream} other {# data streams}}. Show what the default for data streams matches',
      values: { count },
    }),
};

export const getShowDefaultMatchesA11yLabel = (type: BoostProfileType, count: number): string =>
  SHOW_DEFAULT_MATCHES_A11Y_LABELS[type](count);
