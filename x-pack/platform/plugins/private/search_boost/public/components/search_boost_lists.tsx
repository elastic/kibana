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
import {
  PROFILE_PARAM,
  RULES_PATH,
  getProfilePath,
  getRulePath,
  getRulesListLocation,
} from '../links';
import { ProfilesTab } from './profiles/profiles_tab';
import { RulesTab } from './rules/rules_tab';
import type { SearchBoostTab } from './search_boost_tabs';
import { SearchBoostTabs } from './search_boost_tabs';

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
          getRuleLinkProps={(name) => reactRouterNavigate(history, getRulePath(name))}
          initialProfileName={new URLSearchParams(search).get(PROFILE_PARAM) ?? undefined}
        />
      ) : (
        <ProfilesTab
          profiles={profiles}
          rules={rules}
          canEdit={canEdit}
          getProfileLinkProps={(name) => reactRouterNavigate(history, getProfilePath(name))}
          getProfileRulesLinkProps={(name) =>
            reactRouterNavigate(history, getRulesListLocation(name))
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
    <Redirect to={RULES_PATH} />
  </Routes>
);
