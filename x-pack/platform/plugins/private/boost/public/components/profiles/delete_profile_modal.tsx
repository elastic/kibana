/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import type { EuiBasicTableColumn } from '@elastic/eui';
import {
  EuiBasicTable,
  EuiCode,
  EuiConfirmModal,
  EuiNotificationBadge,
  EuiPanel,
  EuiSpacer,
  EuiTab,
  EuiTabs,
  EuiText,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { getRuleCoverage, resolveRule, sortRules } from '../../../common/resolution';
import type { BoostDataSource, BoostProfile, BoostRule } from '../../../common/types';
import { useBoostServices } from '../../hooks/use_boost_services';
import { useDeleteProfile } from '../../hooks/use_boost_state';
import { formatDataSourceCount } from '../format';

interface DeleteProfileModalProps {
  profile: BoostProfile;
  rules: BoostRule[];
  profiles: BoostProfile[];
  dataSources: BoostDataSource[];
  onClose: () => void;
}

type ListTab = 'rules' | 'dataSources';

interface DeletedRuleRow {
  name: string;
  indexPattern: string;
  appliesTo: number;
}

interface AffectedDataSourceRow {
  name: string;
  /** The profile the data source falls back to once the rules are gone. */
  nextProfile?: string;
}

/**
 * Confirms deleting a custom profile. Its custom rules are deleted with it, and the data sources
 * they applied to fall back to the next matching rule.
 */
export const DeleteProfileModal = ({
  profile,
  rules,
  profiles,
  dataSources,
  onClose,
}: DeleteProfileModalProps) => {
  const { euiTheme } = useEuiTheme();
  const { notifications } = useBoostServices();
  const titleId = useGeneratedHtmlId();
  const tabIdPrefix = useGeneratedHtmlId({ prefix: 'deleteProfileTab' });
  const [selectedTab, setSelectedTab] = useState<ListTab>('rules');
  const { mutate: deleteProfile, isLoading: isDeleting } = useDeleteProfile();
  const { name, type } = profile;

  const { deletedRules, affectedDataSources } = useMemo(() => {
    const profilesByName = new Map(profiles.map((item) => [item.name, item]));
    const coverage = getRuleCoverage(dataSources, rules, profiles);
    const attached = sortRules(rules).filter(
      ({ is_builtin: isBuiltin, boost_profile: profileName }) => !isBuiltin && profileName === name
    );
    const attachedNames = new Set(attached.map((rule) => rule.name));
    const remainingRules = rules.filter((rule) => !attachedNames.has(rule.name));

    return {
      deletedRules: attached.map(
        (rule): DeletedRuleRow => ({
          name: rule.name,
          indexPattern: rule.index_pattern,
          appliesTo: coverage.get(rule.name)?.appliesTo ?? 0,
        })
      ),
      affectedDataSources: dataSources
        .filter(
          (dataSource) => resolveRule(dataSource, rules, profilesByName)?.boost_profile === name
        )
        .map(
          (dataSource): AffectedDataSourceRow => ({
            name: dataSource.name,
            nextProfile: resolveRule(dataSource, remainingRules, profilesByName)?.boost_profile,
          })
        )
        .sort((a, b) => a.name.localeCompare(b.name)),
    };
  }, [name, rules, profiles, dataSources]);

  const rulesLabel = i18n.translate('xpack.boost.deleteProfileModal.rulesTab', {
    defaultMessage: 'Boost rules to delete',
  });
  const dataSourcesLabel =
    type === 'indices'
      ? i18n.translate('xpack.boost.deleteProfileModal.affectedIndicesTab', {
          defaultMessage: 'Affected indices',
        })
      : i18n.translate('xpack.boost.deleteProfileModal.affectedDataStreamsTab', {
          defaultMessage: 'Affected data streams',
        });

  const ruleColumns: Array<EuiBasicTableColumn<DeletedRuleRow>> = [
    {
      field: 'name',
      name: i18n.translate('xpack.boost.deleteProfileModal.ruleNameColumn', {
        defaultMessage: 'Name',
      }),
    },
    {
      field: 'indexPattern',
      name: i18n.translate('xpack.boost.deleteProfileModal.indexPatternColumn', {
        defaultMessage: 'Index pattern',
      }),
      render: (pattern: string) => <EuiCode>{pattern}</EuiCode>,
    },
    {
      field: 'appliesTo',
      name: i18n.translate('xpack.boost.deleteProfileModal.appliesToColumn', {
        defaultMessage: 'Applies to',
      }),
      render: (appliesTo: number) => formatDataSourceCount(type, appliesTo),
    },
  ];

  const dataSourceColumns: Array<EuiBasicTableColumn<AffectedDataSourceRow>> = [
    {
      field: 'name',
      name: i18n.translate('xpack.boost.deleteProfileModal.dataSourceNameColumn', {
        defaultMessage: 'Name',
      }),
    },
    {
      field: 'nextProfile',
      name: i18n.translate('xpack.boost.deleteProfileModal.nextProfileColumn', {
        defaultMessage: 'Will use boost profile',
      }),
    },
  ];

  const hasTabs = affectedDataSources.length > 0;
  const showsRules = !hasTabs || selectedTab === 'rules';
  const tabs: ReadonlyArray<{ id: ListTab; label: string; count: number }> = [
    { id: 'rules', label: rulesLabel, count: deletedRules.length },
    { id: 'dataSources', label: dataSourcesLabel, count: affectedDataSources.length },
  ];

  // Both consequences are stated up front, so nothing important hides behind a tab.
  const summary = [
    i18n.translate('xpack.boost.deleteProfileModal.rulesDeleted', {
      defaultMessage:
        'Deleting this profile also deletes {ruleCount, plural, one {the boost rule that uses it} other {the # boost rules that use it}}.',
      values: { ruleCount: deletedRules.length },
    }),
    ...(hasTabs
      ? [
          i18n.translate('xpack.boost.deleteProfileModal.fallBack', {
            defaultMessage: '{dataSources} will fall back to the next matching rule.',
            values: { dataSources: formatDataSourceCount(type, affectedDataSources.length) },
          }),
        ]
      : []),
    i18n.translate('xpack.boost.deleteProfileModal.undoWarning', {
      defaultMessage: "You can't undo this action.",
    }),
  ].join(' ');

  return (
    <EuiConfirmModal
      aria-labelledby={titleId}
      titleProps={{ id: titleId }}
      title={i18n.translate('xpack.boost.profilesTab.deleteModalTitle', {
        defaultMessage: "Delete ''{profileName}'' boost profile?",
        values: { profileName: name },
      })}
      onCancel={onClose}
      onConfirm={() =>
        deleteProfile(name, {
          onSuccess: () =>
            notifications.toasts.addSuccess(
              i18n.translate('xpack.boost.profilesTab.deletedToast', {
                defaultMessage: 'Deleted boost profile "{name}"',
                values: { name },
              })
            ),
          onSettled: onClose,
        })
      }
      cancelButtonText={i18n.translate('xpack.boost.profilesTab.deleteModalCancel', {
        defaultMessage: 'Cancel',
      })}
      confirmButtonText={
        deletedRules.length > 0
          ? i18n.translate('xpack.boost.deleteProfileModal.confirmWithRules', {
              defaultMessage: 'Delete profile and rules',
            })
          : i18n.translate('xpack.boost.profilesTab.deleteModalConfirm', {
              defaultMessage: 'Delete profile',
            })
      }
      buttonColor="danger"
      isLoading={isDeleting}
      data-test-subj="deleteBoostProfileModal"
    >
      {deletedRules.length === 0 ? (
        <p>
          {i18n.translate('xpack.boost.profilesTab.deleteModalBody', {
            defaultMessage: "This permanently deletes the profile. You can't undo this action.",
          })}
        </p>
      ) : (
        <>
          <EuiText size="s">
            <p>{summary}</p>
          </EuiText>
          <EuiSpacer size="m" />
          <EuiPanel hasBorder hasShadow={false} paddingSize="none">
            {hasTabs && (
              <EuiTabs size="s" css={{ paddingInline: euiTheme.size.s }}>
                {tabs.map(({ id, label, count }) => (
                  <EuiTab
                    key={id}
                    id={`${tabIdPrefix}-${id}`}
                    isSelected={selectedTab === id}
                    onClick={() => setSelectedTab(id)}
                    append={
                      <EuiNotificationBadge color="subdued" size="s">
                        {count}
                      </EuiNotificationBadge>
                    }
                    data-test-subj={`deleteProfileModalTab-${id}`}
                  >
                    {label}
                  </EuiTab>
                ))}
              </EuiTabs>
            )}
            {/* Long lists scroll inside the panel, keeping the modal's buttons in view. */}
            <div
              role={hasTabs ? 'tabpanel' : 'region'}
              aria-labelledby={hasTabs ? `${tabIdPrefix}-${selectedTab}` : undefined}
              aria-label={hasTabs ? undefined : rulesLabel}
              tabIndex={0}
              css={{ maxBlockSize: euiTheme.base * 15, overflowY: 'auto' }}
            >
              {showsRules ? (
                <EuiBasicTable
                  compressed
                  items={deletedRules}
                  itemId="name"
                  columns={ruleColumns}
                  tableCaption={rulesLabel}
                />
              ) : (
                <EuiBasicTable
                  compressed
                  items={affectedDataSources}
                  itemId="name"
                  columns={dataSourceColumns}
                  tableCaption={dataSourcesLabel}
                />
              )}
            </div>
          </EuiPanel>
        </>
      )}
    </EuiConfirmModal>
  );
};
