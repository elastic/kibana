/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { AppHeader, type AppHeaderTab } from '@kbn/app-header';
import { i18n } from '@kbn/i18n';
import type { AppMenuConfig } from '@kbn/core-chrome-app-menu-components';

export interface RulesPageHeaderProps {
  back: { href: string; label: string };
  tabs: AppHeaderTab[];
  menu: AppMenuConfig;
  docLink: string;
}

const RULES_PAGE_TITLE = i18n.translate('xpack.triggersActionsUI.rulesPage.pageTitle', {
  defaultMessage: 'Rules',
});

export const RulesPageHeader = ({ back, tabs, menu, docLink }: RulesPageHeaderProps) => {
  return (
    <AppHeader
      title={RULES_PAGE_TITLE}
      tabs={tabs}
      menu={menu}
      docLink={docLink}
      spacing="bleed"
      back={back}
    />
  );
};
