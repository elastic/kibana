/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Redirect, useHistory, useLocation } from 'react-router-dom';
import { EuiSpacer } from '@elastic/eui';
import { reactRouterNavigate } from '@kbn/kibana-react-plugin/public';
import { Route, Routes } from '@kbn/shared-ux-router';
import type { BoostLists } from '../api';
import type { LinkProps } from '../types';
import { ProfilesTab } from './profiles/profiles_tab';
import { RulesTab } from './rules/rules_tab';
import type { SearchBoostTab } from './search_boost_tabs';
import { SearchBoostTabs } from './search_boost_tabs';

const PROFILE_PARAM = 'profile';

// Temporary: names don't open anything until the details pages exist (https://github.com/elastic/kibana/issues/303833).
const DETAILS_LINK_PROPS: LinkProps = { href: '#', onClick: (event) => event.preventDefault() };

type SearchBoostListsProps = BoostLists & {
  canEdit: boolean;
};

type TabContentProps = SearchBoostListsProps & {
  tab: SearchBoostTab;
};

const TabContent = ({ tab, profiles, rules, canEdit }: TabContentProps) => {
  const history = useHistory();
  const { search } = useLocation();

  return (
    <>
      <SearchBoostTabs
        selectedTab={tab}
        onSelectTab={(selected) => {
          // Pushing the current tab again would drop `?profile`, which starts the rules list over.
          if (selected !== tab) {
            history.push(`/${selected}`);
          }
        }}
      />
      <EuiSpacer size="l" />
      {tab === 'rules' ? (
        <RulesTab
          rules={rules}
          canEdit={canEdit}
          getRuleLinkProps={() => DETAILS_LINK_PROPS}
          initialProfileName={new URLSearchParams(search).get(PROFILE_PARAM) ?? undefined}
        />
      ) : (
        <ProfilesTab
          profiles={profiles}
          rules={rules}
          canEdit={canEdit}
          getProfileLinkProps={() => DETAILS_LINK_PROPS}
          getProfileRulesLinkProps={(name) =>
            reactRouterNavigate(history, {
              pathname: '/rules',
              search: `?${new URLSearchParams({ [PROFILE_PARAM]: name })}`,
            })
          }
        />
      )}
    </>
  );
};

export const SearchBoostLists = ({ profiles, rules, canEdit }: SearchBoostListsProps) => (
  <Routes>
    <Route
      exact
      path="/:tab(rules|profiles)"
      render={({ match }) => (
        <TabContent
          tab={match.params.tab === 'profiles' ? 'profiles' : 'rules'}
          profiles={profiles}
          rules={rules}
          canEdit={canEdit}
        />
      )}
    />
    <Redirect to="/rules" />
  </Routes>
);
