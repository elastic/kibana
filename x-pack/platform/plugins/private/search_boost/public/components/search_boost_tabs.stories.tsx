/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MouseEvent } from 'react';
import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { action } from '@storybook/addon-actions';
import { EuiSpacer } from '@elastic/eui';
import { mockProfiles, mockRules } from './test_utils/mock_boost_data';
import { ProfilesTab } from './profiles/profiles_tab';
import { RulesTab } from './rules/rules_tab';
import type { SearchBoostTab } from './search_boost_tabs';
import { SearchBoostTabs } from './search_boost_tabs';

const meta: Meta<typeof SearchBoostTabs> = {
  component: SearchBoostTabs,
  title: 'Search boost/Tabs',
};

export default meta;

type Story = StoryObj<typeof SearchBoostTabs>;

const getDetailsLinkProps = (name: string) => ({
  href: '#',
  onClick: (event: MouseEvent) => {
    event.preventDefault();
    action('onOpenDetails')(name);
  },
});

const TabsWithTables = () => {
  const [selectedTab, setSelectedTab] = useState<SearchBoostTab>('rules');
  const [rulesProfileName, setRulesProfileName] = useState<string>();

  return (
    <>
      <SearchBoostTabs
        selectedTab={selectedTab}
        onSelectTab={(tab) => {
          setRulesProfileName(undefined);
          setSelectedTab(tab);
        }}
      />
      <EuiSpacer size="l" />
      {selectedTab === 'rules' ? (
        <RulesTab
          rules={mockRules}
          initialProfileName={rulesProfileName}
          getRuleLinkProps={getDetailsLinkProps}
        />
      ) : (
        <ProfilesTab
          profiles={mockProfiles}
          rules={mockRules}
          getProfileLinkProps={getDetailsLinkProps}
          getProfileRulesLinkProps={(profileName) => ({
            href: '#',
            onClick: (event) => {
              event.preventDefault();
              setRulesProfileName(profileName);
              setSelectedTab('rules');
            },
          })}
        />
      )}
    </>
  );
};

export const Default: Story = {
  render: () => <TabsWithTables />,
};
