/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

import type { BoostProfileType } from '../../../common/types';
import type { MaxAgeUnit } from '../../../common/profile_validation';

export const CREATE_TITLE = i18n.translate('xpack.searchBoost.profileFlyout.createTitle', {
  defaultMessage: 'Create boost profile',
});

export const getEditTitle = (profileName: string): string =>
  i18n.translate('xpack.searchBoost.profileFlyout.editTitle', {
    defaultMessage: 'Edit boost profile "{profileName}"',
    values: { profileName },
  });

/** The title when creating a profile from the rule flyout, before the rule has a name or after. */
export const getCreateForRuleTitle = (ruleName?: string): string =>
  ruleName
    ? i18n.translate('xpack.searchBoost.profileFlyout.createForRuleTitle', {
        defaultMessage: 'Create boost profile for rule "{ruleName}"',
        values: { ruleName },
      })
    : i18n.translate('xpack.searchBoost.profileFlyout.createForNewRuleTitle', {
        defaultMessage: 'Create boost profile for new rule',
      });

export const CREATE_FOR_DEFAULT_TITLES: Readonly<Record<BoostProfileType, string>> = {
  indices: i18n.translate('xpack.searchBoost.profileFlyout.createForIndicesDefaultTitle', {
    defaultMessage: 'Create boost profile for the indices default',
  }),
  data_streams: i18n.translate('xpack.searchBoost.profileFlyout.createForDataStreamsDefaultTitle', {
    defaultMessage: 'Create boost profile for the data streams default',
  }),
};

export const DESCRIPTION = i18n.translate('xpack.searchBoost.profileFlyout.description', {
  defaultMessage:
    'A boost profile defines how search resources are allocated to indices or data streams. It takes effect when a boost rule assigns it.',
});

export const BACK_BUTTON_LABEL = i18n.translate('xpack.searchBoost.profileFlyout.backButton', {
  defaultMessage: 'Back',
});

export const NAME_LABEL = i18n.translate('xpack.searchBoost.profileFlyout.nameLabel', {
  defaultMessage: 'Name',
});

export const NAME_HELP_TEXT = i18n.translate('xpack.searchBoost.profileFlyout.nameHelpText', {
  defaultMessage: 'Only lowercase letters, numbers, hyphens, and underscores allowed.',
});

export const NAME_TAKEN_ERROR = i18n.translate('xpack.searchBoost.profileFlyout.nameTaken', {
  defaultMessage: 'A boost profile with this name already exists.',
});

export const TYPE_TITLE = i18n.translate('xpack.searchBoost.profileFlyout.typeTitle', {
  defaultMessage: 'Type',
});

export const TYPE_DESCRIPTION = i18n.translate('xpack.searchBoost.profileFlyout.typeDescription', {
  defaultMessage: "The type can't be changed after the profile is created.",
});

export const TYPE_DESCRIPTIONS: Readonly<Record<BoostProfileType, string>> = {
  indices: i18n.translate('xpack.searchBoost.profileFlyout.indicesTypeDescription', {
    defaultMessage: 'Regular indices. Supports an extra copy, prewarm, and pinned data.',
  }),
  data_streams: i18n.translate('xpack.searchBoost.profileFlyout.dataStreamsTypeDescription', {
    defaultMessage: 'Time-series data, boosted by age: recent, standard, and background.',
  }),
};

export const BOOST_TITLE = i18n.translate('xpack.searchBoost.profileFlyout.boostTitle', {
  defaultMessage: 'Boost',
});

export const getBoostDescription = (min: number, max: number): string =>
  i18n.translate('xpack.searchBoost.profileFlyout.boostDescription', {
    defaultMessage:
      'Boost sets how many search resources a profile allocates. Higher values handle more queries; lower values cost less. The default minimum is 1. Enter values from {min, number} to {max, number}.',
    values: { min, max },
  });

export const LEARN_MORE_LINK = i18n.translate('xpack.searchBoost.profileFlyout.learnMoreLink', {
  defaultMessage: 'Learn more',
});

