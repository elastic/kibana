/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import type {
  EuiBasicTableColumn,
  EuiSearchBarProps,
  EuiTableActionsColumnType,
} from '@elastic/eui';
import {
  EuiBadge,
  EuiButton,
  EuiConfirmModal,
  EuiIconTip,
  EuiInMemoryTable,
  EuiScreenReaderOnly,
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

/** Explains a custom rule's coverage when it doesn't apply to everything it matches. */
const getCoverageNote = ({
  profileType,
  matches,
  appliesTo,
}: RuleRow): { text: string; isWarning: boolean } | undefined => {
  if (matches === 0) {
    return {
      text:
        profileType === 'data_streams'
          ? i18n.translate('xpack.boost.rulesTab.noDataStreamMatches', {
              defaultMessage:
                "Doesn't match any data streams yet. Data streams created later that match will use this rule.",
            })
          : i18n.translate('xpack.boost.rulesTab.noIndexMatches', {
              defaultMessage:
                "Doesn't match any indices yet. Indices created later that match will use this rule.",
            }),
      isWarning: false,
    };
  }
  if (appliesTo === 0) {
    return {
      text: i18n.translate('xpack.boost.rulesTab.fullyOverridden', {
        defaultMessage:
          'Matches {matches}, but higher-ranked rules apply to all of them, so this rule has no effect.',
        values: { matches: formatDataSourceCount(profileType, matches) },
      }),
      isWarning: true,
    };
  }
  if (appliesTo < matches) {
    return {
      text: i18n.translate('xpack.boost.rulesTab.partlyOverridden', {
        defaultMessage: 'Matches {matches}. Higher-ranked rules apply to {overridden} of them.',
        values: {
          matches: formatDataSourceCount(profileType, matches),
          overridden: matches - appliesTo,
        },
      }),
      isWarning: false,
    };
  }
  return undefined;
};

export const RulesTab = ({ rules, profiles, dataSources, canEdit }: RulesTabProps) => {
  const { notifications } = useBoostServices();
  const deleteModalTitleId = useGeneratedHtmlId();
  const [ruleToDelete, setRuleToDelete] = useState<RuleRow>();
  const [isCreating, setIsCreating] = useState(false);
  const { mutate: deleteRule, isLoading: isDeleting } = useDeleteRule();

  const rows = useMemo<RuleRow[]>(() => {
    const profileTypes = new Map(profiles.map(({ name, type }) => [name, type]));
    const coverage = getRuleCoverage(dataSources, rules, profiles);
    return rules.map((rule) => ({
      ...rule,
      profileType: profileTypes.get(rule.boost_profile),
      ...(coverage.get(rule.name) ?? { matches: 0, appliesTo: 0 }),
    }));
  }, [rules, profiles, dataSources]);

  const actionsColumn: EuiTableActionsColumnType<RuleRow> = {
    width: '64px',
    name: (
      <EuiScreenReaderOnly>
        <span>
          {i18n.translate('xpack.boost.rulesTab.actionsColumn', { defaultMessage: 'Actions' })}
        </span>
      </EuiScreenReaderOnly>
    ),
    actions: [
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
      // Spelled out ("3 indices") and left-aligned; it still sorts numerically.
      field: 'appliesTo',
      name: i18n.translate('xpack.boost.rulesTab.appliesToColumn', {
        defaultMessage: 'Applies to',
      }),
      width: '12%',
      sortable: true,
      render: (appliesTo: number, row: RuleRow) => {
        // Default rules catch whatever no custom rule claims, so partial coverage is expected.
        const note = row.is_builtin ? undefined : getCoverageNote(row);
        return (
          <span>
            {formatDataSourceCount(row.profileType, appliesTo)}
            {note && (
              <>
                {' '}
                <EuiIconTip
                  type={note.isWarning ? 'warning' : 'info'}
                  color={note.isWarning ? 'warning' : 'subdued'}
                  size="s"
                  content={note.text}
                  aria-label={note.text}
                />
              </>
            )}
          </span>
        );
      },
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
    ...(canEdit ? [actionsColumn] : []),
  ];

  const search: EuiSearchBarProps = {
    compressed: true,
    box: {
      incremental: true,
      placeholder: i18n.translate('xpack.boost.rulesTab.searchPlaceholder', {
        defaultMessage: 'Search boost rules',
      }),
    },
    filters: [
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
      <EuiButton fill size="s" onClick={() => setIsCreating(true)} data-test-subj="createBoostRule">
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

      {isCreating && <RuleFlyout onClose={() => setIsCreating(false)} />}

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
