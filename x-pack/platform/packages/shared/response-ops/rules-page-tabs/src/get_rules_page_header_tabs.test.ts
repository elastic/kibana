/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RULES_PAGE_TAB_IDS } from './constants';
import { getRulesPageHeaderTabs } from './get_rules_page_header_tabs';

describe('getRulesPageHeaderTabs', () => {
  const prepend = (path: string) => `/prepended${path}`;

  it('returns both tabs by default with the v1 tab hrefed at the v1 Rules page', () => {
    const tabs = getRulesPageHeaderTabs({ selectedTab: RULES_PAGE_TAB_IDS.v1, prepend });

    expect(tabs.map((tab) => tab.id)).toEqual([RULES_PAGE_TAB_IDS.v2, RULES_PAGE_TAB_IDS.v1]);
    expect(tabs[0]).toMatchObject({
      isSelected: false,
      href: '/prepended/app/management/alertingV2/rules',
      'data-test-subj': 'v2RulesTab',
    });
    expect(tabs[1]).toMatchObject({
      isSelected: true,
      href: '/prepended/app/management/insightsAndAlerting/triggersActions',
      'data-test-subj': 'v1RulesTab',
    });
  });

  it('selects the v2 tab when it is the current page', () => {
    const tabs = getRulesPageHeaderTabs({ selectedTab: RULES_PAGE_TAB_IDS.v2, prepend });

    expect(tabs.find((tab) => tab.id === RULES_PAGE_TAB_IDS.v1)?.isSelected).toBe(false);
    expect(tabs.find((tab) => tab.id === RULES_PAGE_TAB_IDS.v2)?.isSelected).toBe(true);
  });

  it('marks the v2 tab with a "New" sparkles badge', () => {
    const tabs = getRulesPageHeaderTabs({ selectedTab: RULES_PAGE_TAB_IDS.v1, prepend });

    expect(tabs.find((tab) => tab.id === RULES_PAGE_TAB_IDS.v2)?.badge).toMatchObject({
      iconType: 'sparkles',
    });
  });

  it('returns no tabs when only one surface would be shown', () => {
    expect(
      getRulesPageHeaderTabs({
        selectedTab: RULES_PAGE_TAB_IDS.v2,
        prepend,
        showV1Tab: false,
      })
    ).toEqual([]);

    expect(
      getRulesPageHeaderTabs({
        selectedTab: RULES_PAGE_TAB_IDS.v1,
        prepend,
        showV2Tab: false,
      })
    ).toEqual([]);
  });
});