export const MIN_BOOST_LABEL = i18n.translate('xpack.searchBoost.profileFlyout.minBoostLabel', {
  defaultMessage: 'Min boost',
});

export const MAX_BOOST_LABEL = i18n.translate('xpack.searchBoost.profileFlyout.maxBoostLabel', {
  defaultMessage: 'Max boost',
});

export const MAX_AGE_LABEL = i18n.translate('xpack.searchBoost.profileFlyout.maxAgeLabel', {
  defaultMessage: 'Until data age',
});

export const MAX_AGE_UNIT_LABELS: Readonly<Record<MaxAgeUnit, string>> = {
  h: i18n.translate('xpack.searchBoost.profileFlyout.hoursUnit', { defaultMessage: 'hours' }),
  d: i18n.translate('xpack.searchBoost.profileFlyout.daysUnit', { defaultMessage: 'days' }),
};

export const MAX_AGE_UNIT_MENU_LABEL = i18n.translate(
  'xpack.searchBoost.profileFlyout.maxAgeUnitMenu',
  { defaultMessage: 'Age unit' }
);

export const getMaxAgeUnitButtonLabel = (unit: MaxAgeUnit): string =>
  i18n.translate('xpack.searchBoost.profileFlyout.maxAgeUnitButton', {
    defaultMessage: 'Age unit: {unit}',
    values: { unit: MAX_AGE_UNIT_LABELS[unit] },
  });

export const ADDITIONAL_OPTIONS_TITLE = i18n.translate(
  'xpack.searchBoost.profileFlyout.additionalOptionsTitle',
  { defaultMessage: 'Additional options' }
);

export const ONE_EXTRA_COPY_LABEL = i18n.translate(
  'xpack.searchBoost.profileFlyout.oneExtraCopyLabel',
  { defaultMessage: 'One extra copy' }
);

export const ONE_EXTRA_COPY_DESCRIPTION = i18n.translate(
  'xpack.searchBoost.profileFlyout.oneExtraCopyDescription',
  {
    defaultMessage:
      "Keep an additional copy of the data so search isn't affected if one copy becomes unavailable.",
  }
);

export const PREWARM_LABEL = i18n.translate('xpack.searchBoost.profileFlyout.prewarmLabel', {
  defaultMessage: 'Prewarm',
});

export const PREWARM_DESCRIPTION = i18n.translate(
  'xpack.searchBoost.profileFlyout.prewarmDescription',
  { defaultMessage: "Preload data into cache so the first query doesn't wait." }
);

export const PINNED_LABEL = i18n.translate('xpack.searchBoost.profileFlyout.pinnedLabel', {
  defaultMessage: 'Pinned',
});

export const PINNED_DESCRIPTION = i18n.translate(
  'xpack.searchBoost.profileFlyout.pinnedDescription',
  { defaultMessage: 'Protect cached data in proportion to min boost.' }
);

export const PINNED_NEEDS_PREWARM_TOOLTIP = i18n.translate(
  'xpack.searchBoost.profileFlyout.pinnedNeedsPrewarmTooltip',
  { defaultMessage: 'Turn on prewarm to protect cached data.' }
);

export const SAVE_BUTTON_LABEL = i18n.translate('xpack.searchBoost.profileFlyout.saveButton', {
  defaultMessage: 'Save',
});

export const SAVE_AND_CREATE_RULE_BUTTON_LABEL = i18n.translate(
  'xpack.searchBoost.profileFlyout.saveAndCreateRuleButton',
  { defaultMessage: 'Save and create rule' }
);

export const SAVE_AND_USE_IN_RULE_BUTTON_LABEL = i18n.translate(
  'xpack.searchBoost.profileFlyout.saveAndUseInRuleButton',
  { defaultMessage: 'Save and use in rule' }
);

export const SAVE_AND_USE_AS_DEFAULT_BUTTON_LABEL = i18n.translate(
  'xpack.searchBoost.profileFlyout.saveAndUseAsDefaultButton',
  { defaultMessage: 'Save and use as default' }
);
