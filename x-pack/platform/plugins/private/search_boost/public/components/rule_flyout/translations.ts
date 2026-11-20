/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

import type { BoostProfileType } from '../../../common/types';

export const CREATE_TITLE = i18n.translate('xpack.searchBoost.ruleFlyout.createTitle', {
  defaultMessage: 'Create boost rule',
});

export const getEditTitle = (ruleName: string): string =>
  i18n.translate('xpack.searchBoost.ruleFlyout.editTitle', {
    defaultMessage: 'Edit boost rule "{ruleName}"',
    values: { ruleName },
  });

export const DESCRIPTION = i18n.translate('xpack.searchBoost.ruleFlyout.description', {
  defaultMessage:
    'A rule assigns a profile to indices or data streams. If more than one rule matches, the rule with the highest priority applies. If none of the other rules match, the project default applies.',
});

export const NAME_LABEL = i18n.translate('xpack.searchBoost.ruleFlyout.nameLabel', {
  defaultMessage: 'Name',
});

export const NAME_HELP_TEXT = i18n.translate('xpack.searchBoost.ruleFlyout.nameHelpText', {
  defaultMessage: 'Only lowercase letters, numbers, hyphens, and underscores allowed.',
});

export const NAME_TAKEN_ERROR = i18n.translate('xpack.searchBoost.ruleFlyout.nameTaken', {
  defaultMessage: 'A boost rule with this name already exists.',
});

export const PROFILE_LABEL = i18n.translate('xpack.searchBoost.ruleFlyout.profileLabel', {
  defaultMessage: 'Boost profile',
});

export const CREATE_PROFILE_LINK = i18n.translate(
  'xpack.searchBoost.ruleFlyout.createProfileLink',
  { defaultMessage: 'Create profile' }
);

export const PROFILE_HELP_TEXT = i18n.translate('xpack.searchBoost.ruleFlyout.profileHelpText', {
  defaultMessage:
    'Profile selection determines whether this rule applies to indices or data streams.',
});

export const LOCKED_PROFILE_HELP_TEXTS: Readonly<Record<BoostProfileType, string>> = {
  indices: i18n.translate('xpack.searchBoost.ruleFlyout.lockedIndicesProfileHelpText', {
    defaultMessage:
      "Lists only indices profiles, since a rule can't switch types after it's created.",
  }),
  data_streams: i18n.translate('xpack.searchBoost.ruleFlyout.lockedDataStreamsProfileHelpText', {
    defaultMessage:
      "Lists only data stream profiles, since a rule can't switch types after it's created.",
  }),
};

export const PROFILE_NO_MATCH = i18n.translate('xpack.searchBoost.ruleFlyout.profileNoMatch', {
  defaultMessage: "{searchValue} doesn't match any boost profile",
  // EuiComboBox fills in the search value itself.
  values: { searchValue: '{searchValue}' },
});

export const PROFILE_REQUIRED_ERROR = i18n.translate(
  'xpack.searchBoost.ruleFlyout.profileRequired',
  { defaultMessage: 'Select a boost profile.' }
);

export const INDEX_PATTERN_LABEL = i18n.translate(
  'xpack.searchBoost.ruleFlyout.indexPatternLabel',
  { defaultMessage: 'Index pattern or name' }
);

const PLACEHOLDER_EXAMPLES: Readonly<Record<BoostProfileType, { pattern: string; name: string }>> =
  {
    indices: { pattern: 'products-*', name: 'products' },
    data_streams: { pattern: 'logs-*', name: 'logs-nginx-default' },
  };

export const getIndexPatternPlaceholder = (type: BoostProfileType): string => {
  const { pattern, name } = PLACEHOLDER_EXAMPLES[type];
  return i18n.translate('xpack.searchBoost.ruleFlyout.indexPatternPlaceholder', {
    defaultMessage: 'Example: {pattern} or {name}',
    values: { pattern, name },
  });
};

