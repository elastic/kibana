/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AppHeaderTab } from '@kbn/app-header';
import { i18n } from '@kbn/i18n';

export interface GetV1RulesPageTabsParams {
  /** Prepended href for the v1 Rules page. */
  v1Href: string;
  /** Prepended href for the Alerting v2 Rules page. */
  v2Href: string;
}

/**
 * Tabs for the v1 Rules page, presenting it and the Alerting v2 Rules page as one tabbed page.
 * The v1 tab is the selected one, since this is the v1 page.
 *
 * Each tab is a plain cross-app `href` (no `onClick`) — `AppHeaderTab.onClick` receives no event
 * and cannot `preventDefault`, so combining both would double-navigate.
 */
export const getV1RulesPageTabs = ({
  v1Href,
  v2Href,
}: GetV1RulesPageTabsParams): AppHeaderTab[] => [
  {
    id: 'v2Rules',
    label: i18n.translate('xpack.triggersActionsUI.rulesPage.v2RulesTabTitle', {
      defaultMessage: 'V2 rules',
    }),
    isSelected: false,
    href: v2Href,
    badge: {
      iconType: 'sparkles',
      tooltip: i18n.translate('xpack.triggersActionsUI.rulesPage.v2RulesTabNewBadgeTooltip', {
        defaultMessage: 'New',
      }),
    },
    'data-test-subj': 'v2RulesTab',
  },
  {
    id: 'v1Rules',
    label: i18n.translate('xpack.triggersActionsUI.rulesPage.v1RulesTabTitle', {
      defaultMessage: 'V1 rules',
    }),
    isSelected: true,
    href: v1Href,
    'data-test-subj': 'v1RulesTab',
  },
];
