/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
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
  EuiScreenReaderOnly,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { RuleCoverage } from '../../../common/resolution';
import { getRuleCoverage } from '../../../common/resolution';
import type {
  BoostDataSource,
  BoostProfile,
  BoostProfileType,
  BoostRule,
} from '../../../common/types';
import { TypeFilter, matchesTypeFilter } from '../type_filter';
import type { ProfileSelections } from './profile_filter';
import { ProfileFilter, matchesProfileFilter } from './profile_filter';
import { DetailsLink } from '../details_link';
import { RuleMatches } from './rule_matches';
import { getDefaultRuleType } from '../../../common/presets';
import { ProjectDefaultFlyout } from '../project_defaults/project_default_flyout';
import { RuleFlyout } from './rule_flyout';
import { DeleteRuleModal } from './delete_rule_modal';

interface RulesTabProps {
  rules: BoostRule[];
  profiles: BoostProfile[];
  dataSources: BoostDataSource[];
  canEdit: boolean;
}

type RuleRow = BoostRule & RuleCoverage & { profileType?: BoostProfileType };

const PAGE_SIZE = 10;

export const DEFAULT_BADGE_LABEL = i18n.translate('xpack.boost.rulesTab.defaultBadge', {
  defaultMessage: 'Default',
});

const isCustomRule = ({ is_builtin: isBuiltin }: BoostRule) => !isBuiltin;

// The search parameter that opens this tab filtered by one profile.
const PROFILE_FILTER_PARAM = 'profile';

/** Where the rules tab shows only the rules that use a profile. */
export const getProfileRulesLocation = (profileName: string) => ({
  pathname: '/rules',
  search: `?${new URLSearchParams({ [PROFILE_FILTER_PARAM]: profileName })}`,
});

