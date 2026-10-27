/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { EuiButton, EuiEmptyPrompt, EuiLoadingSpinner, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { PLUGIN_ID } from '../../../common/constants';
import { getMatchingRules } from '../../../common/resolution';
import { useBoostServices } from '../../hooks/use_boost_services';
import { useBoostState } from '../../hooks/use_boost_state';
import { AgeTimeline } from '../age_timeline';
import { DetailsBand, DetailsSection, DetailsSplitBand } from '../details/details_page';
import { DetailsList } from '../details/details_list';
import { IndexManagementLink } from '../index_management_link';
import { LoadError } from '../load_error';
import { getIndicesSettingsItems } from '../profiles/indices_settings';
import { PhaseList } from '../profiles/phase_list';
import { getRuleTargetItems } from '../rules/rule_targets';
import { ProfileFlyout } from '../profiles/profile_flyout';
import { ProfileLink, RuleLink } from './boost_page_links';
import { EditRuleFlyout } from './edit_rule_flyout';
import { LOADING_LABEL, NO_RULE_LABEL } from './explanation_status';
import { MatchingRules } from './matching_rules';

const NAME_LABEL = i18n.translate('xpack.boost.indexTab.name', { defaultMessage: 'Name' });

interface BoostIndexDetailsProps {
  indexName: string;
  /** The index's data stream, when it's a backing index, whose boost applies to it. */
  dataStream?: string;
}

type FlyoutState = 'rule' | 'profile' | undefined;

/**
 * An index's Search boost tab: the rule that applies, and the profile it applies, with the
 * profile's settings, or its phases and a data stream's data in each. Each section edits its own:
 * every rule can change, but Elastic-managed profiles can't.
 */
export const BoostIndexDetails = ({ indexName, dataStream }: BoostIndexDetailsProps) => {
  const {
    application: { capabilities },
  } = useBoostServices();
  const canEdit = capabilities[PLUGIN_ID]?.save === true;
  const { data: state, error, refetch } = useBoostState();
  const [flyout, setFlyout] = useState<FlyoutState>();

  if (error) {
    return <LoadError error={error} onRetry={() => refetch()} />;
  }
  if (!state) {
    return (
      <EuiEmptyPrompt
        icon={<EuiLoadingSpinner size="xl" />}
        body={LOADING_LABEL}
        data-test-subj="boostIndexDetailsLoading"
      />
    );
  }

  const { rules, profiles, data_sources: dataSources } = state;
  const profilesByName = new Map(profiles.map((profile) => [profile.name, profile]));
  // Rules apply to a backing index's data stream as a whole, as Elasticsearch resolves them.
  const target = dataStream
    ? { name: dataStream, type: 'data_stream' as const }
    : { name: indexName, type: 'index' as const };
  const matches = getMatchingRules(target, rules, profilesByName);
  const [rule] = matches;
  const profile = rule && profilesByName.get(rule.boost_profile);
  if (!rule || !profile) {
    return <EuiEmptyPrompt title={<h2>{NO_RULE_LABEL}</h2>} titleSize="xs" />;
  }
  // The timeline needs the data stream's data by age, which the boost app has for user-facing ones.
  const dataStreamSource = dataSources.find(
    ({ name, type }) => type === 'data_stream' && name === dataStream
  );
  const showsTimeline = profile.type === 'data_streams' && dataStreamSource !== undefined;
  // Only worth listing when another rule matches too, as the rule section shows the one that does.
  const showsMatchingRules = matches.length > 1;

  return (
    <>
      {/* Each band is divided from one below it, and the last ends the tab's content. */}
      <DetailsSplitBand
        hasDivider={showsTimeline || showsMatchingRules}
        start={
          <DetailsSection
            title={i18n.translate('xpack.boost.indexTab.ruleTitle', {
              defaultMessage: 'Boost rule',
            })}
            titleAppend={
              canEdit && (
                <EuiButton
                  size="s"
                  onClick={() => setFlyout('rule')}
                  data-test-subj="boostIndexTabEditRule"
                >
                  {i18n.translate('xpack.boost.indexTab.editRule', {
                    defaultMessage: 'Edit rule',
                  })}
                </EuiButton>
              )
            }
            reservesButtonSpace
            data-test-subj="boostIndexTabRule"
          >
            <DetailsList
              items={[
                {
                  title: NAME_LABEL,
                  tip: i18n.translate('xpack.boost.indexTab.ruleTip', {
                    defaultMessage:
                      'The highest-ranked boost rule that matches, which applies its boost profile.',
                  }),
                  description: <RuleLink rule={rule} />,
                },
                ...getRuleTargetItems(rule, profile.type, dataSources),
                ...(dataStream
                  ? [
                      {
                        title: i18n.translate('xpack.boost.indexTab.dataStream', {
                          defaultMessage: 'Data stream',
                        }),
                        tip: i18n.translate('xpack.boost.indexTab.dataStreamTip', {
                          defaultMessage:
                            'Boost rules apply to a data stream as a whole, including this backing index.',
                        }),
                        description: <IndexManagementLink type="data_stream" name={dataStream} />,
                      },
                    ]
                  : []),
              ]}
            />
          </DetailsSection>
        }
        end={
          <DetailsSection
            title={i18n.translate('xpack.boost.indexTab.profileTitle', {
              defaultMessage: 'Boost profile',
            })}
            titleAppend={
              canEdit &&
              !profile.is_builtin && (
                <EuiButton
                  size="s"
                  onClick={() => setFlyout('profile')}
                  data-test-subj="boostIndexTabEditProfile"
                >
                  {i18n.translate('xpack.boost.indexTab.editProfile', {
                    defaultMessage: 'Edit profile',
                  })}
                </EuiButton>
              )
            }
            // Lines up with the rule's title, which has its edit button, when this has none.
            reservesButtonSpace
            data-test-subj="boostIndexTabProfile"
          >
            <DetailsList
              items={[
                { title: NAME_LABEL, description: <ProfileLink profileName={profile.name} /> },
                ...(profile.type === 'indices' ? getIndicesSettingsItems(profile) : []),
              ]}
            />
            {profile.type === 'data_streams' && (
              <>
                <EuiSpacer size="m" />
                <PhaseList profile={profile} />
              </>
            )}
          </DetailsSection>
        }
      />

      {profile.type === 'data_streams' && dataStreamSource && (
        <DetailsBand hasDivider={showsMatchingRules}>
          <DetailsSection
            title={i18n.translate('xpack.boost.indexTab.timelineTitle', {
              defaultMessage: 'Boost phase timeline',
            })}
          >
            <AgeTimeline profile={profile} dataStreams={[dataStreamSource]} appliesThrough="rule" />
          </DetailsSection>
        </DetailsBand>
      )}

      {showsMatchingRules && (
        <DetailsBand hasDivider={false}>
          <DetailsSection
            title={i18n.translate('xpack.boost.indexTab.matchingRulesTitle', {
              defaultMessage: 'All matching rules',
            })}
            data-test-subj="boostIndexTabMatchingRulesSection"
          >
            <MatchingRules
              matches={matches}
              profilesByName={profilesByName}
              dataSources={dataSources}
            />
          </DetailsSection>
        </DetailsBand>
      )}

      {flyout === 'rule' && <EditRuleFlyout rule={rule} onClose={() => setFlyout(undefined)} />}
      {flyout === 'profile' && (
        <ProfileFlyout
          profile={profile}
          takenNames={profiles.map(({ name }) => name)}
          onClose={() => setFlyout(undefined)}
        />
      )}
    </>
  );
};
