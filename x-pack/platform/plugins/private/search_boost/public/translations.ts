/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { BoostProfileType } from '../common/types';
import type { ManagedProfileName } from '../common/managed_profiles';
import { isManagedProfileName } from '../common/managed_profiles';

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

interface ManagedProfileMessage {
  label: string;
  description: string;
}

const MANAGED_PROFILE_MESSAGES: Readonly<Record<ManagedProfileName, ManagedProfileMessage>> = {
  default_indices: {
    label: i18n.translate('xpack.searchBoost.managedProfile.defaultIndices.label', {
      defaultMessage: 'Default',
    }),
    description: i18n.translate('xpack.searchBoost.managedProfile.defaultIndices.description', {
      defaultMessage:
        'Consistently low average latency, scaling to high query throughput as load grows.',
    }),
  },
  data_streams_1d: {
    label: i18n.translate('xpack.searchBoost.managedProfile.last1DayDataStreams.label', {
      defaultMessage: 'Last 1 day',
    }),
    description: i18n.translate(
      'xpack.searchBoost.managedProfile.last1DayDataStreams.description',
      {
        defaultMessage: 'Only the most recent day of each data stream is kept search\u2011ready.',
      }
    ),
  },
  data_streams_3d: {
    label: i18n.translate('xpack.searchBoost.managedProfile.last3DaysDataStreams.label', {
      defaultMessage: 'Last 3 days',
    }),
    description: i18n.translate(
      'xpack.searchBoost.managedProfile.last3DaysDataStreams.description',
      {
        defaultMessage: 'The most recent 3 days of each data stream are kept search\u2011ready.',
      }
    ),
  },
  default_data_streams_7d: {
    label: i18n.translate('xpack.searchBoost.managedProfile.last7DaysDataStreams.label', {
      defaultMessage: 'Last 7 days',
    }),
    description: i18n.translate(
      'xpack.searchBoost.managedProfile.last7DaysDataStreams.description',
      {
        defaultMessage: 'The most recent week of each data stream is kept search\u2011ready.',
      }
    ),
  },
};

/** Label and description of an Elastic-managed profile, or `undefined` for any other profile name. */
export const getManagedProfileMessage = (profileName: string): ManagedProfileMessage | undefined =>
  isManagedProfileName(profileName) ? MANAGED_PROFILE_MESSAGES[profileName] : undefined;

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

export const formatTargetCount = (type: BoostProfileType, count: number): string =>
  type === 'data_streams'
    ? i18n.translate('xpack.searchBoost.targetCount.dataStreams', {
        defaultMessage: '{count, plural, one {# data stream} other {# data streams}}',
        values: { count },
      })
    : i18n.translate('xpack.searchBoost.targetCount.indices', {
        defaultMessage: '{count, plural, one {# index} other {# indices}}',
        values: { count },
      });

export const getShowingOneLabel = (first: number, total: string): string =>
  i18n.translate('xpack.searchBoost.tableCount.showingOne', {
    defaultMessage: 'Showing {first, number} of {total}',
    values: { first, total },
  });

export const getShowingRangeLabel = (first: number, last: number, total: string): string =>
  i18n.translate('xpack.searchBoost.tableCount.showingRange', {
    defaultMessage: 'Showing {first, number}–{last, number} of {total}',
    values: { first, last, total },
  });

export const RULES_TAB_LABEL = i18n.translate('xpack.searchBoost.tabs.rules', {
  defaultMessage: 'Boost rules',
});

export const PROFILES_TAB_LABEL = i18n.translate('xpack.searchBoost.tabs.profiles', {
  defaultMessage: 'Boost profiles',
});

export const NO_ITEMS_FOUND = i18n.translate('xpack.searchBoost.noItemsFound', {
  defaultMessage: 'No items found',
});

export const DUPLICATE_LABEL = i18n.translate('xpack.searchBoost.actions.duplicate', {
  defaultMessage: 'Duplicate',
});

export const DELETE_LABEL = i18n.translate('xpack.searchBoost.actions.delete', {
  defaultMessage: 'Delete',
});

export const PROFILE_NAME_LABEL = i18n.translate('xpack.searchBoost.profileName', {
  defaultMessage: 'Profile name',
});

export const STORAGE_SIZE_LABEL = i18n.translate('xpack.searchBoost.storageSize', {
  defaultMessage: 'Storage size',
});

export const RULES_LIST_LABELS = {
  entity: i18n.translate('xpack.searchBoost.rules.entity', { defaultMessage: 'boost rule' }),
  entityPlural: i18n.translate('xpack.searchBoost.rules.entityPlural', {
    defaultMessage: 'boost rules',
  }),
  searchPlaceholder: i18n.translate('xpack.searchBoost.rules.searchPlaceholder', {
    defaultMessage: 'Search boost rules',
  }),
};

