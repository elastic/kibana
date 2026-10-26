/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { useHistory, useParams } from 'react-router-dom';
import { EuiBadge } from '@elastic/eui';
import { AppHeaderLoading } from '@kbn/app-header';
import { i18n } from '@kbn/i18n';
import { PLUGIN_ID } from '../../../common/constants';
import { getAppliedRules, getRuleCoverage } from '../../../common/resolution';
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
import { DetailsLink } from '../details_link';
import { PROFILE_TYPE_LABELS, formatDataSourceCount } from '../format';
import { LoadError } from '../load_error';
import { DeleteRuleModal } from './delete_rule_modal';
import { MatchedTable } from './matched_table';
import { getDefaultRuleType } from '../../../common/presets';
import { ProjectDefaultFlyout } from '../project_defaults/project_default_flyout';
import { RuleFlyout } from './rule_flyout';
import { getRuleTargetItems } from './rule_targets';
import { DEFAULT_BADGE_LABEL, MANAGED_BADGE_LABEL } from '../badge_labels';

type FlyoutState = 'edit' | 'duplicate' | undefined;

/** A boost rule's targets, profile, and priority, and what it applies to. */
export const RuleDetailsPage = () => {
  const { application } = useBoostServices();
  const showsEstimates = useShowsEstimates();
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

  const { rules, profiles, data_sources: dataSources } = state;
  const rule = rules.find((item) => item.name === name);
  if (!rule) {
    return <DetailsPage list="rules" name={name} isFound={false} />;
  }

  const { is_builtin: isDefaultRule } = rule;
  const defaultType = isDefaultRule ? getDefaultRuleType(name) : undefined;
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
  // The whole project's search cost, which the rule's is a share of.
  const projectVcus = estimateProjectVcuRange(dataSources, appliedRules, profiles);
  return (
    <DetailsPage
      list="rules"
      name={name}
      isFound
      badges={[
        ...(type ? [{ label: PROFILE_TYPE_LABELS[type], color: 'hollow' as const }] : []),
        // The same color as the badge in the rules list.
        ...(isDefaultRule ? [{ label: DEFAULT_BADGE_LABEL, color: 'default' as const }] : []),
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
                      // Copying a rule is occasional, so it waits in the menu with Delete.
                      overflow: true,
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
    >
      <DetailsSplitBand
        start={
          <DetailsSection
            title={i18n.translate('xpack.boost.ruleDetails.settingsTitle', {
              defaultMessage: 'Settings',
            })}
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
                ...getRuleTargetItems(rule, type, dataSources),
              ]}
            />
          </DetailsSection>
        }
        end={
          <DetailsSection
            title={i18n.translate('xpack.boost.ruleDetails.usageTitle', {
              defaultMessage: 'Usage',
            })}
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
                  title: i18n.translate('xpack.boost.ruleDetails.storageSize', {
                    defaultMessage: 'Storage size',
                  }),
                  description: formatSize(sizeInBytes),
                },
                // Only while the prototype shows estimates, which testers can turn off.
                ...(showsEstimates
                  ? [
                      {
                        title: i18n.translate('xpack.boost.ruleDetails.cost', {
                          defaultMessage: 'Search cost per hour',
                        }),
                        tip: COST_DISCLAIMER,
                        description: (
                          <ShareMeterGroup>
                            <ShareMeter
                              value={vcus.atRest}
                              total={projectVcus.atRest}
                              data-test-subj="boostRuleRestCostShare"
                            >
                              {getCostText('atRest', vcus.atRest)}
                            </ShareMeter>
                            <ShareMeter
                              value={vcus.atPeak}
                              total={projectVcus.atPeak}
                              data-test-subj="boostRulePeakCostShare"
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

      {profile?.type === 'data_streams' && (
        <DetailsBand>
          <DetailsSection
            title={i18n.translate('xpack.boost.ruleDetails.ageTimelineTitle', {
              defaultMessage: 'Boost phase timeline',
            })}
          >
            <AgeTimeline profile={profile} dataStreams={applied} appliesThrough="rule" />
          </DetailsSection>
        </DetailsBand>
      )}

      <DetailsBand hasDivider={false}>
        <MatchedTable
          type={type}
          profile={profile}
          matched={matched}
          supersededBy={coverage?.supersededBy ?? new Map()}
        />
      </DetailsBand>

      {/* A default rule is edited as its project default. */}
      {flyout === 'edit' && defaultType && (
        <ProjectDefaultFlyout type={defaultType} onClose={() => setFlyout(undefined)} />
      )}
      {flyout && !(flyout === 'edit' && defaultType) && (
        <RuleFlyout
          rule={flyout === 'edit' ? rule : undefined}
          duplicateOf={flyout === 'duplicate' ? rule : undefined}
          onClose={() => setFlyout(undefined)}
        />
      )}
      {isDeleting && (
        <DeleteRuleModal
          ruleName={name}
          rules={rules}
          profiles={profiles}
          dataSources={dataSources}
          onClose={() => setIsDeleting(false)}
          onDeleted={() => history.push('/rules')}
        />
      )}
    </DetailsPage>
  );
};
