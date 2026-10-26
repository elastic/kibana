/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { useHistory, useParams } from 'react-router-dom';
import {
  EuiBadge,
  EuiButton,
  EuiEmptyPrompt,
  EuiFieldSearch,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { AppHeaderLoading } from '@kbn/app-header';
import { i18n } from '@kbn/i18n';
import { reactRouterNavigate } from '@kbn/kibana-react-plugin/public';
import { PLUGIN_ID } from '../../../common/constants';
import { getAppliedRules } from '../../../common/resolution';
import type { BoostProfile, IndicesBoostProfile } from '../../../common/types';
import { estimateDataSourcesVcuRange, estimateProjectVcuRange } from '../../../common/vcu_estimate';
import { useBoostServices } from '../../hooks/use_boost_services';
import { useBoostState } from '../../hooks/use_boost_state';
import { useShowsEstimates } from '../../prototype/estimates_setting';
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
import { PROFILE_TYPE_LABELS, formatBoostRange, formatDataSourceCount } from '../format';
import { LoadError } from '../load_error';
import { RuleFlyout } from '../rules/rule_flyout';
import { getProfileRulesLocation } from '../rules/rules_tab';
import { RulesTable } from '../rules/rules_table';
import { DeleteProfileModal } from './delete_profile_modal';
import { PhaseList } from './phase_list';
import { INDEX_OPTIONS, ProfileFlyout } from './profile_flyout';
import { MANAGED_BADGE_LABEL, USED_BY_DEFAULT_RULE_DESCRIPTIONS } from './profiles_tab';

const ON_LABEL = i18n.translate('xpack.boost.profileDetails.on', { defaultMessage: 'On' });
const OFF_LABEL = i18n.translate('xpack.boost.profileDetails.off', { defaultMessage: 'Off' });

const BOOST_LABEL = i18n.translate('xpack.boost.profileDetails.boost', {
  defaultMessage: 'Boost',
});

const RULES_TITLE = i18n.translate('xpack.boost.profileDetails.rulesTitle', {
  defaultMessage: 'Boost rules using this profile',
});

const RULES_SEARCH_LABEL = i18n.translate('xpack.boost.profileDetails.searchRules', {
  defaultMessage: 'Search boost rules',
});

type FlyoutState = 'edit' | 'duplicate' | 'createRule' | undefined;

const IndicesSettings = ({ profile }: { profile: IndicesBoostProfile }) => {
  const optionValues = {
    extraCopy: profile.high_availability === 'one_extra_copy',
    prewarm: profile.prewarm,
    pinned: profile.pinned,
  };
  return (
    <DetailsList
      items={[
        // One range, as a data streams profile's phases show theirs.
        {
          title: BOOST_LABEL,
          description: formatBoostRange(profile.min_boost, profile.max_boost),
        },
        ...INDEX_OPTIONS.map(({ key, title, description }) => ({
          title,
          tip: description,
          // On stands out in the success color; off is a usual choice, such as to save cost,
          // so it's neutral rather than a warning.
          description: optionValues[key] ? (
            <EuiBadge color="success">{ON_LABEL}</EuiBadge>
          ) : (
            <EuiBadge color="default">{OFF_LABEL}</EuiBadge>
          ),
        })),
      ]}
    />
  );
};

/** A boost profile's settings, the rules that use it, and what it applies to. */
export const ProfileDetailsPage = () => {
  const { application } = useBoostServices();
  const showsEstimates = useShowsEstimates();
  const canEdit = application.capabilities[PLUGIN_ID]?.save === true;
  const history = useHistory();
  const { profileName: name } = useParams<{ profileName: string }>();
  const { data: state, error, refetch } = useBoostState();
  const [flyout, setFlyout] = useState<FlyoutState>();
  const [isDeleting, setIsDeleting] = useState(false);
  const [ruleQuery, setRuleQuery] = useState('');

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
  const profileRules = rules.filter(({ boost_profile: profileName }) => profileName === name);
  const appliedRules = getAppliedRules(dataSources, rules, profiles);
  const usedBy = dataSources
    .filter((dataSource) => appliedRules.get(dataSource.name)?.boost_profile === name)
    .sort((a, b) => a.name.localeCompare(b.name));
  const sizeInBytes = usedBy.reduce((total, { size_in_bytes: bytes }) => total + bytes, 0);
  const vcus = estimateDataSourcesVcuRange(usedBy, profile);
  // The whole project's search cost, which the profile's is a share of.
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
              <PhaseList profile={profile} />
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
                // Repeats the rules table's count, as the rule page's usage starts with what it
                // matches, which keeps this from being sparse without the estimates.
                {
                  title: i18n.translate('xpack.boost.profileDetails.rulesUsing', {
                    defaultMessage: 'Rules using',
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
                  description: formatSize(sizeInBytes),
                },
                // Only while the prototype shows estimates, which testers can turn off.
                ...(showsEstimates
                  ? [
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
                    ]
                  : []),
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
          {/* Under the same title as the rules it would list, a prompt to create the first one,
              sized to fit a section rather than the page. */}
          <DetailsSection title={RULES_TITLE} data-test-subj="boostProfileUnused">
            <EuiEmptyPrompt
              color="subdued"
              titleSize="xxs"
              title={
                <h3>
                  {i18n.translate('xpack.boost.profileDetails.unusedTitle', {
                    defaultMessage: "This profile isn't in use",
                  })}
                </h3>
              }
              body={
                // The prompt's own body text is a size larger than its title here.
                <EuiText size="s">
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
                </EuiText>
              }
              actions={
                canEdit && (
                  <EuiButton
                    fill
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
            />
          </DetailsSection>
        </DetailsBand>
      ) : (
        <DetailsBand hasDivider={false}>
          <DetailsSection title={RULES_TITLE} data-test-subj="boostProfileRules">
            {/* Above the table: the search, and the same button as the rules tab to create a rule,
                with this profile chosen. The rules all share the profile's type, so the tab's other
                filters have nothing to filter. */}
            <EuiFlexGroup gutterSize="s" responsive={false} wrap>
              <EuiFlexItem css={{ minInlineSize: '12em' }}>
                <EuiFieldSearch
                  compressed
                  fullWidth
                  isClearable
                  value={ruleQuery}
                  onChange={(event) => setRuleQuery(event.target.value)}
                  placeholder={RULES_SEARCH_LABEL}
                  aria-label={RULES_SEARCH_LABEL}
                  data-test-subj="boostProfileRulesSearch"
                />
              </EuiFlexItem>
              {canEdit && (
                <EuiFlexItem grow={false}>
                  <EuiButton
                    fill
                    size="s"
                    onClick={() => setFlyout('createRule')}
                    data-test-subj="boostProfileDetailsCreateRule"
                  >
                    {i18n.translate('xpack.boost.profileDetails.createRule', {
                      defaultMessage: 'Create boost rule',
                    })}
                  </EuiButton>
                </EuiFlexItem>
              )}
            </EuiFlexGroup>
            <EuiSpacer size="s" />
            {/* The same table as the rules tab, without the profile, which is this page's. */}
            <RulesTable
              rules={rules}
              profiles={profiles}
              dataSources={dataSources}
              canEdit={canEdit}
              filter={({ boost_profile: profileName }) => profileName === name}
              showsProfile={false}
              query={ruleQuery}
              showsCount
              tableCaption={i18n.translate('xpack.boost.profileDetails.rulesCaption', {
                defaultMessage: 'Boost rules using this profile',
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
