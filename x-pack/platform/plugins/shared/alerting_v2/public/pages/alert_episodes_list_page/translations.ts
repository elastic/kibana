/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const EPISODES_LIST_PAGE_TITLE = i18n.translate('xpack.alertingV2.episodes.listPageTitle', {
  defaultMessage: 'Alert episodes',
});

export const EPISODES_LIST_TABLE_ARIA_LABEL = i18n.translate(
  'xpack.alertingV2.episodes.tableAriaLabel',
  {
    defaultMessage: 'Alerting episodes table',
  }
);

export const EPISODES_LIST_COLUMN_ACTIONS = i18n.translate(
  'xpack.alertingV2.episodes.columns.actions',
  {
    defaultMessage: 'Actions',
  }
);

export const EPISODES_LIST_COLUMN_TAGS = i18n.translate('xpack.alertingV2.episodes.columns.tags', {
  defaultMessage: 'Tags',
});

export const EPISODES_LIST_COLUMN_ASSIGNEES = i18n.translate(
  'xpack.alertingV2.episodes.columns.assignees',
  {
    defaultMessage: 'Assignee',
  }
);

export const EPISODES_ASSIGNEE_EMPTY = i18n.translate('xpack.alertingV2.episodes.assignees.empty', {
  defaultMessage: '—',
});

export const EPISODES_ASSIGNEE_PROFILE_LOAD_ERROR = i18n.translate(
  'xpack.alertingV2.episodes.assignees.profileLoadError',
  {
    defaultMessage: 'Could not load profile',
  }
);

export const EPISODES_ASSIGNEE_UNKNOWN_USER = i18n.translate(
  'xpack.alertingV2.episodes.assignees.unknownUser',
  {
    defaultMessage: 'Unknown user',
  }
);
