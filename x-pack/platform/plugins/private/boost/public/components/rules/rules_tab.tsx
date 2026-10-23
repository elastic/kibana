/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import type { EuiSearchBarProps, Query } from '@elastic/eui';
import { EuiButton, EuiFilterGroup, EuiSearchBar, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type {
  BoostDataSource,
  BoostProfile,
  BoostProfileType,
  BoostRule,
} from '../../../common/types';
import { TypeFilter, matchesTypeFilter } from '../type_filter';
import type { ProfileSelections } from './profile_filter';
import { ProfileFilter, matchesProfileFilter } from './profile_filter';
import { RuleFlyout } from './rule_flyout';
import type { RuleRow } from './rules_table';
import { RulesTable } from './rules_table';

interface RulesTabProps {
  rules: BoostRule[];
  profiles: BoostProfile[];
  dataSources: BoostDataSource[];
  canEdit: boolean;
}

// The search parameter that opens this tab filtered by one profile.
const PROFILE_FILTER_PARAM = 'profile';

/** Where the rules tab shows only the rules that use a profile. */
export const getProfileRulesLocation = (profileName: string) => ({
  pathname: '/rules',
  search: `?${new URLSearchParams({ [PROFILE_FILTER_PARAM]: profileName })}`,
});

export const RulesTab = ({ rules, profiles, dataSources, canEdit }: RulesTabProps) => {
  const [isCreating, setIsCreating] = useState(false);
  const { search: locationSearch } = useLocation();
  // Read once, so the filter is the user's to change afterwards.
  const [profileSelections, setProfileSelections] = useState<ProfileSelections>(() => {
    const profileName = new URLSearchParams(locationSearch).get(PROFILE_FILTER_PARAM);
    return new Map(profileName ? [[profileName, 'on']] : []);
  });
  const [typeFilter, setTypeFilter] = useState<BoostProfileType>();
  const [searchQuery, setSearchQuery] = useState<Query>();

  // Only profiles that rules use, since the others would filter to an empty table.
  const usedProfileNames = [...new Set(rules.map(({ boost_profile: name }) => name))].sort((a, b) =>
    a.localeCompare(b)
  );
  const filter = ({ boost_profile: profileName, profileType }: RuleRow) =>
    matchesProfileFilter(profileSelections, profileName) &&
    matchesTypeFilter(typeFilter, profileType);

  // The search box only searches text. The filters sit beside it and filter the rows themselves,
  // so they don't write query syntax into the box. It's above the table rather than the table's own,
  // which would set it further from the table than the details pages' searches.
  const search: EuiSearchBarProps = {
    compressed: true,
    // Until the text can be read as a query, the last one that could stays.
    onChange: ({ query }) => {
      if (query) {
        setSearchQuery(query);
      }
    },
    box: {
      incremental: true,
      placeholder: i18n.translate('xpack.boost.rulesTab.searchPlaceholder', {
        defaultMessage: 'Search boost rules',
      }),
    },
    toolsRight: [
      <EuiFilterGroup key="filters" compressed>
        <ProfileFilter
          selections={profileSelections}
          onChange={setProfileSelections}
          profileNames={usedProfileNames}
        />
        <TypeFilter value={typeFilter} onChange={setTypeFilter} />
      </EuiFilterGroup>,
      ...(canEdit
        ? [
            <EuiButton
              key="create"
              fill
              size="s"
              onClick={() => setIsCreating(true)}
              data-test-subj="createBoostRule"
            >
              {i18n.translate('xpack.boost.rulesTab.createButton', {
                defaultMessage: 'Create boost rule',
              })}
            </EuiButton>,
          ]
        : []),
    ],
  };

  return (
    <>
      <EuiSearchBar {...search} />
      <EuiSpacer size="m" />
      <RulesTable
        rules={rules}
        profiles={profiles}
        dataSources={dataSources}
        canEdit={canEdit}
        filter={filter}
        searchQuery={searchQuery}
        resetKey={`${[...profileSelections].join()}|${typeFilter ?? ''}`}
        tableCaption={i18n.translate('xpack.boost.rulesTab.caption', {
          defaultMessage: 'Boost rules',
        })}
        data-test-subj="boostRulesTable"
      />

      {isCreating && <RuleFlyout onClose={() => setIsCreating(false)} />}
    </>
  );
};
