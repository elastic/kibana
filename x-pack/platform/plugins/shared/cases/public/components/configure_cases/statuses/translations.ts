/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const TITLE = i18n.translate('xpack.cases.configureCases.statuses.title', {
  defaultMessage: 'Case statuses',
});

export const DESCRIPTION = i18n.translate('xpack.cases.configureCases.statuses.description', {
  defaultMessage:
    'Define the statuses your team uses. Each status belongs to Open, In progress, or Closed, so alerts, automations, and reports keep working the way they do today.',
});

export const ENABLED_COUNT = (count: number) =>
  i18n.translate('xpack.cases.configureCases.statuses.enabledCount', {
    values: { count },
    defaultMessage: '{count} enabled',
  });

export const ADD_STATUS = i18n.translate('xpack.cases.configureCases.statuses.addStatus', {
  defaultMessage: 'Add status',
});

export const MAX_STATUSES = (max: number, category: string) =>
  i18n.translate('xpack.cases.configureCases.statuses.maxStatuses', {
    values: { max, category },
    defaultMessage: 'You can have up to {max} statuses under {category}.',
  });

export const DEFAULT_BADGE = i18n.translate('xpack.cases.configureCases.statuses.defaultBadge', {
  defaultMessage: 'Default',
});

export const DISABLED_BADGE = i18n.translate('xpack.cases.configureCases.statuses.disabledBadge', {
  defaultMessage: 'Disabled',
});

export const ACTIONS_FOR = (label: string) =>
  i18n.translate('xpack.cases.configureCases.statuses.actionsFor', {
    values: { label },
    defaultMessage: 'Actions for {label}',
  });

export const EDIT = i18n.translate('xpack.cases.configureCases.statuses.edit', {
  defaultMessage: 'Edit',
});

export const SET_AS_DEFAULT = i18n.translate('xpack.cases.configureCases.statuses.setAsDefault', {
  defaultMessage: 'Set as default',
});

export const MOVE_UP = i18n.translate('xpack.cases.configureCases.statuses.moveUp', {
  defaultMessage: 'Move up',
});

export const MOVE_DOWN = i18n.translate('xpack.cases.configureCases.statuses.moveDown', {
  defaultMessage: 'Move down',
});

export const DISABLE = i18n.translate('xpack.cases.configureCases.statuses.disable', {
  defaultMessage: 'Disable',
});

export const ENABLE = i18n.translate('xpack.cases.configureCases.statuses.enable', {
  defaultMessage: 'Enable',
});

export const CANNOT_DISABLE_DEFAULT = i18n.translate(
  'xpack.cases.configureCases.statuses.cannotDisableDefault',
  {
    defaultMessage: 'Set another status as the default first.',
  }
);

export const CANNOT_DISABLE_LAST = i18n.translate(
  'xpack.cases.configureCases.statuses.cannotDisableLast',
  {
    defaultMessage: 'Each category needs at least one enabled status.',
  }
);

export const ENABLE_FIRST = i18n.translate('xpack.cases.configureCases.statuses.enableFirst', {
  defaultMessage: 'Enable this status first.',
});

export const ADD_STATUS_UNDER = (category: string) =>
  i18n.translate('xpack.cases.configureCases.statuses.addStatusUnder', {
    values: { category },
    defaultMessage: 'Add status under {category}',
  });

export const EDIT_STATUS = i18n.translate('xpack.cases.configureCases.statuses.editStatus', {
  defaultMessage: 'Edit status',
});

export const LABEL = i18n.translate('xpack.cases.configureCases.statuses.label', {
  defaultMessage: 'Label',
});

export const LABEL_HELP = i18n.translate('xpack.cases.configureCases.statuses.labelHelp', {
  defaultMessage: 'Shown on cases, in filters, and in the activity feed.',
});

export const API_VALUE = i18n.translate('xpack.cases.configureCases.statuses.apiValue', {
  defaultMessage: 'API value',
});

export const API_VALUE_HELP = i18n.translate('xpack.cases.configureCases.statuses.apiValueHelp', {
  defaultMessage: 'Use this key when setting status_key through the API. It cannot be changed.',
});

export const REQUIRED_LABEL = i18n.translate('xpack.cases.configureCases.statuses.requiredLabel', {
  defaultMessage: 'Enter a label.',
});

export const DUPLICATE_LABEL = (category: string) =>
  i18n.translate('xpack.cases.configureCases.statuses.duplicateLabel', {
    values: { category },
    defaultMessage: 'A status with this label already exists under {category}.',
  });

export const MAX_LABEL_LENGTH = (max: number) =>
  i18n.translate('xpack.cases.configureCases.statuses.maxLabelLength', {
    values: { max },
    defaultMessage: 'Labels can be up to {max} characters.',
  });
