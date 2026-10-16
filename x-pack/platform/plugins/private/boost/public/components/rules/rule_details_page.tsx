/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { useHistory, useParams } from 'react-router-dom';
import type { EuiBasicTableColumn } from '@elastic/eui';
import {
  EuiBadge,
  EuiCode,
  EuiFlexGroup,
  EuiFlexItem,
  EuiInMemoryTable,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { AppHeaderLoading } from '@kbn/app-header';
import { i18n } from '@kbn/i18n';
import { PLUGIN_ID } from '../../../common/constants';
import { getModeRules } from '../../../common/mode_switch';
import { getAppliedRules, getRuleCoverage } from '../../../common/resolution';
import type { BoostDataSource } from '../../../common/types';
import { estimateDataSourcesVcuRange } from '../../../common/vcu_estimate';
import { useBoostServices } from '../../hooks/use_boost_services';
import { useBoostState } from '../../hooks/use_boost_state';
import { COST_DISCLAIMER, formatSize, getCostText } from '../cost_estimate';
import { DetailsPage, DetailsPanel, SimpleModeNotice } from '../details/details_page';
import { DetailsList } from '../details/details_list';
import { DetailsLink } from '../details_link';
import { PROFILE_TYPE_LABELS, formatDataSourceCount } from '../format';
import { LoadError } from '../load_error';
import { MANAGED_BADGE_LABEL } from '../profiles/profiles_tab';
import { DeleteRuleModal } from './delete_rule_modal';
import { RuleFlyout } from './rule_flyout';
import { getAllUnmatchedLabel } from './rule_matches';
import { DEFAULT_BADGE_LABEL } from './rules_tab';
import { SupersedingRule } from './target_name';

type FlyoutState = 'edit' | 'duplicate' | undefined;

/** A boost rule's targets, profile, and priority, and what it applies to. */
export const RuleDetailsPage = () => {
  const { application } = useBoostServices();
  const canEdit = application.capabilities[PLUGIN_ID]?.save === true;
  const history = useHistory();
  const { ruleName: name } = useParams<{ ruleName: string }>();
  const { data: state, error, refetch } = useBoostState();
  const [flyout, setFlyout] = useState<FlyoutState>();
  const [isDeleting, setIsDeleting] = useState(false);

  if (error) {
    return <LoadError error={error} onRetry={() => refetch()} />;
  }
  if (!state) {
    return <AppHeaderLoading />;
  }

  // What applies in advanced mode, which is where custom rules take effect.
  const rules = getModeRules(state, 'advanced');
  const rule = rules.find((item) => item.name === name);
  if (!rule) {
    return <DetailsPage list="rules" name={name} isFound={false} />;
  }

  const { profiles, data_sources: dataSources } = state;
  const { is_builtin: isDefaultRule, index_patterns: patterns } = rule;
  const profile = profiles.find((item) => item.name === rule.boost_profile);
  const type = profile?.type;
  const coverage = getRuleCoverage(dataSources, rules, profiles).get(name);
  const appliedRules = getAppliedRules(dataSources, rules, profiles);
  const dataSourcesByName = new Map(dataSources.map((dataSource) => [dataSource.name, dataSource]));
  const matched = (coverage?.matchedNames ?? [])
    .flatMap((matchedName) => dataSourcesByName.get(matchedName) ?? [])
    .sort((a, b) => a.name.localeCompare(b.name));
  const applied = matched.filter((dataSource) => appliedRules.get(dataSource.name)?.name === name);
  const sizeInBytes = applied.reduce((total, { size_in_bytes: bytes }) => total + bytes, 0);
  const vcus = profile ? estimateDataSourcesVcuRange(applied, profile) : { atRest: 0, atPeak: 0 };
  const supersededCount = matched.length - applied.length;
  const isAdvanced = state.settings.mode === 'advanced';
  const existingNames = new Set(dataSources.map(({ name: dataSourceName }) => dataSourceName));
  const [firstPattern = ''] = patterns;
  // Matches how the rule form opens it: a pattern, or names that were selected.
  const isPattern =
    patterns.length === 1 && (firstPattern.includes('*') || !existingNames.has(firstPattern));

  const targets = isDefaultRule ? (
    getAllUnmatchedLabel(type)
  ) : isPattern ? (
    <>
      {i18n.translate('xpack.boost.ruleDetails.patternTarget', {
        defaultMessage: 'Index pattern',
      })}{' '}
      <EuiCode>{firstPattern}</EuiCode>
    </>
  ) : (
    i18n.translate('xpack.boost.ruleDetails.selectedTargets', {
      defaultMessage: 'Selected {targets}',
      values: { targets: formatDataSourceCount(type, patterns.length) },
    })
  );

  const columns: Array<EuiBasicTableColumn<BoostDataSource>> = [
    {
      field: 'name',
      name:
        type === 'data_streams'
          ? i18n.translate('xpack.boost.ruleDetails.dataStreamColumn', {
              defaultMessage: 'Data stream',
            })
          : i18n.translate('xpack.boost.ruleDetails.indexColumn', { defaultMessage: 'Index' }),
      sortable: true,
    },
    {
      name: i18n.translate('xpack.boost.ruleDetails.appliedByColumn', {
        defaultMessage: 'Applied by',
      }),
      render: ({ name: dataSourceName }: BoostDataSource) => {
        const appliedRule = appliedRules.get(dataSourceName);
        return appliedRule && appliedRule.name !== name ? (
          <EuiText size="s">
            <SupersedingRule rule={appliedRule.name} isLinked />
          </EuiText>
        ) : (
          i18n.translate('xpack.boost.ruleDetails.thisRule', { defaultMessage: 'This rule' })
        );
      },
    },
    {
      field: 'size_in_bytes',
      name: i18n.translate('xpack.boost.ruleDetails.sizeColumn', { defaultMessage: 'Size' }),
      width: '9em',
      sortable: true,
      dataType: 'number',
      render: formatSize,
    },
  ];

  return (
    <DetailsPage
      list="rules"
      name={name}
      isFound
      badges={[
        ...(type ? [{ label: PROFILE_TYPE_LABELS[type], color: 'hollow' as const }] : []),
        ...(isDefaultRule ? [{ label: DEFAULT_BADGE_LABEL }] : []),
      ]}
      // Default rules can only change their profile, so they can't be copied or deleted.
      menu={
        canEdit
          ? {
              primaryActionItem: {
                id: 'edit',
                label: i18n.translate('xpack.boost.ruleDetails.editAction', {
                  defaultMessage: 'Edit rule',
                }),
                iconType: 'pencil',
                run: () => setFlyout('edit'),
                testId: 'boostRuleDetailsEdit',
              },
              items: isDefaultRule
                ? undefined
                : [
                    {
                      id: 'duplicate',
                      label: i18n.translate('xpack.boost.ruleDetails.duplicateAction', {
                        defaultMessage: 'Duplicate',
                      }),
                      iconType: 'copy',
                      run: () => setFlyout('duplicate'),
                      testId: 'boostRuleDetailsDuplicate',
                    },
                    {
                      id: 'delete',
                      label: i18n.translate('xpack.boost.ruleDetails.deleteAction', {
                        defaultMessage: 'Delete',
                      }),
                      iconType: 'trash',
                      overflow: true,
                      isDestructive: true,
                      run: () => setIsDeleting(true),
                      testId: 'boostRuleDetailsDelete',
                    },
                  ],
            }
          : undefined
      }
      notice={
        !isAdvanced && (
          <SimpleModeNotice>
            {isDefaultRule
              ? i18n.translate('xpack.boost.ruleDetails.simpleModeDefaultNotice', {
                  defaultMessage:
                    'Default rules use the profiles chosen in simple mode until advanced mode is turned back on. The details below show how this rule applies in advanced mode.',
                })
              : i18n.translate('xpack.boost.ruleDetails.simpleModeNotice', {
                  defaultMessage:
                    'This rule is suspended until advanced mode is turned back on. The details below show how it applies in advanced mode.',
                })}
          </SimpleModeNotice>
        )
      }
    >
      <EuiFlexGroup gutterSize="l" alignItems="stretch">
        <EuiFlexItem>
          <DetailsPanel
            title={i18n.translate('xpack.boost.ruleDetails.settingsTitle', {
              defaultMessage: 'Settings',
            })}
            fillsHeight
            data-test-subj="boostRuleSettings"
          >
            <DetailsList
              items={[
                {
                  title: i18n.translate('xpack.boost.ruleDetails.profile', {
                    defaultMessage: 'Boost profile',
                  }),
                  description: (
                    <span>
                      <DetailsLink kind="profile" name={rule.boost_profile} />
                      {profile?.is_builtin && (
                        <>
                          {' '}
                          <EuiBadge>{MANAGED_BADGE_LABEL}</EuiBadge>
                        </>
                      )}
                    </span>
                  ),
                },
                {
                  title: i18n.translate('xpack.boost.ruleDetails.targets', {
                    defaultMessage: 'Targets',
                  }),
                  description: targets,
                },
                {
                  title: i18n.translate('xpack.boost.ruleDetails.priority', {
                    defaultMessage: 'Priority',
                  }),
                  tip: i18n.translate('xpack.boost.ruleDetails.priorityTip', {
                    defaultMessage:
                      'When several rules match the same index or data stream, the highest priority applies.',
                  }),
                  description: rule.priority,
                },
              ]}
            />
          </DetailsPanel>
        </EuiFlexItem>
        <EuiFlexItem>
          <DetailsPanel
            title={i18n.translate('xpack.boost.ruleDetails.usageTitle', {
              defaultMessage: 'Usage',
            })}
            fillsHeight
            data-test-subj="boostRuleUsage"
          >
            <DetailsList
              items={[
                {
                  title: i18n.translate('xpack.boost.ruleDetails.matches', {
                    defaultMessage: 'Matches',
                  }),
                  description: formatDataSourceCount(type, matched.length),
                },
                {
                  title: i18n.translate('xpack.boost.ruleDetails.appliesTo', {
                    defaultMessage: 'Applies to',
                  }),
                  tip: i18n.translate('xpack.boost.ruleDetails.appliesToTip', {
                    defaultMessage:
                      'What this rule matches, less any that a higher-ranked rule applies to instead.',
                  }),
                  description: formatDataSourceCount(type, applied.length),
                },
                {
                  title: i18n.translate('xpack.boost.ruleDetails.data', {
                    defaultMessage: 'Data',
                  }),
                  description: formatSize(sizeInBytes),
                },
                {
                  title: i18n.translate('xpack.boost.ruleDetails.cost', {
                    defaultMessage: 'Search cost per hour',
                  }),
                  tip: COST_DISCLAIMER,
                  description: (
                    <>
                      {getCostText('atRest', vcus.atRest)}
                      <br />
                      {getCostText('atPeak', vcus.atPeak)}
                    </>
                  ),
                },
              ]}
            />
          </DetailsPanel>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="l" />
      <DetailsPanel
        title={
          type === 'data_streams'
            ? i18n.translate('xpack.boost.ruleDetails.matchedDataStreamsTitle', {
                defaultMessage: 'Matched data streams',
              })
            : i18n.translate('xpack.boost.ruleDetails.matchedIndicesTitle', {
                defaultMessage: 'Matched indices',
              })
        }
        data-test-subj="boostRuleMatched"
      >
        {supersededCount > 0 && (
          <>
            <EuiText size="s" color="subdued">
              <p>
                {i18n.translate('xpack.boost.ruleDetails.supersededDescription', {
                  defaultMessage:
                    'A higher-ranked rule applies to {count} of them instead. To outrank it, increase this rule’s priority.',
                  values: { count: supersededCount },
                })}
              </p>
            </EuiText>
            <EuiSpacer size="s" />
          </>
        )}
        <EuiInMemoryTable
          tableCaption={i18n.translate('xpack.boost.ruleDetails.matchedCaption', {
            defaultMessage: 'Indices or data streams this rule matches',
          })}
          items={matched}
          columns={columns}
          sorting={{ sort: { field: 'name', direction: 'asc' } }}
          pagination={matched.length > 10 ? { pageSizeOptions: [10, 25, 50] } : undefined}
          search={matched.length > 10 ? { box: { incremental: true } } : undefined}
          noItemsMessage={i18n.translate('xpack.boost.ruleDetails.noMatches', {
            defaultMessage: 'This rule matches nothing yet.',
          })}
        />
      </DetailsPanel>

      {flyout && (
        <RuleFlyout
          rule={flyout === 'edit' ? rule : undefined}
          duplicateOf={flyout === 'duplicate' ? rule : undefined}
          onClose={() => setFlyout(undefined)}
        />
      )}
      {isDeleting && (
        <DeleteRuleModal
          ruleName={name}
          profileType={type}
          appliesTo={applied.length}
          onClose={() => setIsDeleting(false)}
          onDeleted={() => history.push('/rules')}
        />
      )}
    </DetailsPage>
  );
};
