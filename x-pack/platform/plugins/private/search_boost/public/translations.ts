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
    'Project-wide defaults determine the search resources allocated to your indices and data streams. Create boost rules to override those defaults with a different boost profile for specific indices or data streams.',
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

export const LOADING_LABEL = i18n.translate('xpack.searchBoost.page.loading', {
  defaultMessage: 'Loading boost settings…',
});

export const LOAD_ERROR_TITLE = i18n.translate('xpack.searchBoost.page.loadErrorTitle', {
  defaultMessage: 'Unable to load boost settings',
});

export const TRY_AGAIN_LABEL = i18n.translate('xpack.searchBoost.page.tryAgain', {
  defaultMessage: 'Try again',
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

export const CANCEL_BUTTON_LABEL = i18n.translate('xpack.searchBoost.flyout.cancelButton', {
  defaultMessage: 'Cancel',
});

export const SAVE_CHANGES_BUTTON_LABEL = i18n.translate(
  'xpack.searchBoost.flyout.saveChangesButton',
  { defaultMessage: 'Save changes' }
);

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

export const NO_MATCHES_MESSAGE = i18n.translate('xpack.searchBoost.matches.noMatches', {
  defaultMessage: 'This rule matches nothing yet.',
});

export const KEEP_INDEFINITELY = i18n.translate('xpack.searchBoost.matches.keepIndefinitely', {
  defaultMessage: 'Keep data indefinitely',
});

export const RETENTION_DISABLED = i18n.translate('xpack.searchBoost.matches.retentionDisabled', {
  defaultMessage: 'Disabled',
});

export const AFFECTED_CONTENT_LABEL = i18n.translate('xpack.searchBoost.modals.affectedContent', {
  defaultMessage: 'the affected indices and data streams',
});

export const LOAD_AFFECTED_ERROR_TITLE = i18n.translate(
  'xpack.searchBoost.modals.loadAffectedError',
  {
    defaultMessage: 'Unable to load the affected indices and data streams',
  }
);

export const AFFECTED_TARGET_COLUMNS: Readonly<Record<BoostProfileType, string>> = {
  indices: i18n.translate('xpack.searchBoost.modals.affectedIndexColumn', {
    defaultMessage: 'Affected index',
  }),
  data_streams: i18n.translate('xpack.searchBoost.modals.affectedDataStreamColumn', {
    defaultMessage: 'Affected data stream',
  }),
};

export const NEW_RULE_COLUMN = i18n.translate('xpack.searchBoost.modals.newRuleColumn', {
  defaultMessage: 'New rule',
});

export const NEW_PROFILE_COLUMN = i18n.translate('xpack.searchBoost.modals.newProfileColumn', {
  defaultMessage: 'New profile',
});

export const BOOST_RULE_COLUMN = i18n.translate('xpack.searchBoost.modals.boostRuleColumn', {
  defaultMessage: 'Boost rule',
});

export const getDeleteRuleTitle = (name: string): string =>
  i18n.translate('xpack.searchBoost.deleteRuleModal.title', {
    defaultMessage: 'Delete boost rule "{name}"?',
    values: { name },
  });

export const getDeleteRuleBodyWithFallbacks = (
  type: BoostProfileType,
  count: number,
  isEveryFallbackKnown: boolean
): string =>
  isEveryFallbackKnown
    ? i18n.translate('xpack.searchBoost.deleteRuleModal.bodyWithFallbacks', {
        defaultMessage:
          "Deleting this rule will cause the {targets} below to switch to the next matching rule and its boost profile. The boost profile for this rule won't be deleted. You can't undo this action.",
        values: { targets: formatTargetCount(type, count) },
      })
    : i18n.translate('xpack.searchBoost.deleteRuleModal.bodyWithSomeFallbacks', {
        defaultMessage:
          "Deleting this rule will cause the {targets} below to switch to the next matching rule and its boost profile, if there is one. The boost profile for this rule won't be deleted. You can't undo this action.",
        values: { targets: formatTargetCount(type, count) },
      });

export const DELETE_RULE_BODY = i18n.translate('xpack.searchBoost.deleteRuleModal.body', {
  defaultMessage:
    "This permanently deletes the rule. The boost profile for this rule won't be deleted. You can't undo this action.",
});

export const getDeleteRuleTableLabel = (type: BoostProfileType): string =>
  type === 'data_streams'
    ? i18n.translate('xpack.searchBoost.deleteRuleModal.dataStreamsTableLabel', {
        defaultMessage:
          'Data streams this rule applies to, and the rule and profile each will switch to',
      })
    : i18n.translate('xpack.searchBoost.deleteRuleModal.indicesTableLabel', {
        defaultMessage:
          'Indices this rule applies to, and the rule and profile each will switch to',
      });

export const DELETE_RULE_CONFIRM = i18n.translate('xpack.searchBoost.deleteRuleModal.confirm', {
  defaultMessage: 'Delete rule',
});

export const getDeleteProfileTitle = (name: string): string =>
  i18n.translate('xpack.searchBoost.deleteProfileModal.title', {
    defaultMessage: 'Delete boost profile "{name}"?',
    values: { name },
  });

export const DELETE_PROFILE_BODY = i18n.translate('xpack.searchBoost.deleteProfileModal.body', {
  defaultMessage: "This permanently deletes the profile. You can't undo this action.",
});

export const getDeleteProfileBodyWithRules = (ruleCount: number): string =>
  i18n.translate('xpack.searchBoost.deleteProfileModal.bodyWithRules', {
    defaultMessage:
      "{ruleCount, plural, one {Deleting this profile will also delete the boost rule that uses it.} other {Deleting this profile will also delete the # boost rules that use it.}} You can't undo this action.",
    values: { ruleCount },
  });

export const getDeleteProfileBodyWithFallbacks = (
  type: BoostProfileType,
  ruleCount: number,
  targetCount: number,
  isEveryFallbackKnown: boolean
): string => {
  if (isEveryFallbackKnown) {
    return type === 'data_streams'
      ? i18n.translate('xpack.searchBoost.deleteProfileModal.dataStreamsBodyWithFallbacks', {
          defaultMessage:
            "{ruleCount, plural, one {Deleting this profile will also delete the boost rule that uses it.} other {Deleting this profile will also delete the # boost rules that use it.}} {targetCount, plural, one {The # affected data stream will fall back to the next matching rule.} other {The # affected data streams will fall back to the next matching rule.}} You can't undo this action.",
          values: { ruleCount, targetCount },
        })
      : i18n.translate('xpack.searchBoost.deleteProfileModal.indicesBodyWithFallbacks', {
          defaultMessage:
            "{ruleCount, plural, one {Deleting this profile will also delete the boost rule that uses it.} other {Deleting this profile will also delete the # boost rules that use it.}} {targetCount, plural, one {The # affected index will fall back to the next matching rule.} other {The # affected indices will fall back to the next matching rule.}} You can't undo this action.",
          values: { ruleCount, targetCount },
        });
  }
  return type === 'data_streams'
    ? i18n.translate('xpack.searchBoost.deleteProfileModal.dataStreamsBodyWithSomeFallbacks', {
        defaultMessage:
          "{ruleCount, plural, one {Deleting this profile will also delete the boost rule that uses it.} other {Deleting this profile will also delete the # boost rules that use it.}} {targetCount, plural, one {The # affected data stream will fall back to the next matching rule, if there is one.} other {The # affected data streams will fall back to the next matching rule, if there is one.}} You can't undo this action.",
        values: { ruleCount, targetCount },
      })
    : i18n.translate('xpack.searchBoost.deleteProfileModal.indicesBodyWithSomeFallbacks', {
        defaultMessage:
          "{ruleCount, plural, one {Deleting this profile will also delete the boost rule that uses it.} other {Deleting this profile will also delete the # boost rules that use it.}} {targetCount, plural, one {The # affected index will fall back to the next matching rule, if there is one.} other {The # affected indices will fall back to the next matching rule, if there is one.}} You can't undo this action.",
        values: { ruleCount, targetCount },
      });
};

export const DELETED_RULES_LIST_LABEL = i18n.translate(
  'xpack.searchBoost.deleteProfileModal.rulesListLabel',
  {
    defaultMessage: 'Boost rules to be deleted',
  }
);

export const getDeletedRuleTableLabel = (type: BoostProfileType, ruleName: string): string =>
  type === 'data_streams'
    ? i18n.translate('xpack.searchBoost.deleteProfileModal.dataStreamsTableLabel', {
        defaultMessage:
          'Data streams that {ruleName} applies to, and the rule and profile each will switch to',
        values: { ruleName },
      })
    : i18n.translate('xpack.searchBoost.deleteProfileModal.indicesTableLabel', {
        defaultMessage:
          'Indices that {ruleName} applies to, and the rule and profile each will switch to',
        values: { ruleName },
      });

export const DELETE_PROFILE_CONFIRM = i18n.translate(
  'xpack.searchBoost.deleteProfileModal.confirm',
  {
    defaultMessage: 'Delete profile',
  }
);

export const getDeleteProfileWithRulesConfirm = (ruleCount: number): string =>
  i18n.translate('xpack.searchBoost.deleteProfileModal.confirmWithRules', {
    defaultMessage: 'Delete 1 profile and {ruleCount, plural, one {# rule} other {# rules}}',
    values: { ruleCount },
  });

export const getUpdateProfileTitle = (profileName: string): string =>
  i18n.translate('xpack.searchBoost.updateProfileModal.title', {
    defaultMessage: 'Update boost profile "{profileName}"?',
    values: { profileName },
  });

const getUpdateProfileBodyWithSaveAsNew = (type: BoostProfileType, count: number): string =>
  type === 'data_streams'
    ? i18n.translate('xpack.searchBoost.updateProfileModal.dataStreamsBody', {
        defaultMessage:
          '{count, plural, one {Saving these profile changes will affect the # data stream that currently uses it. Alternatively, you may save it as a new boost profile to avoid affecting this data stream.} other {Saving these profile changes will affect the # data streams that currently use it. Alternatively, you may save it as a new boost profile to avoid affecting these data streams.}}',
        values: { count },
      })
    : i18n.translate('xpack.searchBoost.updateProfileModal.indicesBody', {
        defaultMessage:
          '{count, plural, one {Saving these profile changes will affect the # index that currently uses it. Alternatively, you may save it as a new boost profile to avoid affecting this index.} other {Saving these profile changes will affect the # indices that currently use it. Alternatively, you may save it as a new boost profile to avoid affecting these indices.}}',
        values: { count },
      });

const getUpdateProfileBodyWithoutSaveAsNew = (type: BoostProfileType, count: number): string =>
  type === 'data_streams'
    ? i18n.translate('xpack.searchBoost.updateProfileModal.dataStreamsOnlyUpdateBody', {
        defaultMessage:
          '{count, plural, one {Saving these profile changes will affect the # data stream that currently uses it.} other {Saving these profile changes will affect the # data streams that currently use it.}}',
        values: { count },
      })
    : i18n.translate('xpack.searchBoost.updateProfileModal.indicesOnlyUpdateBody', {
        defaultMessage:
          '{count, plural, one {Saving these profile changes will affect the # index that currently uses it.} other {Saving these profile changes will affect the # indices that currently use it.}}',
        values: { count },
      });

export const getUpdateProfileBody = (
  type: BoostProfileType,
  count: number,
  canSaveAsNew: boolean
): string =>
  canSaveAsNew
    ? getUpdateProfileBodyWithSaveAsNew(type, count)
    : getUpdateProfileBodyWithoutSaveAsNew(type, count);

export const UPDATE_PROFILE_UNUSED_BODY: Readonly<Record<BoostProfileType, string>> = {
  indices: i18n.translate('xpack.searchBoost.updateProfileModal.indicesUnusedBody', {
    defaultMessage:
      "Saving these profile changes won't affect any indices, since no boost rule applies this profile to one.",
  }),
  data_streams: i18n.translate('xpack.searchBoost.updateProfileModal.dataStreamsUnusedBody', {
    defaultMessage:
      "Saving these profile changes won't affect any data streams, since no boost rule applies this profile to one.",
  }),
};

export const getUpdateProfileTableLabel = (type: BoostProfileType): string =>
  type === 'data_streams'
    ? i18n.translate('xpack.searchBoost.updateProfileModal.dataStreamsTableLabel', {
        defaultMessage: 'Data streams this profile applies to, and the rule that applies it',
      })
    : i18n.translate('xpack.searchBoost.updateProfileModal.indicesTableLabel', {
        defaultMessage: 'Indices this profile applies to, and the rule that applies it',
      });

export const SAVE_AS_NEW_LABEL = i18n.translate('xpack.searchBoost.updateProfileModal.saveAsNew', {
  defaultMessage: 'Save as new',
});

export const SAVE_LABEL = i18n.translate('xpack.searchBoost.updateProfileModal.save', {
  defaultMessage: 'Save',
});

export const SAVE_AS_NEW_TITLE = i18n.translate(
  'xpack.searchBoost.updateProfileModal.saveAsNewTitle',
  {
    defaultMessage: 'Save as new boost profile',
  }
);

export const PROFILE_NAME_HELP = i18n.translate('xpack.searchBoost.profileNameHelp', {
  defaultMessage: 'Only lowercase letters, numbers, hyphens, and underscores allowed.',
});

export const BACK_LABEL = i18n.translate('xpack.searchBoost.updateProfileModal.back', {
  defaultMessage: 'Back',
});

export const VIEW_ERROR_DETAILS_LABEL = i18n.translate(
  'xpack.searchBoost.errorDetails.viewDetails',
  {
    defaultMessage: 'View details',
  }
);

export const ERROR_DETAILS_TITLE = i18n.translate('xpack.searchBoost.errorDetails.title', {
  defaultMessage: 'What went wrong',
});

export const ERROR_DETAILS_TABLE_LABEL = i18n.translate(
  'xpack.searchBoost.errorDetails.tableLabel',
  {
    defaultMessage: 'Failed items and their reasons',
  }
);

export const ERROR_DETAILS_COLUMNS = {
  error: i18n.translate('xpack.searchBoost.errorDetails.errorColumn', { defaultMessage: 'Error' }),
  reason: i18n.translate('xpack.searchBoost.errorDetails.reasonColumn', {
    defaultMessage: 'Reason',
  }),
};

export const CLOSE_LABEL = i18n.translate('xpack.searchBoost.errorDetails.close', {
  defaultMessage: 'Close',
});

export const SETTINGS_TITLE = i18n.translate('xpack.searchBoost.details.settingsTitle', {
  defaultMessage: 'Settings',
});

export const USAGE_TITLE = i18n.translate('xpack.searchBoost.details.usageTitle', {
  defaultMessage: 'Usage',
});

export const BOOST_TIMELINE_TITLE = i18n.translate('xpack.searchBoost.details.timelineTitle', {
  defaultMessage: 'Boost phase timeline',
});

export const NOT_FOUND_BODY = i18n.translate('xpack.searchBoost.details.notFoundBody', {
  defaultMessage: 'It may have been deleted, or the link may be wrong.',
});

export const RULE_NOT_FOUND_TITLE = i18n.translate('xpack.searchBoost.ruleDetails.notFoundTitle', {
  defaultMessage: 'Boost rule not found',
});

export const BACK_TO_RULES_LABEL = i18n.translate('xpack.searchBoost.ruleDetails.notFoundBack', {
  defaultMessage: 'Back to boost rules',
});

export const BOOST_PROFILE_LABEL = i18n.translate('xpack.searchBoost.ruleDetails.profileLabel', {
  defaultMessage: 'Boost profile',
});

export const PRIORITY_INFO = i18n.translate('xpack.searchBoost.ruleDetails.priorityInfo', {
  defaultMessage:
    'When several rules match the same index or data stream, the highest priority applies.',
});

export const MATCHES_LABEL = i18n.translate('xpack.searchBoost.ruleDetails.matchesLabel', {
  defaultMessage: 'Matches',
});

export const RULE_APPLIES_TO_INFO = i18n.translate('xpack.searchBoost.ruleDetails.appliesToInfo', {
  defaultMessage: 'What this rule matches, less any that a higher-ranked rule applies to instead.',
});

export const PROFILE_NOT_FOUND_TITLE = i18n.translate(
  'xpack.searchBoost.profileDetails.notFoundTitle',
  {
    defaultMessage: 'Boost profile not found',
  }
);

export const BACK_TO_PROFILES_LABEL = i18n.translate(
  'xpack.searchBoost.profileDetails.notFoundBack',
  {
    defaultMessage: 'Back to boost profiles',
  }
);

export const PROFILE_APPLIES_TO_INFO = i18n.translate(
  'xpack.searchBoost.profileDetails.appliesToInfo',
  {
    defaultMessage:
      'What the rules using this profile match, less any that higher-ranked rules apply other profiles to.',
  }
);

export const PROFILE_RULES_TITLE = i18n.translate('xpack.searchBoost.profileDetails.rulesTitle', {
  defaultMessage: 'Boost rules using this profile',
});

export const NOT_IN_USE_TITLE = i18n.translate('xpack.searchBoost.profileDetails.notInUseTitle', {
  defaultMessage: "This profile isn't in use",
});

export const NOT_IN_USE_READ_ONLY_BODY = i18n.translate(
  'xpack.searchBoost.profileDetails.notInUseReadOnly',
  {
    defaultMessage: 'No boost rules use it yet.',
  }
);

export const NOT_IN_USE_BODIES: Readonly<Record<BoostProfileType, string>> = {
  indices: i18n.translate('xpack.searchBoost.profileDetails.notInUseIndices', {
    defaultMessage: 'No boost rules use it yet. Create one to boost indices with this profile.',
  }),
  data_streams: i18n.translate('xpack.searchBoost.profileDetails.notInUseDataStreams', {
    defaultMessage:
      'No boost rules use it yet. Create one to boost data streams with this profile.',
  }),
};

export const PROFILE_SETTING_LABELS = {
  boost: i18n.translate('xpack.searchBoost.profileSettings.boostLabel', {
    defaultMessage: 'Boost',
  }),
  oneExtraCopy: i18n.translate('xpack.searchBoost.profileSettings.oneExtraCopyLabel', {
    defaultMessage: 'One extra copy',
  }),
  prewarm: i18n.translate('xpack.searchBoost.profileSettings.prewarmLabel', {
    defaultMessage: 'Prewarm',
  }),
  pinned: i18n.translate('xpack.searchBoost.profileSettings.pinnedLabel', {
    defaultMessage: 'Pinned',
  }),
};

export const PROFILE_SETTING_DESCRIPTIONS = {
  oneExtraCopy: i18n.translate('xpack.searchBoost.profileSettings.oneExtraCopyInfo', {
    defaultMessage: 'Keep one extra copy of the data.',
  }),
  prewarm: i18n.translate('xpack.searchBoost.profileSettings.prewarmInfo', {
    defaultMessage: "Load data into cache ahead of time so the first query doesn't wait.",
  }),
  pinned: i18n.translate('xpack.searchBoost.profileSettings.pinnedInfo', {
    defaultMessage: 'Protect cached data in proportion to min boost.',
  }),
};

export const ON_LABEL = i18n.translate('xpack.searchBoost.profileSettings.on', {
  defaultMessage: 'On',
});

export const OFF_LABEL = i18n.translate('xpack.searchBoost.profileSettings.off', {
  defaultMessage: 'Off',
});

export const SKIPPED_LABEL = i18n.translate('xpack.searchBoost.profileSettings.skipped', {
  defaultMessage: 'Skipped',
});

export const BOOST_PERIOD_DESCRIPTIONS = {
  recent: i18n.translate('xpack.searchBoost.profileSettings.recentInfo', {
    defaultMessage: 'The newest data, up to the recent max age.',
  }),
  standard: i18n.translate('xpack.searchBoost.profileSettings.standardInfo', {
    defaultMessage: 'Data past the recent phase, up to the standard max age.',
  }),
  background: i18n.translate('xpack.searchBoost.profileSettings.backgroundInfo', {
    defaultMessage: 'Data older than the standard max age.',
  }),
};

export const formatPeriodBoost = (range: string): string =>
  i18n.translate('xpack.searchBoost.periodBoost', {
    defaultMessage: '{range} boost',
    values: { range },
  });
