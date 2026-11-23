/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { HttpStart } from '@kbn/core/public';
import { AppHeader } from '@kbn/app-header';
import { useBoostLists } from '../api';
import { SEARCH_BOOST_APP_TITLE } from '../app_title';
import { SEARCH_BOOST_PAGE_DESCRIPTION } from '../translations';
import { LoadErrorState, LoadingState } from './page_states';
import { SearchBoostLists } from './search_boost_lists';

interface SearchBoostPageProps {
  http: HttpStart;
  /** Whether the user can create, edit, and delete profiles and rules. */
  canEdit: boolean;
}

export const SearchBoostPage = ({ http, canEdit }: SearchBoostPageProps) => {
  const { data, error, isFetching, refetch } = useBoostLists(http);

  if (!data && error && !isFetching) {
    return (
      <LoadErrorState message={error.body?.message ?? error.message} onRetry={() => refetch()} />
    );
  }

  return (
    <>
      <AppHeader
        title={SEARCH_BOOST_APP_TITLE}
        description={SEARCH_BOOST_PAGE_DESCRIPTION}
        spacing="bleed"
      />
      {data ? (
        <SearchBoostLists profiles={data.profiles} rules={data.rules} canEdit={canEdit} />
      ) : (
        <LoadingState />
      )}
    </>
  );
};
