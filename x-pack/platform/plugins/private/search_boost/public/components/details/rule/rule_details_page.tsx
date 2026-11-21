/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiHorizontalRule, EuiSpacer } from '@elastic/eui';
import type { BoostProfile, BoostRuleListItem } from '../../../../common/types';
import type { LinkProps } from '../../../types';
import { BoostTimeline } from '../../boost_timeline';
import { MatchesTable } from '../../matches/matches_table';
import { DetailsColumns } from '../details_columns';
import { DetailsSection } from '../details_section';
import { DetailsLoading, DetailsNotFound } from '../details_states';
import { RuleSettings } from './rule_settings';
import { RuleUsage } from './rule_usage';
import {
  BACK_TO_RULES_LABEL,
  BOOST_TIMELINE_TITLE,
  MATCHES_LABELS,
  RULE_NOT_FOUND_TITLE,
} from '../../../translations';

export interface RuleDetailsPageProps {
  /** Left out once loaded means the rule wasn't found. */
  rule?: BoostRuleListItem;
  /** The rule's boost profile. */
  profile?: BoostProfile;
  isLoading?: boolean;
  /** Links to the "Boost rules" tab. */
  backLinkProps: LinkProps;
  getProfileLinkProps: (profileName: string) => LinkProps;
  /** Links to the higher-ranked rules that outrank this one. */
  getRuleLinkProps: (ruleName: string) => LinkProps;
  /** Links to the details of an index or data stream in Index Management. */
  getMatchLinkProps: (name: string) => LinkProps;
  /** Whether the matches say which higher-ranked rule outranks this one. */
  isOutrankingComputed?: boolean;
}

export const RuleDetailsPage = ({
  rule,
  profile,
  isLoading = false,
  backLinkProps,
  getProfileLinkProps,
  getRuleLinkProps,
  getMatchLinkProps,
  isOutrankingComputed = false,
}: RuleDetailsPageProps) => {
  if (isLoading) return <DetailsLoading />;
  if (!rule) {
    return (
      <DetailsNotFound
        title={RULE_NOT_FOUND_TITLE}
        backLabel={BACK_TO_RULES_LABEL}
        backLinkProps={backLinkProps}
      />
    );
  }

  return (
    <>
      <DetailsColumns
        start={
          <RuleSettings rule={rule} profile={profile} getProfileLinkProps={getProfileLinkProps} />
        }
        end={<RuleUsage rule={rule} />}
      />
      <EuiHorizontalRule margin="none" />
      <EuiSpacer size="l" />
      {profile?.type === 'data_streams' && (
        <>
          <DetailsSection title={BOOST_TIMELINE_TITLE}>
            <BoostTimeline profile={profile} />
          </DetailsSection>
          <EuiHorizontalRule margin="l" />
        </>
      )}
      <DetailsSection title={MATCHES_LABELS[rule.type].title}>
        <MatchesTable
          key={rule.name}
          type={rule.type}
          matches={rule.matches}
          queryKeyScope={`search-boost-rule-matches-${rule.name}`}
          getMatchLinkProps={getMatchLinkProps}
          getRuleLinkProps={getRuleLinkProps}
          isOutrankingComputed={isOutrankingComputed}
        />
      </DetailsSection>
    </>
  );
};
