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
  EuiBasicTable,
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIconTip,
  EuiInMemoryTable,
  EuiLink,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { AppHeaderLoading } from '@kbn/app-header';
import { i18n } from '@kbn/i18n';
import { reactRouterNavigate } from '@kbn/kibana-react-plugin/public';
import { PLUGIN_ID } from '../../../common/constants';
import { getModeRules } from '../../../common/mode_switch';
import type { RuleCoverage } from '../../../common/resolution';
import { getAppliedRules, getRuleCoverage } from '../../../common/resolution';
import type {
  BoostDataSource,
  BoostPeriod,
  BoostProfile,
  BoostRule,
  DataStreamsBoostProfile,
  IndicesBoostProfile,
} from '../../../common/types';
import { estimateDataSourcesVcuRange } from '../../../common/vcu_estimate';
import { useBoostServices } from '../../hooks/use_boost_services';
import { useBoostState } from '../../hooks/use_boost_state';
import { COST_DISCLAIMER, formatSize, getCostText } from '../cost_estimate';
import { DetailsPage, DetailsPanel, SimpleModeNotice } from '../details/details_page';
import { DetailsList } from '../details/details_list';
import { DetailsLink } from '../details_link';
import { PROFILE_TYPE_LABELS, formatBoost, formatDataSourceCount, formatMaxAge } from '../format';
import { LoadError } from '../load_error';
import { RuleFlyout } from '../rules/rule_flyout';
import { RuleMatches } from '../rules/rule_matches';
import { DEFAULT_BADGE_LABEL, getProfileRulesLocation } from '../rules/rules_tab';
import { AgeTimeline } from './age_timeline';
import { DeleteProfileModal } from './delete_profile_modal';
import { PERIOD_LABELS } from './period_labels';
import { INDEX_OPTIONS, ProfileFlyout } from './profile_flyout';
import { MANAGED_BADGE_LABEL, USED_BY_DEFAULT_RULE_DESCRIPTIONS } from './profiles_tab';

const ON_LABEL = i18n.translate('xpack.boost.profileDetails.on', { defaultMessage: 'On' });
const OFF_LABEL = i18n.translate('xpack.boost.profileDetails.off', { defaultMessage: 'Off' });

const MIN_BOOST_LABEL = i18n.translate('xpack.boost.profileDetails.minBoost', {
  defaultMessage: 'Min boost',
});
const MAX_BOOST_LABEL = i18n.translate('xpack.boost.profileDetails.maxBoost', {
  defaultMessage: 'Max boost',
});

type FlyoutState = 'edit' | 'duplicate' | 'createRule' | undefined;

type RuleRow = BoostRule & RuleCoverage;

const IndicesSettings = ({ profile }: { profile: IndicesBoostProfile }) => {
  const optionValues = {
    extraCopy: profile.high_availability === 'one_extra_copy',
    prewarm: profile.prewarm,
    pinned: profile.pinned,
  };
  return (
    <DetailsList
      items={[
        { title: MIN_BOOST_LABEL, description: formatBoost(profile.min_boost) },
        { title: MAX_BOOST_LABEL, description: formatBoost(profile.max_boost) },
        ...INDEX_OPTIONS.map(({ key, title, description }) => ({
          title,
          tip: description,
          description: optionValues[key] ? ON_LABEL : OFF_LABEL,
        })),
      ]}
    />
  );
};

interface PeriodRow {
  id: keyof typeof PERIOD_LABELS;
  period: BoostPeriod;
}

