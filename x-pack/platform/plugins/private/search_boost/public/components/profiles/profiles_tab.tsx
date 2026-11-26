/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButton, EuiEmptyPrompt } from '@elastic/eui';
import { ContentListFooter, ContentListToolbar } from '@kbn/content-list';
import { ListLayout } from '../list_layout';
import { TableCount } from '../table_count';
import { TypeFilter } from '../type_filter';
import type { ProfilesListProviderProps } from './profiles_list_provider';
import { ProfilesListProvider } from './profiles_list_provider';
import type { ProfilesTableProps } from './profiles_table';
import { ProfilesTable } from './profiles_table';
import { CREATE_PROFILE_LABEL, NO_ITEMS_FOUND, formatProfileCount } from '../../translations';

export type ProfilesTabProps = Omit<ProfilesListProviderProps, 'children'> &
  ProfilesTableProps & {
    onCreate?: () => void;
  };

export const ProfilesTab = ({
  getProfileLinkProps,
  getProfileRulesLinkProps,
  onCreate,
  ...listProps
}: ProfilesTabProps) => (
  <ProfilesListProvider {...listProps}>
    <ListLayout
      toolbar={
        <ContentListToolbar>
          <ContentListToolbar.Filters>
            <TypeFilter />
          </ContentListToolbar.Filters>
        </ContentListToolbar>
      }
      toolbarAppend={
        listProps.canEdit &&
        onCreate && (
          <EuiButton fill size="s" onClick={onCreate} data-test-subj="searchBoostCreateProfile">
            {CREATE_PROFILE_LABEL}
          </EuiButton>
        )
      }
      emptyState={<EuiEmptyPrompt body={NO_ITEMS_FOUND} />}
      data-test-subj="searchBoostProfiles"
    >
      <TableCount formatTotal={formatProfileCount} data-test-subj="searchBoostProfilesCount" />
      <ProfilesTable
        getProfileLinkProps={getProfileLinkProps}
        getProfileRulesLinkProps={getProfileRulesLinkProps}
      />
      <ContentListFooter />
    </ListLayout>
  </ProfilesListProvider>
);
