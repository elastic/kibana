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
  EuiButton,
  EuiEmptyPrompt,
  EuiInMemoryTable,
  EuiLink,
  EuiTextColor,
  useEuiTheme,
} from '@elastic/eui';
import { AppHeaderLoading } from '@kbn/app-header';
import { i18n } from '@kbn/i18n';
import { reactRouterNavigate } from '@kbn/kibana-react-plugin/public';
import { PLUGIN_ID } from '../../../common/constants';
import type { RuleCoverage } from '../../../common/resolution';
import { getAppliedRules, getRuleCoverage } from '../../../common/resolution';
import type { BoostProfile, BoostRule, IndicesBoostProfile } from '../../../common/types';
import { estimateDataSourcesVcuRange, estimateProjectVcuRange } from '../../../common/vcu_estimate';
import { useBoostServices } from '../../hooks/use_boost_services';
import { useBoostState } from '../../hooks/use_boost_state';
import { AgeTimeline } from '../age_timeline';
import { COST_DISCLAIMER, formatSize, getCostText } from '../cost_format';
import {
  DetailsBand,
  DetailsPage,
  DetailsSection,
  DetailsSplitBand,
} from '../details/details_page';
import { DetailsList } from '../details/details_list';
import { ShareMeter, ShareMeterGroup } from '../details/share_meter';
import { DetailsLink } from '../details_link';
import { PROFILE_TYPE_LABELS, formatBoost, formatDataSourceCount } from '../format';
import { LoadError } from '../load_error';
import { RuleFlyout } from '../rules/rule_flyout';
import { DEFAULT_BADGE_LABEL, getProfileRulesLocation } from '../rules/rules_tab';
import { DeleteProfileModal } from './delete_profile_modal';
import { PhaseCards } from './phase_cards';
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

