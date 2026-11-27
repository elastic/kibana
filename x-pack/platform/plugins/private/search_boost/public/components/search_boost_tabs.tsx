/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiTab, EuiTabs } from '@elastic/eui';
import { PROFILES_TAB_LABEL, RULES_TAB_LABEL } from '../translations';

export type SearchBoostTab = 'rules' | 'profiles';

const TABS: ReadonlyArray<{ id: SearchBoostTab; label: string }> = [
  { id: 'rules', label: RULES_TAB_LABEL },
  { id: 'profiles', label: PROFILES_TAB_LABEL },
];

interface SearchBoostTabsProps {
  selectedTab: SearchBoostTab;
  onSelectTab: (tab: SearchBoostTab) => void;
}

export const SearchBoostTabs = ({ selectedTab, onSelectTab }: SearchBoostTabsProps) => (
  <EuiTabs size="l">
    {TABS.map(({ id, label }) => (
      <EuiTab
        key={id}
        isSelected={selectedTab === id}
        onClick={() => onSelectTab(id)}
        data-test-subj={`searchBoostTab-${id}`}
      >
        {label}
      </EuiTab>
    ))}
  </EuiTabs>
);