export const RULES_TABLE_CAPTION = i18n.translate('xpack.searchBoost.rules.tableCaption', {
  defaultMessage: 'Boost rules',
});

export const CREATE_RULE_LABEL = i18n.translate('xpack.searchBoost.rules.createButton', {
  defaultMessage: 'Create boost rule',
});

export const PROFILE_FILTER_LABEL = i18n.translate('xpack.searchBoost.rules.profileFilter', {
  defaultMessage: 'Profile',
});

export const DEFAULT_RULE_BADGE = i18n.translate('xpack.searchBoost.rules.defaultBadge', {
  defaultMessage: 'Default',
});

export const RULE_COLUMNS = {
  name: i18n.translate('xpack.searchBoost.rules.nameColumn', { defaultMessage: 'Rule name' }),
  targets: i18n.translate('xpack.searchBoost.rules.targetsColumn', { defaultMessage: 'Targets' }),
  priority: i18n.translate('xpack.searchBoost.rules.priorityColumn', {
    defaultMessage: 'Priority',
  }),
  appliesTo: i18n.translate('xpack.searchBoost.rules.appliesToColumn', {
    defaultMessage: 'Applies to',
  }),
};

export const formatRuleCount = (count: number): string =>
  i18n.translate('xpack.searchBoost.rules.count', {
    defaultMessage: '{count, plural, one {# boost rule} other {# boost rules}}',
    values: { count },
  });

export const PROFILES_LIST_LABELS = {
  entity: i18n.translate('xpack.searchBoost.profiles.entity', {
    defaultMessage: 'boost profile',
  }),
  entityPlural: i18n.translate('xpack.searchBoost.profiles.entityPlural', {
    defaultMessage: 'boost profiles',
  }),
  searchPlaceholder: i18n.translate('xpack.searchBoost.profiles.searchPlaceholder', {
    defaultMessage: 'Search boost profiles',
  }),
};

export const PROFILES_TABLE_CAPTION = i18n.translate('xpack.searchBoost.profiles.tableCaption', {
  defaultMessage: 'Boost profiles',
});

export const CREATE_PROFILE_LABEL = i18n.translate('xpack.searchBoost.profiles.createButton', {
  defaultMessage: 'Create boost profile',
});

export const MANAGED_PROFILE_BADGE = i18n.translate('xpack.searchBoost.profiles.managedBadge', {
  defaultMessage: 'Managed',
});

export const MANAGED_EDIT_REASON = i18n.translate('xpack.searchBoost.profiles.managedEditReason', {
  defaultMessage: "Elastic manages this profile, so it can't be edited.",
});

export const USED_BY_DEFAULT_RULE_REASONS: Readonly<Record<BoostProfileType, string>> = {
  indices: i18n.translate('xpack.searchBoost.profiles.usedByDefaultIndicesRule', {
    defaultMessage: "The default rule for indices uses this profile, so it can't be deleted.",
  }),
  data_streams: i18n.translate('xpack.searchBoost.profiles.usedByDefaultDataStreamsRule', {
    defaultMessage: "The default rule for data streams uses this profile, so it can't be deleted.",
  }),
};

export const PROFILE_COLUMNS = {
  type: i18n.translate('xpack.searchBoost.profiles.typeColumn', { defaultMessage: 'Type' }),
  minBoost: i18n.translate('xpack.searchBoost.profiles.minBoostColumn', {
    defaultMessage: 'Min boost',
  }),
  maxBoost: i18n.translate('xpack.searchBoost.profiles.maxBoostColumn', {
    defaultMessage: 'Max boost',
  }),
  rulesUsing: i18n.translate('xpack.searchBoost.profiles.rulesUsingColumn', {
    defaultMessage: 'Rules using',
  }),
};

export const formatProfileCount = (count: number): string =>
  i18n.translate('xpack.searchBoost.profiles.count', {
    defaultMessage: '{count, plural, one {# boost profile} other {# boost profiles}}',
    values: { count },
  });

export const getRulesLinkLabel = (count: number, name: string): string =>
  i18n.translate('xpack.searchBoost.profiles.rulesUsingLinkLabel', {
    defaultMessage:
      'View {count, plural, one {# rule} other {# rules}} using boost profile "{name}"',
    values: { count, name },
  });

export const MATCHES_LABELS: Readonly<
  Record<
    BoostProfileType,
    {
      list: { entity: string; entityPlural: string; searchPlaceholder: string };
      title: string;
      name: string;
      noHidden: string;
      onlyHidden: string;
      noSearchMatches: string;
    }
  >