// Data stream profiles only have periods, so there's nothing about copies, prewarm, or pinning.
const DataStreamsSettings = ({ profile }: { profile: DataStreamsBoostProfile }) => {
  const columns: Array<EuiBasicTableColumn<PeriodRow>> = [
    {
      field: 'id',
      name: i18n.translate('xpack.boost.profileDetails.periodColumn', {
        defaultMessage: 'Period',
      }),
      render: (id: PeriodRow['id']) => (
        <span>
          {PERIOD_LABELS[id].title}{' '}
          <EuiIconTip
            type="info"
            color="subdued"
            content={PERIOD_LABELS[id].description}
            aria-label={PERIOD_LABELS[id].title}
          />
        </span>
      ),
    },
    {
      name: MIN_BOOST_LABEL,
      render: ({ period }: PeriodRow) => formatBoost(period.min_boost),
    },
    {
      name: MAX_BOOST_LABEL,
      render: ({ period }: PeriodRow) => formatBoost(period.max_boost),
    },
    {
      name: i18n.translate('xpack.boost.profileDetails.maxAgeColumn', {
        defaultMessage: 'Max age',
      }),
      // Background has no max age; it holds everything older.
      render: ({ period }: PeriodRow) => formatMaxAge(period.max_age) ?? '—',
    },
  ];
  return (
    <EuiBasicTable
      tableCaption={i18n.translate('xpack.boost.profileDetails.periodsCaption', {
        defaultMessage: 'Boost for each period of data',
      })}
      compressed
      items={[
        { id: 'recent', period: profile.recent },
        { id: 'standard', period: profile.standard },
        { id: 'background', period: profile.background },
      ]}
      columns={columns}
      data-test-subj="boostProfilePeriods"
    />
  );
};

