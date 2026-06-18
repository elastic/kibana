/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const TIMELINE_ARIA_LABEL = i18n.translate(
  'xpack.changeHistoryUi.timeline.ariaLabel',
  {
    defaultMessage: 'Change history timeline',
  }
);

export const CURRENT_CHANGE_BADGE = i18n.translate(
  'xpack.changeHistoryUi.timeline.currentChangeBadge',
  {
    defaultMessage: 'Current',
  }
);

export const N_CHANGES = (count: number): string =>
  i18n.translate('xpack.changeHistoryUi.timeline.nChanges', {
    defaultMessage: '{count, plural, one {# change} other {# changes}}',
    values: { count },
  });

export const NO_CHANGE_HISTORY_TITLE = i18n.translate(
  'xpack.changeHistoryUi.timeline.emptyTitle',
  {
    defaultMessage: 'No changes have been recorded yet.',
  }
);

export const NO_CHANGE_HISTORY_BODY = i18n.translate(
  'xpack.changeHistoryUi.timeline.emptyBody',
  {
    defaultMessage: 'Subsequent edits will appear here.',
  }
);

export const LOADING_LABEL = i18n.translate('xpack.changeHistoryUi.timeline.loadingLabel', {
  defaultMessage: 'Loading change history',
});

export const COMMENT_TOGGLE_ARIA_LABEL = i18n.translate(
  'xpack.changeHistoryUi.timeline.commentToggleAriaLabel',
  {
    defaultMessage: 'Toggle change comment',
  }
);
