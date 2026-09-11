/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { AppHeader } from '@kbn/app-header';
import { i18n } from '@kbn/i18n';

export interface LogsListHeaderProps {
  backHref: string;
  docLink: string;
}

const LOGS_PAGE_TITLE = i18n.translate('xpack.triggersActionsUI.rulesLogsPage.pageTitle', {
  defaultMessage: 'Logs',
});

const BACK_TO_RULES_LABEL = i18n.translate(
  'xpack.triggersActionsUI.rulesLogsPage.backToRulesButtonLabel',
  {
    defaultMessage: 'Rules',
  }
);

/**
 * Header for the v1 Rules Logs page: a child-page heading with its own title and a back
 * button to Rules, and no tabs or Settings entry.
 */
export const LogsListHeader = ({ backHref, docLink }: LogsListHeaderProps) => {
  return (
    <AppHeader
      title={LOGS_PAGE_TITLE}
      spacing="bleed"
      back={{ href: backHref, label: BACK_TO_RULES_LABEL }}
      docLink={docLink}
    />
  );
};