export const SELECT_PROFILE_FIRST_TOOLTIP = i18n.translate(
  'xpack.searchBoost.ruleFlyout.selectProfileFirstTooltip',
  { defaultMessage: 'Select a boost profile to choose targets.' }
);

export const PRIORITY_LABEL = i18n.translate('xpack.searchBoost.ruleFlyout.priorityLabel', {
  defaultMessage: 'Priority',
});

export const getPriorityTieError = (ruleName: string): string =>
  i18n.translate('xpack.searchBoost.ruleFlyout.priorityTie', {
    defaultMessage: 'Ties with rule "{ruleName}".',
    values: { ruleName },
  });

export const CREATE_RULE_BUTTON_LABEL = i18n.translate(
  'xpack.searchBoost.ruleFlyout.createRuleButton',
  { defaultMessage: 'Create rule' }
);

export const TARGET_LIST_PROMPTS: Readonly<Record<BoostProfileType, string>> = {
  indices: i18n.translate('xpack.searchBoost.ruleFlyout.indicesListPrompt', {
    defaultMessage: 'Enter a pattern or select an index',
  }),
  data_streams: i18n.translate('xpack.searchBoost.ruleFlyout.dataStreamsListPrompt', {
    defaultMessage: 'Enter a pattern or select a data stream',
  }),
};

export const getExactMatchesCount = (count: number): string =>
  i18n.translate('xpack.searchBoost.ruleFlyout.exactMatchesCount', {
    defaultMessage: '{count, plural, one {# exact match} other {# exact matches}}',
    values: { count },
  });

export const getPartialMatchesCount = (count: number): string =>
  i18n.translate('xpack.searchBoost.ruleFlyout.partialMatchesCount', {
    defaultMessage: '{count, plural, one {# partial match} other {# partial matches}}',
    values: { count },
  });

export const NO_MATCHES_COUNT = i18n.translate('xpack.searchBoost.ruleFlyout.noMatchesCount', {
  defaultMessage: '0 matches',
});

export const NO_MATCHES_DETECTED = i18n.translate(
  'xpack.searchBoost.ruleFlyout.noMatchesDetected',
  { defaultMessage: 'No matches detected' }
);

export const NO_TARGETS_DETECTED: Readonly<Record<BoostProfileType, string>> = {
  indices: i18n.translate('xpack.searchBoost.ruleFlyout.noIndicesDetected', {
    defaultMessage: 'No indices detected',
  }),
  data_streams: i18n.translate('xpack.searchBoost.ruleFlyout.noDataStreamsDetected', {
    defaultMessage: 'No data streams detected',
  }),
};

export const MATCH_LABELS = {
  exact: i18n.translate('xpack.searchBoost.ruleFlyout.exactMatch', {
    defaultMessage: 'Exact match',
  }),
  partial: i18n.translate('xpack.searchBoost.ruleFlyout.partialMatch', {
    defaultMessage: 'Partial match',
  }),
} as const;

export const LIST_OPTIONS_LABEL = i18n.translate('xpack.searchBoost.ruleFlyout.listOptions', {
  defaultMessage: 'List options',
});

export const SHOW_UNMATCHED_LABEL = i18n.translate('xpack.searchBoost.ruleFlyout.showUnmatched', {
  defaultMessage: 'Show unmatched',
});

export const UNFILTERED_LIST_REASON = i18n.translate(
  'xpack.searchBoost.ruleFlyout.unfilteredListReason',
  { defaultMessage: "The list isn't filtered until you enter a pattern or name." }
);

export const NO_HIDDEN_TARGETS_REASONS: Readonly<Record<BoostProfileType, string>> = {
  indices: i18n.translate('xpack.searchBoost.ruleFlyout.noHiddenIndices', {
    defaultMessage: 'There are no hidden indices.',
  }),
  data_streams: i18n.translate('xpack.searchBoost.ruleFlyout.noHiddenDataStreams', {
    defaultMessage: 'There are no hidden data streams.',
  }),
};