/** A boost profile's settings, the rules that use it, and what it applies to. */
export const ProfileDetailsPage = () => {
  const { application } = useBoostServices();
  const { euiTheme } = useEuiTheme();
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

  const { rules, profiles, data_sources: dataSources } = state;
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
  // The whole project, which the profile's storage and search cost are each a share of.
  const projectSize = dataSources.reduce((total, { size_in_bytes: bytes }) => total + bytes, 0);
  const projectVcus = estimateProjectVcuRange(dataSources, appliedRules, profiles);
  const usedByDefaultRule = profileRules.some(({ is_builtin: isBuiltin }) => isBuiltin);

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
    // Where each rule applies this profile, rather than all it matches, which can include what
    // higher-ranked rules apply other profiles to.
    {
      field: 'appliesTo',
      name: i18n.translate('xpack.boost.profileDetails.appliesToColumn', {
        defaultMessage: 'Applies to',
      }),
      width: '12em',
      render: (appliesTo: number) =>
        appliesTo > 0 ? (
          formatDataSourceCount(profile.type, appliesTo)
        ) : (
          <EuiTextColor color={euiTheme.colors.textDisabled}>
            {formatDataSourceCount(profile.type, 0)}
          </EuiTextColor>
        ),
    },
  ];

  return (
    <DetailsPage
      list="profiles"
      name={name}
      isFound
      badges={[
        { label: PROFILE_TYPE_LABELS[profile.type], color: 'hollow' },
        // The same color as the badge in the profiles list.
        ...(profile.is_builtin ? [{ label: MANAGED_BADGE_LABEL, color: 'default' as const }] : []),
      ]}
      // Elastic-managed profiles can't change, so they can only be copied, which waits in the menu
      // as it does for other profiles.
      menu={
        !canEdit
          ? undefined
          : profile.is_builtin
          ? { items: [{ ...duplicateItem, overflow: true }] }
          : {
              primaryActionItem: {
                id: 'edit',
                label: editLabel,
                iconType: 'pencil',
                run: () => setFlyout('edit'),
                testId: 'boostProfileDetailsEdit',
              },
              items: [
                // Copying a profile is occasional, so it waits in the menu with Delete.
                { ...duplicateItem, overflow: true },
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
    >
      <DetailsSplitBand
        start={
          <DetailsSection
            title={i18n.translate('xpack.boost.profileDetails.settingsTitle', {
              defaultMessage: 'Settings',
            })}
            data-test-subj="boostProfileSettings"
          >
            {profile.type === 'indices' ? (
              <IndicesSettings profile={profile} />
            ) : (
              <PhaseCards profile={profile} />
            )}
          </DetailsSection>
        }
        end={
          <DetailsSection
            title={i18n.translate('xpack.boost.profileDetails.usageTitle', {
              defaultMessage: 'Usage',
            })}
            data-test-subj="boostProfileUsage"
          >
            <DetailsList
              items={[
                {
                  title: i18n.translate('xpack.boost.profileDetails.rulesUsing', {
                    defaultMessage: 'Boost rules',
                  }),
                  description:
                    profileRules.length > 0 ? (
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
                  tip: i18n.translate('xpack.boost.profileDetails.appliesToTip', {
                    defaultMessage:
                      'What the rules using this profile match, less any that higher-ranked rules apply other profiles to.',
                  }),
                  description: formatDataSourceCount(profile.type, usedBy.length),
                },
                {
                  title: i18n.translate('xpack.boost.profileDetails.storageSize', {
                    defaultMessage: 'Storage size',
                  }),
                  description: (
                    <ShareMeter
                      value={sizeInBytes}
                      total={projectSize}
                      data-test-subj="boostProfileStorageShare"
                    >
                      {formatSize(sizeInBytes)}
                    </ShareMeter>
                  ),
                },
                {
                  title: i18n.translate('xpack.boost.profileDetails.cost', {
                    defaultMessage: 'Search cost per hour',
                  }),
                  tip: COST_DISCLAIMER,
                  description: (
                    <ShareMeterGroup>
                      <ShareMeter
                        value={vcus.atRest}
                        total={projectVcus.atRest}
                        data-test-subj="boostProfileRestCostShare"
                      >
                        {getCostText('atRest', vcus.atRest)}
                      </ShareMeter>
                      <ShareMeter
                        value={vcus.atPeak}
                        total={projectVcus.atPeak}
                        data-test-subj="boostProfilePeakCostShare"
                      >
                        {getCostText('atPeak', vcus.atPeak)}
                      </ShareMeter>
                    </ShareMeterGroup>
                  ),
                },
              ]}
            />
          </DetailsSection>
        }
      />

      {profile.type === 'data_streams' && (
        <DetailsBand>
          <DetailsSection
            title={i18n.translate('xpack.boost.profileDetails.ageTimelineTitle', {
              defaultMessage: 'Boost phase timeline',
            })}
          >
            <AgeTimeline profile={profile} dataStreams={usedBy} appliesThrough="profile" />
          </DetailsSection>
        </DetailsBand>
      )}

      {/* Until a rule uses the profile, there are no rules to list, just a way to start. */}
      {profileRules.length === 0 ? (
        <DetailsBand hasDivider={false}>
          <EuiEmptyPrompt
            titleSize="xs"
            title={
              <h2>
                {i18n.translate('xpack.boost.profileDetails.unusedTitle', {
                  defaultMessage: "This profile isn't in use",
                })}
              </h2>
            }
            body={
              <p>
                {profile.type === 'indices'
                  ? i18n.translate('xpack.boost.profileDetails.unusedIndicesBody', {
                      defaultMessage:
                        'No boost rules use it yet. Create one to boost indices with this profile.',
                    })
                  : i18n.translate('xpack.boost.profileDetails.unusedDataStreamsBody', {
                      defaultMessage:
                        'No boost rules use it yet. Create one to boost data streams with this profile.',
                    })}
              </p>
            }
            actions={
              canEdit && (
                <EuiButton
                  fill
                  onClick={() => setFlyout('createRule')}
                  data-test-subj="boostProfileDetailsCreateRule"
                >
                  {i18n.translate('xpack.boost.profileDetails.createRule', {
                    defaultMessage: 'Create boost rule',
                  })}
                </EuiButton>
              )
            }
            data-test-subj="boostProfileUnused"
          />
        </DetailsBand>
      ) : (
        <DetailsBand hasDivider={false}>
          <DetailsSection
            title={i18n.translate('xpack.boost.profileDetails.rulesTitle', {
              defaultMessage: 'Boost rules using this profile',
            })}
            titleAppend={
              canEdit && (
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
            <EuiInMemoryTable
              tableCaption={i18n.translate('xpack.boost.profileDetails.rulesCaption', {
                defaultMessage: 'Boost rules using this profile',
              })}
              items={profileRules}
              columns={rulesColumns}
              pagination={{ initialPageSize: 10, pageSizeOptions: [10, 25, 50] }}
              noItemsMessage={i18n.translate('xpack.boost.profileDetails.noRules', {
                defaultMessage: 'No boost rules use this profile yet.',
              })}
            />
          </DetailsSection>
        </DetailsBand>
      )}

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
