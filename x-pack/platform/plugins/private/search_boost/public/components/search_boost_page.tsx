/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { HttpStart } from '@kbn/core/public';
import { AppHeader } from '@kbn/app-header';
import { Route, Routes } from '@kbn/shared-ux-router';
import type { BoostLists } from '../api';
import { useBoostLists } from '../api';
import { SEARCH_BOOST_APP_TITLE } from '../app_title';
import { PROFILES_PATH, RULES_PATH, decodeName } from '../links';
import { SEARCH_BOOST_PAGE_DESCRIPTION } from '../translations';
import { ProfileDetailsRoute } from './details/profile/profile_details_route';
import { RuleDetailsRoute } from './details/rule/rule_details_route';
import { PageContent } from './page_content';
import { LoadErrorState, LoadingState } from './page_states';
import { SearchBoostLists } from './search_boost_lists';

interface SearchBoostPageProps {
  http: HttpStart;
  /** Whether the user can create, edit, and delete profiles and rules. */
  canEdit: boolean;
}

interface ListsPageProps {
  lists?: BoostLists;
  canEdit: boolean;
}

const ListsPage = ({ lists, canEdit }: ListsPageProps) => (
  <>
    <AppHeader
      title={SEARCH_BOOST_APP_TITLE}
      description={SEARCH_BOOST_PAGE_DESCRIPTION}
      spacing="bleed"
    />
    <PageContent>
      {lists ? (
        <SearchBoostLists profiles={lists.profiles} rules={lists.rules} canEdit={canEdit} />
      ) : (
        <LoadingState />
      )}
    </PageContent>
  </>
);

export const SearchBoostPage = ({ http, canEdit }: SearchBoostPageProps) => {
  const { data, error, isFetching, refetch } = useBoostLists(http);

  if (!data && error && !isFetching) {
    return (
      <LoadErrorState message={error.body?.message ?? error.message} onRetry={() => refetch()} />
    );
  }

  return (
    <Routes>
      <Route
        exact
        path={`${RULES_PATH}/:ruleName`}
        render={({ match }) => (
          <RuleDetailsRoute ruleName={decodeName(match.params.ruleName)} lists={data} />
        )}
      />
      <Route
        exact
        path={`${PROFILES_PATH}/:profileName`}
        render={({ match }) => (
          <ProfileDetailsRoute
            profileName={decodeName(match.params.profileName)}
            lists={data}
            canEdit={canEdit}
          />
        )}
      />
      <Route>
        <ListsPage lists={data} canEdit={canEdit} />
      </Route>
    </Routes>
  );
};