export const RulesTab = ({ rules, profiles, dataSources, canEdit }: RulesTabProps) => {
  const [ruleToDelete, setRuleToDelete] = useState<RuleRow>();
  // Undefined while closed; an empty object creates a rule, and `rule` edits one.
  const [flyout, setFlyout] = useState<{ rule?: BoostRule; duplicateOf?: BoostRule }>();
  // A default rule is edited as its project default, which the page's defaults edit too.
  const [editedDefaultType, setEditedDefaultType] = useState<BoostProfileType>();
  const { search: locationSearch } = useLocation();
  // Read once, so the filter is the user's to change afterwards.
  const [profileSelections, setProfileSelections] = useState<ProfileSelections>(() => {
    const profileName = new URLSearchParams(locationSearch).get(PROFILE_FILTER_PARAM);
    return new Map(profileName ? [[profileName, 'on']] : []);
  });
  const [typeFilter, setTypeFilter] = useState<BoostProfileType>();

  const rows = useMemo<RuleRow[]>(() => {
    const profileTypes = new Map(profiles.map(({ name, type }) => [name, type]));
    const coverage = getRuleCoverage(dataSources, rules, profiles);
    return rules.map((rule) => ({
      ...rule,
      profileType: profileTypes.get(rule.boost_profile),
      ...(coverage.get(rule.name) ?? {
        matches: 0,
        matchedNames: [],
        appliesTo: 0,
        supersededBy: new Map(),
      }),
    }));
  }, [rules, profiles, dataSources]);

  // Wide enough for up to three icon buttons (two primary actions plus the "All actions" menu).
  const actionsColumn: EuiTableActionsColumnType<RuleRow> = {
    width: '104px',
    name: (
      <EuiScreenReaderOnly>
        <span>
          {i18n.translate('xpack.boost.rulesTab.actionsColumn', { defaultMessage: 'Actions' })}
        </span>
      </EuiScreenReaderOnly>
    ),
    actions: [
      {
        name: i18n.translate('xpack.boost.rulesTab.editAction', { defaultMessage: 'Edit' }),
        description: i18n.translate('xpack.boost.rulesTab.editActionDescription', {
          defaultMessage: 'Edit this boost rule',
        }),
        icon: 'pencil',
        type: 'icon',
        isPrimary: true,
        onClick: (rule) => {
          const defaultType = getDefaultRuleType(rule.name);
          if (rule.is_builtin && defaultType) {
            setEditedDefaultType(defaultType);
          } else {
            setFlyout({ rule });
          }
        },
        'data-test-subj': 'editBoostRule',
      },
      {
        name: i18n.translate('xpack.boost.rulesTab.duplicateAction', {
          defaultMessage: 'Duplicate',
        }),
        description: i18n.translate('xpack.boost.rulesTab.duplicateActionDescription', {
          defaultMessage: 'Create a new boost rule from this one',
        }),
        icon: 'copy',
        type: 'icon',
        isPrimary: true,
        // A copy of a default rule would match everything at the same priority, so only custom
        // rules can be duplicated.
        available: isCustomRule,
        onClick: (rule) => setFlyout({ duplicateOf: rule }),
        'data-test-subj': 'duplicateBoostRule',
      },
      {
        name: i18n.translate('xpack.boost.rulesTab.deleteAction', { defaultMessage: 'Delete' }),
        description: i18n.translate('xpack.boost.rulesTab.deleteActionDescription', {
          defaultMessage: 'Delete this boost rule',
        }),
        icon: 'trash',
        color: 'danger',
        type: 'icon',
        available: isCustomRule,
        onClick: setRuleToDelete,
        'data-test-subj': 'deleteBoostRule',
      },
    ],
  };

  const columns: Array<EuiBasicTableColumn<RuleRow>> = [
    {
      field: 'name',
      name: i18n.translate('xpack.boost.rulesTab.nameColumn', { defaultMessage: 'Rule name' }),
      sortable: true,
      // A single span keeps the name and badge in one inline run; table cells are flex containers.
      render: (name: string, { is_builtin: isBuiltin }: RuleRow) => (
        <span>
          <DetailsLink kind="rule" name={name} data-test-subj="boostRuleDetailsLink" />
          {isBuiltin && (
            <>
              {' '}
              <EuiBadge>{DEFAULT_BADGE_LABEL}</EuiBadge>
            </>
          )}
        </span>
      ),
    },
    {
      field: 'boost_profile',
      name: i18n.translate('xpack.boost.rulesTab.profileColumn', {
        defaultMessage: 'Profile name',
      }),
      sortable: true,
      render: (profileName: string) => (
        <DetailsLink kind="profile" name={profileName} data-test-subj="boostProfileDetailsLink" />
      ),
    },
    {
      field: 'priority',
      name: i18n.translate('xpack.boost.rulesTab.priorityColumn', {
        defaultMessage: 'Priority',
      }),
      // Fits the header and its sort arrow, which are wider than typical priorities.
      width: '7em',
      sortable: true,
      dataType: 'number',
    },
    {
      // Spelled out ("3 indices") and left-aligned; it still sorts numerically. It counts what the
      // rule applies to, with any matches a higher-ranked rule takes after it, which its list shows.
      field: 'appliesTo',
      name: i18n.translate('xpack.boost.rulesTab.appliesToColumn', {
        defaultMessage: 'Applies to',
      }),
      // Fits "All unmatched data streams" on one line.
      width: '17em',
      // A default rule applies to everything no other rule matches, so it sorts as applying to the
      // most, whatever is left over for it today.
      sortable: ({ appliesTo, is_builtin: isBuiltin }: RuleRow) =>
        isBuiltin ? Number.POSITIVE_INFINITY : appliesTo,
      render: (
        appliesTo: number,
        {
          index_patterns: patterns,
          profileType,
          is_builtin: isBuiltin,
          matches,
          matchedNames,
          supersededBy,
        }: RuleRow
      ) => (
        <RuleMatches
          patterns={patterns}
          type={profileType}
          isDefaultRule={isBuiltin}
          coverage={{ matches, matchedNames, appliesTo, supersededBy }}
        />
      ),
    },
    ...(canEdit ? [actionsColumn] : []),
  ];

  // Only profiles that rules use, since the others would filter to an empty table.
  const usedProfileNames = [...new Set(rules.map(({ boost_profile: name }) => name))].sort((a, b) =>
    a.localeCompare(b)
  );
  const filteredRows = rows.filter(
    ({ boost_profile: profileName, profileType }) =>
      matchesProfileFilter(profileSelections, profileName) &&
      matchesTypeFilter(typeFilter, profileType)
  );

  // The search box only searches text. The filters sit beside it and filter the rows themselves,
  // so they don't write query syntax into the box.
  const search: EuiSearchBarProps = {
    compressed: true,
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
              onClick={() => setFlyout({})}
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
      <EuiInMemoryTable
        tableCaption={i18n.translate('xpack.boost.rulesTab.caption', {
          defaultMessage: 'Boost rules',
        })}
        items={filteredRows}
        // Text searches names and profiles; patterns aren't shown in the table, so they aren't
        // searched either.
        executeQueryOptions={{ defaultFields: ['name', 'boost_profile'] }}
        itemId="name"
        columns={columns}
        search={search}
        sorting={{ sort: { field: 'name', direction: 'asc' } }}
        pagination={{ pageSize: PAGE_SIZE, pageSizeOptions: [PAGE_SIZE, 25, 50] }}
        data-test-subj="boostRulesTable"
      />

      {flyout && (
        <RuleFlyout
          rule={flyout.rule}
          duplicateOf={flyout.duplicateOf}
          onClose={() => setFlyout(undefined)}
        />
      )}

      {editedDefaultType && (
        <ProjectDefaultFlyout
          type={editedDefaultType}
          onClose={() => setEditedDefaultType(undefined)}
        />
      )}

      {ruleToDelete && (
        <DeleteRuleModal
          ruleName={ruleToDelete.name}
          rules={rules}
          profiles={profiles}
          dataSources={dataSources}
          onClose={() => setRuleToDelete(undefined)}
        />
      )}
    </>
  );
};
