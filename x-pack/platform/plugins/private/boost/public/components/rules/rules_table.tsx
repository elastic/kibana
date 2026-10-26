/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import type { EuiBasicTableColumn, EuiTableActionsColumnType } from '@elastic/eui';
import { EuiBadge, EuiInMemoryTable, EuiScreenReaderOnly, Query } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { RuleCoverage } from '../../../common/resolution';
import { getRuleCoverage } from '../../../common/resolution';
import { getDefaultRuleType } from '../../../common/presets';
import type {
  BoostDataSource,
  BoostProfile,
  BoostProfileType,
  BoostRule,
} from '../../../common/types';
import { DetailsLink } from '../details_link';
import { TableCount } from '../details/table_count';
import { useTablePage } from '../use_table_page';
import { ProjectDefaultFlyout } from '../project_defaults/project_default_flyout';
import { DeleteRuleModal } from './delete_rule_modal';
import { RuleFlyout } from './rule_flyout';
import { RuleMatches } from './rule_matches';
import { DEFAULT_BADGE_LABEL } from '../badge_labels';

export type RuleRow = BoostRule & RuleCoverage & { profileType?: BoostProfileType };

const isCustomRule = ({ is_builtin: isBuiltin }: BoostRule) => !isBuiltin;

const formatRuleCount = (count: number): string =>
  i18n.translate('xpack.boost.rulesTable.ruleCount', {
    defaultMessage: '{count, plural, one {# boost rule} other {# boost rules}}',
    values: { count },
  });

interface RulesTableProps {
  /** Every rule, which together decide what each one applies to. */
  rules: BoostRule[];
  profiles: BoostProfile[];
  dataSources: BoostDataSource[];
  canEdit: boolean;
  /** Which rules the table lists; all of them when omitted. */
  filter?: (row: RuleRow) => boolean;
  /** Whether to show each rule's profile, which a profile's own page leaves out. */
  showsProfile?: boolean;
  /** A search bar's query, run on rule names, and profiles when the table shows them. */
  searchQuery?: Query;
  /** Text from a search field that rule names must contain. */
  query?: string;
  /** Changes when filters outside the table change, which starts it again at the first page. */
  resetKey?: string;
  /** Whether to say above the table which of the rules the search leaves its page shows. */
  showsCount?: boolean;
  tableCaption: string;
  'data-test-subj'?: string;
}

/**
 * Boost rules with their profile, priority, and what each applies to, which lists everything it
 * matches. Each row's actions edit, copy, or delete it; a default rule is edited as its project
 * default, which the page's defaults edit too.
 */
export const RulesTable = ({
  rules,
  profiles,
  dataSources,
  canEdit,
  filter,
  showsProfile = true,
  searchQuery,
  query = '',
  resetKey = '',
  showsCount = false,
  tableCaption,
  'data-test-subj': dataTestSubj,
}: RulesTableProps) => {
  const [ruleToDelete, setRuleToDelete] = useState<RuleRow>();
  const [flyout, setFlyout] = useState<{ rule?: BoostRule; duplicateOf?: BoostRule }>();
  const [editedDefaultType, setEditedDefaultType] = useState<BoostProfileType>();

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
    ...(showsProfile
      ? [
          {
            field: 'boost_profile',
            name: i18n.translate('xpack.boost.rulesTab.profileColumn', {
              defaultMessage: 'Profile name',
            }),
            sortable: true,
            render: (profileName: string) => (
              <DetailsLink
                kind="profile"
                name={profileName}
                data-test-subj="boostProfileDetailsLink"
              />
            ),
          },
        ]
      : []),
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
      // rule applies to; its list shows everything it matches, and what higher-ranked rules take.
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

  const searchedText = query.trim().toLowerCase();
  const listed = rows.filter(
    (row) => (!filter || filter(row)) && row.name.toLowerCase().includes(searchedText)
  );
  // Patterns aren't shown in the table, so a search doesn't look in them either.
  const items = searchQuery
    ? Query.execute(searchQuery, listed, {
        defaultFields: showsProfile ? ['name', 'boost_profile'] : ['name'],
      })
    : listed;
  // A new search or filter starts again at the first page.
  const { pageIndex, pageSize, pagination, onTableChange } = useTablePage<RuleRow>(
    `${resetKey}|${query}|${searchQuery?.text ?? ''}`,
    items.length
  );

  return (
    <>
      {showsCount && (
        <TableCount
          pageIndex={pageIndex}
          pageSize={pageSize}
          total={items.length}
          formatTotal={formatRuleCount}
          data-test-subj="boostRulesCount"
        />
      )}
      <EuiInMemoryTable
        tableCaption={tableCaption}
        items={items}
        itemId="name"
        columns={columns}
        sorting={{ sort: { field: 'name', direction: 'asc' } }}
        pagination={pagination}
        onTableChange={onTableChange}
        data-test-subj={dataTestSubj}
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
