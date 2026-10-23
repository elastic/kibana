/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import { useHistory } from 'react-router-dom';
import type {
  EuiBasicTableColumn,
  EuiSearchBarProps,
  EuiTableActionsColumnType,
} from '@elastic/eui';
import {
  EuiBadge,
  EuiButton,
  EuiFilterGroup,
  EuiInMemoryTable,
  EuiLink,
  EuiScreenReaderOnly,
  EuiSearchBar,
  EuiSpacer,
  Query,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { reactRouterNavigate } from '@kbn/kibana-react-plugin/public';
import { countRulesByProfile } from '../../../common/resolution';
import type {
  BoostDataSource,
  BoostProfile,
  BoostProfileType,
  BoostRule,
} from '../../../common/types';
import { PROFILE_TYPE_LABELS, formatBoost } from '../format';
import { DeleteProfileModal } from './delete_profile_modal';
import { TypeFilter, countByType, matchesTypeFilter } from '../type_filter';
import { TableCount } from '../details/table_count';
import { RuleFlyout } from '../rules/rule_flyout';
import { getProfileRulesLocation } from '../rules/rules_tab';
import { DetailsLink } from '../details_link';
import { ProfileFlyout } from './profile_flyout';
import { useTablePage } from '../use_table_page';

interface ProfilesTabProps {
  profiles: BoostProfile[];
  rules: BoostRule[];
  dataSources: BoostDataSource[];
  canEdit: boolean;
}

// Data stream profiles report their recent period's boost.
type ProfileRow = BoostProfile & {
  ruleCount: number;
  minBoost: number;
  maxBoost: number;
  usedByDefaultRule: boolean;
};

type FlyoutState = { profile?: BoostProfile; duplicateOf?: BoostProfile } | undefined;

export const MANAGED_BADGE_LABEL = i18n.translate('xpack.boost.profilesTab.managedBadge', {
  defaultMessage: 'Managed',
});

const isCustomProfile = ({ is_builtin: isBuiltin }: BoostProfile) => !isBuiltin;

const DELETE_DESCRIPTION = i18n.translate('xpack.boost.profilesTab.deleteActionDescription', {
  defaultMessage: 'Delete this boost profile',
});

export const USED_BY_DEFAULT_RULE_DESCRIPTIONS: Record<BoostProfileType, string> = {
  indices: i18n.translate('xpack.boost.profilesTab.usedByDefaultIndicesRule', {
    defaultMessage: "The default rule for indices uses this profile, so it can't be deleted.",
  }),
  data_streams: i18n.translate('xpack.boost.profilesTab.usedByDefaultDataStreamsRule', {
    defaultMessage: "The default rule for data streams uses this profile, so it can't be deleted.",
  }),
};

export const ProfilesTab = ({ profiles, rules, dataSources, canEdit }: ProfilesTabProps) => {
  const history = useHistory();
  const [flyout, setFlyout] = useState<FlyoutState>();
  const [typeFilter, setTypeFilter] = useState<BoostProfileType>();
  const [searchQuery, setSearchQuery] = useState<Query>();
  const [profileToDelete, setProfileToDelete] = useState<BoostProfile>();
  // A profile just created with "Save and create rule", which the rule flyout starts with.
  const [ruleProfileName, setRuleProfileName] = useState<string>();

  const rows = useMemo<ProfileRow[]>(() => {
    const ruleCounts = countRulesByProfile(rules);
    const defaultRuleProfiles = new Set(
      rules
        .filter(({ is_builtin: isBuiltin }) => isBuiltin)
        .map(({ boost_profile: profileName }) => profileName)
    );
    return profiles.map((profile) => {
      const { min_boost: minBoost, max_boost: maxBoost } =
        profile.type === 'indices' ? profile : profile.recent;
      return {
        ...profile,
        ruleCount: ruleCounts.get(profile.name) ?? 0,
        minBoost,
        maxBoost,
        usedByDefaultRule: defaultRuleProfiles.has(profile.name),
      };
    });
  }, [profiles, rules]);

  // Wide enough for up to three icon buttons (two primary actions plus the "All actions" menu).
  const actionsColumn: EuiTableActionsColumnType<ProfileRow> = {
    width: '104px',
    name: (
      <EuiScreenReaderOnly>
        <span>
          {i18n.translate('xpack.boost.profilesTab.actionsColumn', { defaultMessage: 'Actions' })}
        </span>
      </EuiScreenReaderOnly>
    ),
    actions: [
      {
        name: i18n.translate('xpack.boost.profilesTab.editAction', { defaultMessage: 'Edit' }),
        description: i18n.translate('xpack.boost.profilesTab.editActionDescription', {
          defaultMessage: 'Edit this boost profile',
        }),
        icon: 'pencil',
        type: 'icon',
        isPrimary: true,
        available: isCustomProfile,
        onClick: (profile) => setFlyout({ profile }),
        'data-test-subj': 'editBoostProfile',
      },
      {
        name: i18n.translate('xpack.boost.profilesTab.duplicateAction', {
          defaultMessage: 'Duplicate',
        }),
        description: i18n.translate('xpack.boost.profilesTab.duplicateActionDescription', {
          defaultMessage: 'Create a new boost profile from this one',
        }),
        icon: 'copy',
        type: 'icon',
        isPrimary: true,
        onClick: (profile) => setFlyout({ duplicateOf: profile }),
        'data-test-subj': 'duplicateBoostProfile',
      },
      {
        name: i18n.translate('xpack.boost.profilesTab.deleteAction', { defaultMessage: 'Delete' }),
        description: ({ type, usedByDefaultRule }) =>
          usedByDefaultRule ? USED_BY_DEFAULT_RULE_DESCRIPTIONS[type] : DELETE_DESCRIPTION,
        icon: 'trash',
        color: 'danger',
        type: 'icon',
        available: isCustomProfile,
        enabled: ({ usedByDefaultRule }) => !usedByDefaultRule,
        onClick: setProfileToDelete,
        'data-test-subj': 'deleteBoostProfile',
      },
    ],
  };

  const columns: Array<EuiBasicTableColumn<ProfileRow>> = [
    {
      field: 'name',
      name: i18n.translate('xpack.boost.profilesTab.nameColumn', {
        defaultMessage: 'Profile name',
      }),
      sortable: true,
      // A single span keeps the name and badge in one inline run; table cells are flex containers.
      render: (name: string, { is_builtin: isBuiltin }: ProfileRow) => (
        <span>
          <DetailsLink kind="profile" name={name} data-test-subj="boostProfileDetailsLink" />
          {isBuiltin && (
            <>
              {' '}
              <EuiBadge>{MANAGED_BADGE_LABEL}</EuiBadge>
            </>
          )}
        </span>
      ),
    },
    {
      field: 'type',
      name: i18n.translate('xpack.boost.profilesTab.typeColumn', { defaultMessage: 'Type' }),
      // Widths in em, relative to the table's 12px base, fit each column's widest content: "Data
      // streams" here, and the headers with their sort arrows in the number columns.
      width: '9em',
      sortable: true,
      render: (type: BoostProfile['type']) => PROFILE_TYPE_LABELS[type],
    },
    {
      field: 'minBoost',
      name: i18n.translate('xpack.boost.profilesTab.minBoostColumn', {
        defaultMessage: 'Min boost',
      }),
      width: '9em',
      sortable: true,
      dataType: 'number',
      render: formatBoost,
    },
    {
      field: 'maxBoost',
      name: i18n.translate('xpack.boost.profilesTab.maxBoostColumn', {
        defaultMessage: 'Max boost',
      }),
      width: '9em',
      sortable: true,
      dataType: 'number',
      render: formatBoost,
    },
    {
      field: 'ruleCount',
      name: i18n.translate('xpack.boost.profilesTab.rulesUsingColumn', {
        defaultMessage: 'Rules using',
      }),
      width: '9.5em',
      sortable: true,
      dataType: 'number',
      // Opens the rules tab filtered to the rules that use this profile.
      render: (ruleCount: number, { name }: ProfileRow) =>
        ruleCount > 0 ? (
          <EuiLink
            {...reactRouterNavigate(history, getProfileRulesLocation(name))}
            aria-label={i18n.translate('xpack.boost.profilesTab.rulesUsingLinkLabel', {
              defaultMessage:
                'View {count, plural, one {# rule} other {# rules}} using boost profile "{name}"',
              values: { count: ruleCount, name },
            })}
            data-test-subj="boostProfileRulesLink"
          >
            {ruleCount}
          </EuiLink>
        ) : (
          ruleCount
        ),
    },
    ...(canEdit ? [actionsColumn] : []),
  ];

  const searchedRows = searchQuery ? Query.execute(searchQuery, rows) : rows;
  // Each type counts what it would show with the search.
  const typeCounts = countByType(searchedRows, ({ type }) => type);
  const filteredRows = searchedRows.filter(({ type }) => matchesTypeFilter(typeFilter, type));
  // A new search or filter starts again at the first page.
  const { pageIndex, pageSize, pagination, onTableChange } = useTablePage<ProfileRow>(
    `${searchQuery?.text ?? ''}|${typeFilter ?? ''}`,
    filteredRows.length
  );

  // The search box only searches text. The filter sits beside it and filters the rows itself, so it
  // doesn't write query syntax into the box. It's above the table rather than the table's own,
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
      placeholder: i18n.translate('xpack.boost.profilesTab.searchPlaceholder', {
        defaultMessage: 'Search boost profiles',
      }),
    },
    toolsRight: [
      <EuiFilterGroup key="filters" compressed>
        <TypeFilter value={typeFilter} onChange={setTypeFilter} counts={typeCounts} />
      </EuiFilterGroup>,
      ...(canEdit
        ? [
            <EuiButton
              key="create"
              fill
              size="s"
              onClick={() => setFlyout({})}
              data-test-subj="createBoostProfile"
            >
              {i18n.translate('xpack.boost.profilesTab.createButton', {
                defaultMessage: 'Create boost profile',
              })}
            </EuiButton>,
          ]
        : []),
    ],
  };

  return (
    <>
      <EuiSearchBar {...search} />
      <EuiSpacer size="s" />
      <TableCount
        pageIndex={pageIndex}
        pageSize={pageSize}
        total={filteredRows.length}
        formatTotal={(count) =>
          i18n.translate('xpack.boost.profilesTab.profileCount', {
            defaultMessage: '{count, plural, one {# boost profile} other {# boost profiles}}',
            values: { count },
          })
        }
        data-test-subj="boostProfilesCount"
      />
      <EuiInMemoryTable
        tableCaption={i18n.translate('xpack.boost.profilesTab.caption', {
          defaultMessage: 'Boost profiles',
        })}
        items={filteredRows}
        itemId="name"
        columns={columns}
        sorting={{ sort: { field: 'name', direction: 'asc' } }}
        pagination={pagination}
        onTableChange={onTableChange}
        data-test-subj="boostProfilesTable"
      />

      {flyout && (
        <ProfileFlyout
          profile={flyout.profile}
          duplicateOf={flyout.duplicateOf}
          takenNames={profiles.map(({ name }) => name)}
          onClose={() => setFlyout(undefined)}
          onCreateRule={(profileName) => {
            setFlyout(undefined);
            setRuleProfileName(profileName);
          }}
        />
      )}

      {ruleProfileName && (
        <RuleFlyout
          initialProfileName={ruleProfileName}
          onClose={() => setRuleProfileName(undefined)}
        />
      )}

      {profileToDelete && (
        <DeleteProfileModal
          profile={profileToDelete}
          rules={rules}
          profiles={profiles}
          dataSources={dataSources}
          onClose={() => setProfileToDelete(undefined)}
        />
      )}
    </>
  );
};
