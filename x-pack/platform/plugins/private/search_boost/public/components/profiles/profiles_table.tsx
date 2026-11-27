/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import useLatest from 'react-use/lib/useLatest';
import { EuiLink } from '@elastic/eui';
import type { ContentListItem } from '@kbn/content-list-provider';
import { ContentListTable } from '@kbn/content-list';
import { NameCell } from '../name_cell';
import type { LinkProps } from '../../types';
import { formatBoost } from '../format';
import {
  MANAGED_PROFILE_BADGE,
  PROFILES_TABLE_CAPTION,
  PROFILE_COLUMNS,
  PROFILE_NAME_LABEL,
  getRulesLinkLabel,
} from '../../translations';
import { DELETE_ACTION_PROPS, DUPLICATE_ACTION_PROPS } from '../item_actions';
import { useProfileItem } from './profiles_list_provider';

const { Column, Action } = ContentListTable;

const MANAGED_PROFILE_BADGE_PROPS = {
  label: MANAGED_PROFILE_BADGE,
  'data-test-subj': 'searchBoostManagedProfileBadge',
};

export interface ProfilesTableProps {
  getProfileLinkProps: (profileName: string) => LinkProps;
  getProfileRulesLinkProps: (profileName: string) => LinkProps;
}

export const ProfilesTable = ({
  getProfileLinkProps,
  getProfileRulesLinkProps,
}: ProfilesTableProps) => {
  // Content List keeps the first render's cell renderers, so they read the latest getters.
  const latest = useLatest({ getProfileLinkProps, getProfileRulesLinkProps });
  const getProfile = useProfileItem();
  const isCustomProfile = (item: ContentListItem) => getProfile(item)?.is_builtin === false;

  return (
    <ContentListTable title={PROFILES_TABLE_CAPTION} data-test-subj="searchBoostProfilesTable">
      <Column.Name
        columnTitle={PROFILE_NAME_LABEL}
        render={(item) => (
          <NameCell
            name={item.title}
            linkProps={latest.current.getProfileLinkProps(item.title)}
            badge={getProfile(item)?.is_builtin ? MANAGED_PROFILE_BADGE_PROPS : undefined}
            data-test-subj="searchBoostProfileLink"
          />
        )}
      />
      <Column
        id="typeLabel"
        name={PROFILE_COLUMNS.type}
        width="9em"
        sortable
        render={(item) => getProfile(item)?.typeLabel}
      />
      <Column
        id="minBoost"
        name={PROFILE_COLUMNS.minBoost}
        width="9em"
        sortable
        render={(item) => {
          const profile = getProfile(item);
          return profile && formatBoost(profile.minBoost);
        }}
      />
      <Column
        id="maxBoost"
        name={PROFILE_COLUMNS.maxBoost}
        width="9em"
        sortable
        render={(item) => {
          const profile = getProfile(item);
          return profile && formatBoost(profile.maxBoost);
        }}
      />
      <Column
        id="ruleCount"
        name={PROFILE_COLUMNS.rulesUsing}
        width="9.5em"
        sortable
        render={(item) => {
          const profile = getProfile(item);
          if (!profile) {
            return null;
          }
          const { name, ruleCount } = profile;
          return ruleCount > 0 ? (
            <EuiLink
              {...latest.current.getProfileRulesLinkProps(name)}
              aria-label={getRulesLinkLabel(ruleCount, name)}
              data-test-subj="searchBoostProfileRulesLink"
            >
              {ruleCount}
            </EuiLink>
          ) : (
            ruleCount
          );
        }}
      />
      <Column.Actions>
        <Action.Edit />
        <Action {...DUPLICATE_ACTION_PROPS} data-test-subj="searchBoostDuplicateProfile" />
        <Action
          {...DELETE_ACTION_PROPS}
          available={isCustomProfile}
          data-test-subj="searchBoostDeleteProfile"
        />
      </Column.Actions>
    </ContentListTable>
  );
};