/** A boost profile's settings, the rules that use it, and what it applies to. */
export const ProfileDetailsPage = () => {
  const { application } = useBoostServices();
  const canEdit = application.capabilities[PLUGIN_ID]?.save === true;
  const history = useHistory();
  const { profileName: name } = useParams<{ profileName: string }>();
  const { data: state, error, refetch } = useBoostState();
  const [flyout, setFlyout] = useState<FlyoutState>();
  const [isDeleting, setIsDeleting] = useState(false);

  if (error) {
    return <LoadError error={error} onRetry={() => refetch()} />;
  }
  if (!state) {
    return <AppHeaderLoading />;
  }

  const profile = state.profiles.find((item) => item.name === name);
  if (!profile) {
    return <DetailsPage list="profiles" name={name} isFound={false} />;
  }

  // What applies in advanced mode, which is where custom rules and profiles take effect.
  const rules = getModeRules(state, 'advanced');
  const { profiles, data_sources: dataSources } = state;
  const coverage = getRuleCoverage(dataSources, rules, profiles);
  const profileRules: RuleRow[] = rules
    .filter(({ boost_profile: profileName }) => profileName === name)
    .map((rule) => ({
      ...rule,
      ...(coverage.get(rule.name) ?? {
        matches: 0,
        matchedNames: [],
        appliesTo: 0,
        supersededBy: new Map(),
      }),
    }));
  const appliedRules = getAppliedRules(dataSources, rules, profiles);
  const usedBy = dataSources
    .filter((dataSource) => appliedRules.get(dataSource.name)?.boost_profile === name)
    .sort((a, b) => a.name.localeCompare(b.name));
  const sizeInBytes = usedBy.reduce((total, { size_in_bytes: bytes }) => total + bytes, 0);
  const vcus = estimateDataSourcesVcuRange(usedBy, profile);
  const usedByDefaultRule = profileRules.some(({ is_builtin: isBuiltin }) => isBuiltin);
  const isAdvanced = state.settings.mode === 'advanced';

  const editLabel = i18n.translate('xpack.boost.profileDetails.editAction', {
    defaultMessage: 'Edit profile',
  });
  const duplicateItem = {
    id: 'duplicate',
    label: i18n.translate('xpack.boost.profileDetails.duplicateAction', {
      defaultMessage: 'Duplicate',
    }),
    iconType: 'copy',
    run: () => setFlyout('duplicate'),
    testId: 'boostProfileDetailsDuplicate',
  };

  const rulesColumns: Array<EuiBasicTableColumn<RuleRow>> = [
    {
      field: 'name',
      name: i18n.translate('xpack.boost.profileDetails.ruleNameColumn', {
        defaultMessage: 'Rule name',
      }),
      render: (ruleName: string, { is_builtin: isBuiltin }: RuleRow) => (
        <span>
          <DetailsLink kind="rule" name={ruleName} />
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
      field: 'priority',
      name: i18n.translate('xpack.boost.profileDetails.priorityColumn', {
        defaultMessage: 'Priority',
      }),
      width: '7em',
      dataType: 'number',
    },
    {
      field: 'matches',
      name: i18n.translate('xpack.boost.profileDetails.matchesColumn', {
        defaultMessage: 'Matches',
      }),
      width: '17em',
      render: (
        matches: number,
        {
          index_patterns: patterns,
          is_builtin: isBuiltin,
          matchedNames,
          appliesTo,
          supersededBy,
        }: RuleRow
      ) => (
        <RuleMatches
          patterns={patterns}
          type={profile.type}
          isDefaultRule={isBuiltin}
          coverage={{ matches, matchedNames, appliesTo, supersededBy }}
        />
      ),
    },
  ];

  const usedByColumns: Array<EuiBasicTableColumn<BoostDataSource>> = [
    {
      field: 'name',
      name:
        profile.type === 'indices'
          ? i18n.translate('xpack.boost.profileDetails.indexColumn', { defaultMessage: 'Index' })
          : i18n.translate('xpack.boost.profileDetails.dataStreamColumn', {
              defaultMessage: 'Data stream',
            }),
      sortable: true,
    },
    {
      name: i18n.translate('xpack.boost.profileDetails.appliedByColumn', {
        defaultMessage: 'Applied by rule',
      }),
      render: ({ name: dataSourceName }: BoostDataSource) => {
        const rule = appliedRules.get(dataSourceName);
        return rule && <DetailsLink kind="rule" name={rule.name} />;
      },
    },
    {
      field: 'size_in_bytes',
      name: i18n.translate('xpack.boost.profileDetails.sizeColumn', { defaultMessage: 'Size' }),
      width: '9em',
      sortable: true,
      dataType: 'number',
      render: formatSize,
    },
  ];

  return (
    <DetailsPage
      list="profiles"
      name={name}
      isFound
      badges={[
        { label: PROFILE_TYPE_LABELS[profile.type], color: 'hollow' },
        ...(profile.is_builtin ? [{ label: MANAGED_BADGE_LABEL }] : []),
      ]}
      // Elastic-managed profiles can't change, so they can only be copied.
      menu={
        !canEdit
          ? undefined
          : profile.is_builtin
          ? { primaryActionItem: duplicateItem }
          : {
              primaryActionItem: {
                id: 'edit',
                label: editLabel,
                iconType: 'pencil',
                run: () => setFlyout('edit'),
                testId: 'boostProfileDetailsEdit',
              },
              items: [
                duplicateItem,
                {
                  id: 'delete',
                  label: i18n.translate('xpack.boost.profileDetails.deleteAction', {
                    defaultMessage: 'Delete',
                  }),
                  iconType: 'trash',
                  overflow: true,
                  isDestructive: true,
                  disableButton: usedByDefaultRule,
                  tooltipContent: usedByDefaultRule
                    ? USED_BY_DEFAULT_RULE_DESCRIPTIONS[profile.type]
                    : undefined,
                  run: () => setIsDeleting(true),
                  testId: 'boostProfileDetailsDelete',
                },
              ],
            }
      }
      notice={
        !isAdvanced && (
          <SimpleModeNotice>
            {i18n.translate('xpack.boost.profileDetails.simpleModeNotice', {
              defaultMessage:
                'Custom boost rules are suspended until advanced mode is turned back on. The details below show how this profile applies in advanced mode.',
            })}
          </SimpleModeNotice>
        )
      }
    >
      <EuiFlexGroup gutterSize="l" alignItems="stretch">
        <EuiFlexItem>
          <DetailsPanel
            title={i18n.translate('xpack.boost.profileDetails.settingsTitle', {
              defaultMessage: 'Settings',
            })}
            fillsHeight
            data-test-subj="boostProfileSettings"
          >
            {profile.type === 'indices' ? (
              <IndicesSettings profile={profile} />
            ) : (
              <DataStreamsSettings profile={profile} />
            )}
          </DetailsPanel>
        </EuiFlexItem>
        <EuiFlexItem>
          <DetailsPanel
            title={i18n.translate('xpack.boost.profileDetails.usageTitle', {
              defaultMessage: 'Usage',
            })}
            fillsHeight
            data-test-subj="boostProfileUsage"
          >
            <DetailsList
              items={[
                {
                  title: i18n.translate('xpack.boost.profileDetails.rulesUsing', {
                    defaultMessage: 'Boost rules',
                  }),
                  description:
                    profileRules.length > 0 && isAdvanced ? (
                      <EuiLink {...reactRouterNavigate(history, getProfileRulesLocation(name))}>
                        {profileRules.length}
                      </EuiLink>
                    ) : (
                      profileRules.length
                    ),
                },
                {
                  title: i18n.translate('xpack.boost.profileDetails.appliesTo', {
                    defaultMessage: 'Applies to',
                  }),
                  description: formatDataSourceCount(profile.type, usedBy.length),
                },
                {
                  title: i18n.translate('xpack.boost.profileDetails.data', {
                    defaultMessage: 'Data',
                  }),
                  description: formatSize(sizeInBytes),
                },
                {
                  title: i18n.translate('xpack.boost.profileDetails.cost', {
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

      {profile.type === 'data_streams' && (
        <>
          <EuiSpacer size="l" />
          <DetailsPanel
            title={i18n.translate('xpack.boost.profileDetails.ageTimelineTitle', {
              defaultMessage: 'Age timeline',
            })}
          >
            <AgeTimeline profile={profile} dataStreams={usedBy} />
          </DetailsPanel>
        </>
      )}

      <EuiSpacer size="l" />
      <DetailsPanel
        title={i18n.translate('xpack.boost.profileDetails.rulesTitle', {
          defaultMessage: 'Boost rules using this profile',
        })}
        titleAppend={
          canEdit &&
          isAdvanced && (
            <EuiButton
              size="s"
              onClick={() => setFlyout('createRule')}
              data-test-subj="boostProfileDetailsCreateRule"
            >
              {i18n.translate('xpack.boost.profileDetails.createRule', {
                defaultMessage: 'Create boost rule',
              })}
            </EuiButton>
          )
        }
        data-test-subj="boostProfileRules"
      >
        <EuiBasicTable
          tableCaption={i18n.translate('xpack.boost.profileDetails.rulesCaption', {
            defaultMessage: 'Boost rules using this profile',
          })}
          items={profileRules}
          columns={rulesColumns}
          noItemsMessage={i18n.translate('xpack.boost.profileDetails.noRules', {
            defaultMessage: 'No boost rules use this profile yet.',
          })}
        />
      </DetailsPanel>

      <EuiSpacer size="l" />
      <DetailsPanel
        title={
          profile.type === 'indices'
            ? i18n.translate('xpack.boost.profileDetails.indicesTitle', {
                defaultMessage: 'Indices using this profile',
              })
            : i18n.translate('xpack.boost.profileDetails.dataStreamsTitle', {
                defaultMessage: 'Data streams using this profile',
              })
        }
        data-test-subj="boostProfileUsedBy"
      >
        <EuiText size="s" color="subdued">
          <p>
            {i18n.translate('xpack.boost.profileDetails.usedByDescription', {
              defaultMessage:
                'Where a rule using this profile ranks highest among the rules that match.',
            })}
          </p>
        </EuiText>
        <EuiSpacer size="s" />
        <EuiInMemoryTable
          tableCaption={i18n.translate('xpack.boost.profileDetails.usedByCaption', {
            defaultMessage: 'Indices or data streams using this profile',
          })}
          items={usedBy}
          columns={usedByColumns}
          sorting={{ sort: { field: 'name', direction: 'asc' } }}
          pagination={usedBy.length > 10 ? { pageSizeOptions: [10, 25, 50] } : undefined}
          noItemsMessage={
            profile.type === 'indices'
              ? i18n.translate('xpack.boost.profileDetails.noIndices', {
                  defaultMessage: 'No indices use this profile.',
                })
              : i18n.translate('xpack.boost.profileDetails.noDataStreams', {
                  defaultMessage: 'No data streams use this profile.',
                })
          }
        />
      </DetailsPanel>

      {(flyout === 'edit' || flyout === 'duplicate') && (
        <ProfileFlyout
          profile={flyout === 'edit' ? profile : undefined}
          duplicateOf={flyout === 'duplicate' ? profile : undefined}
          takenNames={profiles.map((item: BoostProfile) => item.name)}
          onClose={() => setFlyout(undefined)}
        />
      )}
      {flyout === 'createRule' && (
        <RuleFlyout initialProfileName={name} onClose={() => setFlyout(undefined)} />
      )}
      {isDeleting && (
        <DeleteProfileModal
          profile={profile}
          rules={rules}
          profiles={profiles}
          dataSources={dataSources}
          onClose={() => setIsDeleting(false)}
          onDeleted={() => history.push('/profiles')}
        />
      )}
    </DetailsPage>
  );
};
