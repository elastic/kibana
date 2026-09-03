/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RULES_PAGE_TAB_IDS } from './constants';
import { getRulesPageHeaderTabs } from './get_rules_page_header_tabs';

describe('getRulesPageHeaderTabs', () => {
  const v1Href = '/prepended/v1/rules';
  const v2Href = '/prepended/v2/rules';
  const bothTabs = { v1: { href: v1Href }, v2: { href: v2Href } };

  it('returns both tabs (v2 first) hrefed from the supplied bindings', () => {
    const tabs = getRulesPageHeaderTabs({ selectedTab: RULES_PAGE_TAB_IDS.v1, tabs: bothTabs });

    expect(tabs.map((tab) => tab.id)).toEqual([RULES_PAGE_TAB_IDS.v2, RULES_PAGE_TAB_IDS.v1]);
    expect(tabs[0]).toMatchObject({
      isSelected: false,
      href: v2Href,
      'data-test-subj': 'v2RulesTab',
    });
    expect(tabs[1]).toMatchObject({
      isSelected: true,
      href: v1Href,
      'data-test-subj': 'v1RulesTab',
    });
  });

  it('selects the v2 tab when it is the current page', () => {
    const tabs = getRulesPageHeaderTabs({ selectedTab: RULES_PAGE_TAB_IDS.v2, tabs: bothTabs });

    expect(tabs.find((tab) => tab.id === RULES_PAGE_TAB_IDS.v1)?.isSelected).toBe(false);
    expect(tabs.find((tab) => tab.id === RULES_PAGE_TAB_IDS.v2)?.isSelected).toBe(true);
  });

  it('marks the v2 tab with a "New" sparkles badge', () => {
    const tabs = getRulesPageHeaderTabs({ selectedTab: RULES_PAGE_TAB_IDS.v1, tabs: bothTabs });

    expect(tabs.find((tab) => tab.id === RULES_PAGE_TAB_IDS.v2)?.badge).toMatchObject({
      iconType: 'sparkles',
    });
  });

  it('returns no tabs when only one binding is supplied', () => {
    expect(
      getRulesPageHeaderTabs({
        selectedTab: RULES_PAGE_TAB_IDS.v2,
        tabs: { v2: { href: v2Href } },
      })
    ).toEqual([]);

    expect(
      getRulesPageHeaderTabs({
        selectedTab: RULES_PAGE_TAB_IDS.v1,
        tabs: { v1: { href: v1Href } },
      })
    ).toEqual([]);
  });

  it('returns no tabs when no bindings are supplied', () => {
    expect(getRulesPageHeaderTabs({ selectedTab: RULES_PAGE_TAB_IDS.v1, tabs: {} })).toEqual([]);
  });
});
