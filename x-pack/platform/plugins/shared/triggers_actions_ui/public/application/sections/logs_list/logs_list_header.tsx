/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { AppHeader } from '@kbn/app-header';
import { i18n } from '@kbn/i18n';
import { getRulesPageMenu } from '../rules_page/get_rules_page_menu';

export interface LogsListHeaderProps {
  backHref: string;
  canShowSettings: boolean;
  docLink: string;
  onOpenSettings: () => void;
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
 * Destination header for the v1 Rules Logs page. Distinct from the Rules list
 * header so Logs is a child page (title + back) rather than a second mode of
 * the same heading.
 */
export const LogsListHeader = ({
  backHref,
  canShowSettings,
  docLink,
  onOpenSettings,
}: LogsListHeaderProps) => {
  const menu = useMemo(
    () =>
      getRulesPageMenu({
        authorizedToCreateAnyRules: false,
        canShowSettings,
        onOpenSettings,
      }),
    [canShowSettings, onOpenSettings]
  );

  return (
    <AppHeader
      title={LOGS_PAGE_TITLE}
      spacing="bleed"
      back={{ href: backHref, label: BACK_TO_RULES_LABEL }}
      docLink={docLink}
      menu={menu}
    />
  );
};
