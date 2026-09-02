/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AppHeaderTab } from '@kbn/app-header';
import { i18n } from '@kbn/i18n';
import { triggersActionsRoute } from '@kbn/rule-data-utils';
import { ALERTING_V2_RULES_BASE_PATH } from '@kbn/alerting-v2-constants';
import { RULES_PAGE_TAB_IDS, type RulesPageTabId } from './constants';

export interface GetRulesPageHeaderTabsParams {
  selectedTab: RulesPageTabId;
  /** `http.basePath.prepend` */
  prepend: (path: string) => string;
  /** @default true */
  showV1Tab?: boolean;
  /** @default true */
  showV2Tab?: boolean;
}

/**
 * Header tabs shared by the v1 (`triggers_actions_ui`) and v2 (`alerting_v2`)
 * Rules pages so the two apps present as a single tabbed page. Each tab is a plain cross-app
 * `href` (no `onClick`) — `AppHeaderTab.onClick` receives no event and cannot `preventDefault`,
 * so combining both would double-navigate. Both pages are Stack Management apps wrapped in
 * `RedirectAppLinks`, so an `href` still resolves to an SPA navigation.
 */
export const getRulesPageHeaderTabs = ({
  selectedTab,
  prepend,
  showV1Tab = true,
  showV2Tab = true,
}: GetRulesPageHeaderTabsParams): AppHeaderTab[] => {
  const tabs: AppHeaderTab[] = [];

  if (showV2Tab) {
    tabs.push({
      id: RULES_PAGE_TAB_IDS.v2,
      label: i18n.translate('responseOpsRulesPageTabs.v2RulesTabTitle', {
        defaultMessage: 'V2 rules',
      }),
      isSelected: selectedTab === RULES_PAGE_TAB_IDS.v2,
      href: prepend(ALERTING_V2_RULES_BASE_PATH),
      badge: {
        iconType: 'sparkles',
        tooltip: i18n.translate('responseOpsRulesPageTabs.v2RulesTabNewBadgeTooltip', {
          defaultMessage: 'New',
        }),
      },
      'data-test-subj': 'v2RulesTab',
    });
  }

  if (showV1Tab) {
    tabs.push({
      id: RULES_PAGE_TAB_IDS.v1,
      label: i18n.translate('responseOpsRulesPageTabs.v1RulesTabTitle', {
        defaultMessage: 'V1 rules',
      }),
      isSelected: selectedTab === RULES_PAGE_TAB_IDS.v1,
      href: prepend(triggersActionsRoute),
      'data-test-subj': 'v1RulesTab',
    });
  }

  // A one-item tablist is not a tablist — omit tabs unless both surfaces are shown.
  return tabs.length > 1 ? tabs : [];
};
