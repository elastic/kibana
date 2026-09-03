/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AppHeaderTab } from '@kbn/app-header';
import { i18n } from '@kbn/i18n';
import { RULES_PAGE_TAB_IDS, type RulesPageTabId } from './constants';

export interface RulesPageTabBinding {
  /** Cross-app destination for the tab, already prepended by the consumer (`http.basePath.prepend`). */
  href: string;
}

export interface GetRulesPageHeaderTabsParams {
  selectedTab: RulesPageTabId;
  /**
   * Per-tab bindings supplied by the consumer. A tab is rendered only when its binding is present,
   * so consumers decide visibility (privileges, advanced settings) by omitting the binding rather
   * than passing a `show` flag. Consumers also own the `href` so destinations can vary per solution.
   */
  tabs: {
    v1?: RulesPageTabBinding;
    v2?: RulesPageTabBinding;
  };
}

/**
 * Header tabs shared by the v1 (`triggers_actions_ui`) and v2 (`alerting_v2`) Rules pages so the
 * two apps present as a single tabbed page. Each tab is a plain cross-app `href` (no `onClick`) —
 * `AppHeaderTab.onClick` receives no event and cannot `preventDefault`, so combining both would
 * double-navigate.
 */
export const getRulesPageHeaderTabs = ({
  selectedTab,
  tabs,
}: GetRulesPageHeaderTabsParams): AppHeaderTab[] => {
  const headerTabs: AppHeaderTab[] = [];

  if (tabs.v2) {
    headerTabs.push({
      id: RULES_PAGE_TAB_IDS.v2,
      label: i18n.translate('responseOpsRulesPageTabs.v2RulesTabTitle', {
        defaultMessage: 'V2 rules',
      }),
      isSelected: selectedTab === RULES_PAGE_TAB_IDS.v2,
      href: tabs.v2.href,
      badge: {
        iconType: 'sparkles',
        tooltip: i18n.translate('responseOpsRulesPageTabs.v2RulesTabNewBadgeTooltip', {
          defaultMessage: 'New',
        }),
      },
      'data-test-subj': 'v2RulesTab',
    });
  }

  if (tabs.v1) {
    headerTabs.push({
      id: RULES_PAGE_TAB_IDS.v1,
      label: i18n.translate('responseOpsRulesPageTabs.v1RulesTabTitle', {
        defaultMessage: 'V1 rules',
      }),
      isSelected: selectedTab === RULES_PAGE_TAB_IDS.v1,
      href: tabs.v1.href,
      'data-test-subj': 'v1RulesTab',
    });
  }

  // A one-item tablist is not a tablist — omit tabs unless both surfaces are shown.
  return headerTabs.length > 1 ? headerTabs : [];
};