> = {
  indices: {
    list: {
      entity: i18n.translate('xpack.searchBoost.matches.index', { defaultMessage: 'index' }),
      entityPlural: i18n.translate('xpack.searchBoost.matches.indices', {
        defaultMessage: 'indices',
      }),
      searchPlaceholder: i18n.translate('xpack.searchBoost.matches.searchIndices', {
        defaultMessage: 'Search indices',
      }),
    },
    title: MATCHING_INDICES_TITLE,
    name: i18n.translate('xpack.searchBoost.matches.indexColumn', { defaultMessage: 'Index' }),
    noHidden: i18n.translate('xpack.searchBoost.matches.noHiddenIndices', {
      defaultMessage: 'This rule matches no hidden indices.',
    }),
    onlyHidden: i18n.translate('xpack.searchBoost.matches.onlyHiddenIndices', {
      defaultMessage: 'Only hidden indices match. Show hidden to see them.',
    }),
    noSearchMatches: i18n.translate('xpack.searchBoost.matches.noIndicesMatchSearch', {
      defaultMessage: 'No indices match your search or filter.',
    }),
  },
  data_streams: {
    list: {
      entity: i18n.translate('xpack.searchBoost.matches.dataStream', {
        defaultMessage: 'data stream',
      }),
      entityPlural: i18n.translate('xpack.searchBoost.matches.dataStreams', {
        defaultMessage: 'data streams',
      }),
      searchPlaceholder: i18n.translate('xpack.searchBoost.matches.searchDataStreams', {
        defaultMessage: 'Search data streams',
      }),
    },
    title: MATCHING_DATA_STREAMS_TITLE,
    name: i18n.translate('xpack.searchBoost.matches.dataStreamColumn', {
      defaultMessage: 'Data stream',
    }),
    noHidden: i18n.translate('xpack.searchBoost.matches.noHiddenDataStreams', {
      defaultMessage: 'This rule matches no hidden data streams.',
    }),
    onlyHidden: i18n.translate('xpack.searchBoost.matches.onlyHiddenDataStreams', {
      defaultMessage: 'Only hidden data streams match. Show hidden to see them.',
    }),
    noSearchMatches: i18n.translate('xpack.searchBoost.matches.noDataStreamsMatchSearch', {
      defaultMessage: 'No data streams match your search or filter.',
    }),
  },
};

export const MATCH_STATUS_LABELS = {
  applied: i18n.translate('xpack.searchBoost.matches.appliedFilter', { defaultMessage: 'Applied' }),
  outranked: i18n.translate('xpack.searchBoost.matches.outrankedFilter', {
    defaultMessage: 'Outranked',
  }),
};

export const NO_MATCH_STATUS_REASONS = {
  applied: i18n.translate('xpack.searchBoost.matches.noneApplied', {
    defaultMessage: 'This rule applies to none of these matches.',
  }),
  outranked: i18n.translate('xpack.searchBoost.matches.noneOutranked', {
    defaultMessage: 'No higher-ranked rule outranks this one for any of these matches.',
  }),
};

export const OUTRANKED_BY_COLUMN = i18n.translate('xpack.searchBoost.matches.outrankedByColumn', {
  defaultMessage: 'Outranked by rule',
});

export const OUTRANKED_BY_TOOLTIP = i18n.translate('xpack.searchBoost.matches.outrankedByTooltip', {
  defaultMessage:
    "A higher-ranked rule that applies to the match instead. To outrank it, increase this rule's priority.",
});

export const RETENTION_COLUMN = i18n.translate('xpack.searchBoost.matches.retentionColumn', {
  defaultMessage: 'Data retention',
});

export const SHOW_HIDDEN_LABEL = i18n.translate('xpack.searchBoost.matches.showHidden', {
  defaultMessage: 'Show hidden',
});

export const HIDDEN_BADGE = i18n.translate('xpack.searchBoost.matches.hiddenBadge', {
  defaultMessage: 'Hidden',
});

export const NO_MATCHES_MESSAGE = i18n.translate('xpack.searchBoost.matches.noMatches', {
  defaultMessage: 'This rule matches nothing yet.',
});

export const KEEP_INDEFINITELY = i18n.translate('xpack.searchBoost.matches.keepIndefinitely', {
  defaultMessage: 'Keep data indefinitely',
});

export const RETENTION_DISABLED = i18n.translate('xpack.searchBoost.matches.retentionDisabled', {
  defaultMessage: 'Disabled',
});

export const formatMatchesTotal = (
  type: BoostProfileType,
  count: number,
  hiddenCount: number
): string =>
  hiddenCount > 0
    ? i18n.translate('xpack.searchBoost.matches.totalWithHidden', {
        defaultMessage: '{total} · {hiddenCount, number} hidden',
        values: { total: formatTargetCount(type, count), hiddenCount },
      })
    : formatTargetCount(type, count);
