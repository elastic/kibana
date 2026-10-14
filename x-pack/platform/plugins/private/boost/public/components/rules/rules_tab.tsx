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
  EuiConfirmModal,
  EuiInMemoryTable,
  EuiScreenReaderOnly,
  Query,
  useGeneratedHtmlId,
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
import { useBoostServices } from '../../hooks/use_boost_services';
import { useDeleteRule } from '../../hooks/use_boost_state';
import { PROFILE_TYPE_LABELS, formatDataSourceCount } from '../format';
import { PROFILE_FILTER_FIELD, ProfileFilter } from './profile_filter';
import { RuleTargets } from './rule_targets';
import { RuleFlyout } from './rule_flyout';

interface RulesTabProps {
  rules: BoostRule[];
  profiles: BoostProfile[];
  dataSources: BoostDataSource[];
  canEdit: boolean;
}

type RuleRow = BoostRule & RuleCoverage & { profileType?: BoostProfileType };

const PAGE_SIZE = 10;

const DEFAULT_BADGE_LABEL = i18n.translate('xpack.boost.rulesTab.defaultBadge', {
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
  const { notifications } = useBoostServices();
  const deleteModalTitleId = useGeneratedHtmlId();
  const [ruleToDelete, setRuleToDelete] = useState<RuleRow>();
  // Undefined while closed; an empty object creates a rule, and `rule` edits one.
  const [flyout, setFlyout] = useState<{ rule?: BoostRule; duplicateOf?: BoostRule }>();
  const { mutate: deleteRule, isLoading: isDeleting } = useDeleteRule();
  const { search: locationSearch } = useLocation();
  // Read once, so the filter is the user's to change afterwards. The profile filter matches values
  // in its "or" form, so the query is built that way.
  const [defaultQuery] = useState(() => {
    const profileName = new URLSearchParams(locationSearch).get(PROFILE_FILTER_PARAM);
    return profileName
      ? Query.parse('').addOrFieldValue(PROFILE_FILTER_FIELD, profileName, true, 'eq')
      : undefined;
  });

  const rows = useMemo<RuleRow[]>(() => {
    const profileTypes = new Map(profiles.map(({ name, type }) => [name, type]));
    const coverage = getRuleCoverage(dataSources, rules, profiles);
    return rules.map((rule) => ({
      ...rule,
      profileType: profileTypes.get(rule.boost_profile),
      ...(coverage.get(rule.name) ?? { matches: 0, appliesTo: 0 }),
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
        onClick: (rule) => setFlyout({ rule }),
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
      name: i18n.translate('xpack.boost.rulesTab.nameColumn', { defaultMessage: 'Name' }),
      sortable: true,
      // A single span keeps the name and badge in one inline run; table cells are flex containers.
      render: (name: string, { is_builtin: isBuiltin }: RuleRow) => (
        <span>
          {name}
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
        defaultMessage: 'Profile',
      }),
      sortable: true,
    },
    {
      field: 'index_patterns',
      name: i18n.translate('xpack.boost.rulesTab.targetsColumn', {
        defaultMessage: 'Targets',
      }),
      render: (patterns: string[], { profileType }: RuleRow) => (
        <RuleTargets patterns={patterns} type={profileType} />
      ),
    },
    {
      field: 'priority',
      name: i18n.translate('xpack.boost.rulesTab.priorityColumn', {
        defaultMessage: 'Priority',
      }),
      width: '12%',
      sortable: true,
      dataType: 'number',
    },
    {
      // Spelled out ("3 indices") and left-aligned; it still sorts numerically.
      field: 'appliesTo',
      name: i18n.translate('xpack.boost.rulesTab.appliesToColumn', {
        defaultMessage: 'Applies to',
      }),
      width: '12%',
      sortable: true,
      render: (appliesTo: number, { profileType }: RuleRow) =>
        formatDataSourceCount(profileType, appliesTo),
    },
    ...(canEdit ? [actionsColumn] : []),
  ];

  // Only profiles that rules use, since the others would filter to an empty table. The filter
  // component keeps its identity while the names don't change, so its popover stays open.
  const usedProfileNamesKey = [...new Set(rules.map(({ boost_profile: name }) => name))]
    .sort((a, b) => a.localeCompare(b))
    .join('\n');
  const RulesProfileFilter = useMemo(() => {
    const profileNames = usedProfileNamesKey ? usedProfileNamesKey.split('\n') : [];
    return (props: { query: Query; onChange?: (query: Query) => void }) => (
      <ProfileFilter {...props} profileNames={profileNames} />
    );
  }, [usedProfileNamesKey]);

  const search: EuiSearchBarProps = {
    compressed: true,
    defaultQuery,
    box: {
      incremental: true,
      placeholder: i18n.translate('xpack.boost.rulesTab.searchPlaceholder', {
        defaultMessage: 'Search boost rules',
      }),
    },
    filters: [
      { type: 'custom_component', component: RulesProfileFilter },
      {
        type: 'field_value_toggle_group',
        field: 'profileType',
        items: [
          { value: 'indices', name: PROFILE_TYPE_LABELS.indices },
          { value: 'data_streams', name: PROFILE_TYPE_LABELS.data_streams },
        ],
      },
    ],
    toolsRight: canEdit ? (
      <EuiButton fill size="s" onClick={() => setFlyout({})} data-test-subj="createBoostRule">
        {i18n.translate('xpack.boost.rulesTab.createButton', {
          defaultMessage: 'Create boost rule',
        })}
      </EuiButton>
    ) : undefined,
  };

  return (
    <>
      <EuiInMemoryTable
        tableCaption={i18n.translate('xpack.boost.rulesTab.caption', {
          defaultMessage: 'Boost rules',
        })}
        items={rows}
        itemId="name"
        columns={columns}
        search={search}
        sorting={{ sort: { field: 'name', direction: 'asc' } }}
        pagination={
          rows.length > PAGE_SIZE
            ? { pageSize: PAGE_SIZE, pageSizeOptions: [PAGE_SIZE, 25, 50] }
            : undefined
        }
        data-test-subj="boostRulesTable"
      />

      {flyout && (
        <RuleFlyout
          rule={flyout.rule}
          duplicateOf={flyout.duplicateOf}
          onClose={() => setFlyout(undefined)}
        />
      )}

      {ruleToDelete && (
        <EuiConfirmModal
          aria-labelledby={deleteModalTitleId}
          titleProps={{ id: deleteModalTitleId }}
          title={i18n.translate('xpack.boost.rulesTab.deleteModalTitle', {
            defaultMessage: 'Delete boost rule "{name}"?',
            values: { name: ruleToDelete.name },
          })}
          onCancel={() => setRuleToDelete(undefined)}
          onConfirm={() =>
            deleteRule(ruleToDelete.name, {
              onSuccess: () =>
                notifications.toasts.addSuccess(
                  i18n.translate('xpack.boost.rulesTab.deletedToast', {
                    defaultMessage: 'Deleted boost rule "{name}"',
                    values: { name: ruleToDelete.name },
                  })
                ),
              onSettled: () => setRuleToDelete(undefined),
            })
          }
          cancelButtonText={i18n.translate('xpack.boost.rulesTab.deleteModalCancel', {
            defaultMessage: 'Cancel',
          })}
          confirmButtonText={i18n.translate('xpack.boost.rulesTab.deleteModalConfirm', {
            defaultMessage: 'Delete rule',
          })}
          buttonColor="danger"
          isLoading={isDeleting}
        >
          <p>
            {ruleToDelete.appliesTo > 0
              ? i18n.translate('xpack.boost.rulesTab.deleteModalBodyInUse', {
                  defaultMessage:
                    "The {dataSources} this rule applies to will use the next matching rule, such as the default rule. You can't undo this action.",
                  values: {
                    dataSources: formatDataSourceCount(
                      ruleToDelete.profileType,
                      ruleToDelete.appliesTo
                    ),
                  },
                })
              : i18n.translate('xpack.boost.rulesTab.deleteModalBody', {
                  defaultMessage: "This permanently deletes the rule. You can't undo this action.",
                })}
          </p>
        </EuiConfirmModal>
      )}
    </>
  );
};
