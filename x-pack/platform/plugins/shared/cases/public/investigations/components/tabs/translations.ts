/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const TAB_COMING_TITLE = (tab: string) =>
  i18n.translate('xpack.cases.investigations.tabs.comingTitle', {
    defaultMessage: 'The {tab} tab is coming',
    values: { tab },
  });

export const TAB_COMING_BODY = i18n.translate('xpack.cases.investigations.tabs.comingBody', {
  defaultMessage: 'This part of the investigation is being built.',
});

export const OVERVIEW = i18n.translate('xpack.cases.investigations.tabs.overview', {
  defaultMessage: 'Overview',
});
export const CONVERSATION = i18n.translate('xpack.cases.investigations.tabs.conversation', {
  defaultMessage: 'Conversation',
});
export const EVIDENCE = i18n.translate('xpack.cases.investigations.tabs.evidence', {
  defaultMessage: 'Evidence',
});
export const SCOPE = i18n.translate('xpack.cases.investigations.tabs.scope', {
  defaultMessage: 'Scope',
});
export const PROCEDURE = i18n.translate('xpack.cases.investigations.tabs.procedure', {
  defaultMessage: 'Procedure',
});
export const ACTIVITY = i18n.translate('xpack.cases.investigations.tabs.activity', {
  defaultMessage: 'Activity',
});
