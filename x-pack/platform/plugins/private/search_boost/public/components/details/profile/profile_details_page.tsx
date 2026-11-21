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
import { DetailsColumns } from '../details_columns';
import { DetailsSection } from '../details_section';
import { DetailsLoading, DetailsNotFound } from '../details_states';
import { ProfileRules } from './profile_rules';
import { ProfileSettings } from './profile_settings';
import { ProfileUsage } from './profile_usage';
import {
  BACK_TO_PROFILES_LABEL,
  BOOST_TIMELINE_TITLE,
  PROFILE_NOT_FOUND_TITLE,
  PROFILE_RULES_TITLE,
} from '../../../translations';

export interface ProfileDetailsPageProps {
  /** Left out once loaded means the profile wasn't found. */
  profile?: BoostProfile;
  /** The boost rules that use the profile. Must keep its identity between renders. */
  rules: BoostRuleListItem[];
  isLoading?: boolean;
  /** Links to the "Boost profiles" tab. */
  backLinkProps: LinkProps;
  getRuleLinkProps: (ruleName: string) => LinkProps;
  /** Links to the "Boost rules" tab filtered by the profile. */
  getRulesListLinkProps: (profileName: string) => LinkProps;
  /** Shows the create button and the row actions that have a callback. */
  canEdit?: boolean;
  onCreateRule?: () => void;
  onEditRule?: (rule: BoostRuleListItem) => void;
  /** Custom rules only. */
  onDuplicateRule?: (rule: BoostRuleListItem) => void;
  /** Custom rules only. */
  onDeleteRule?: (rule: BoostRuleListItem) => void;
}

export const ProfileDetailsPage = ({
  profile,
  rules,
  isLoading = false,
  backLinkProps,
  getRuleLinkProps,
  getRulesListLinkProps,
  canEdit = false,
  onCreateRule,
  onEditRule,
  onDuplicateRule,
  onDeleteRule,
}: ProfileDetailsPageProps) => {
  if (isLoading) return <DetailsLoading />;
  if (!profile) {
    return (
      <DetailsNotFound
        title={PROFILE_NOT_FOUND_TITLE}
        backLabel={BACK_TO_PROFILES_LABEL}
        backLinkProps={backLinkProps}
      />
    );
  }

  return (
    <>
      <DetailsColumns
        start={<ProfileSettings profile={profile} />}
        end={
          <ProfileUsage
            profile={profile}
            rules={rules}
            getRulesListLinkProps={getRulesListLinkProps}
          />
        }
      />
      <EuiHorizontalRule margin="none" />
      <EuiSpacer size="l" />
      {profile.type === 'data_streams' && (
        <>
          <DetailsSection title={BOOST_TIMELINE_TITLE}>
            <BoostTimeline profile={profile} />
          </DetailsSection>
          <EuiHorizontalRule margin="l" />
        </>
      )}
      <DetailsSection title={PROFILE_RULES_TITLE}>
        <ProfileRules
          profileName={profile.name}
          type={profile.type}
          rules={rules}
          getRuleLinkProps={getRuleLinkProps}
          canEdit={canEdit}
          onCreateRule={onCreateRule}
          onEditRule={onEditRule}
          onDuplicateRule={onDuplicateRule}
          onDeleteRule={onDeleteRule}
        />
      </DetailsSection>
    </>
  );
};
