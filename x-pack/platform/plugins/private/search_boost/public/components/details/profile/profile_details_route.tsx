/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { useHistory } from 'react-router-dom';
import type { AppHeaderBadge } from '@kbn/app-header';
import { reactRouterNavigate } from '@kbn/kibana-react-plugin/public';
import type { BoostRuleListItem } from '../../../../common/types';
import type { BoostLists } from '../../../api';
import { PROFILES_PATH, getRulePath, getRulesListLocation } from '../../../links';
import {
  MANAGED_PROFILE_BADGE,
  PROFILES_TAB_LABEL,
  PROFILE_TYPE_LABELS,
} from '../../../translations';
import { PageContent } from '../../page_content';
import { DetailsHeader } from '../details_header';
import { ProfileDetailsPage } from './profile_details_page';

const PARENT = { label: PROFILES_TAB_LABEL, path: PROFILES_PATH };

const MANAGED_BADGE: AppHeaderBadge = { label: MANAGED_PROFILE_BADGE, color: 'default' };

const NO_RULES: BoostRuleListItem[] = [];

export interface ProfileDetailsRouteProps {
  profileName: string;
  /** Left out while loading. */
  lists?: BoostLists;
  canEdit: boolean;
}

export const ProfileDetailsRoute = ({ profileName, lists, canEdit }: ProfileDetailsRouteProps) => {
  const history = useHistory();

  const profile = lists?.profiles.find(({ name }) => name === profileName);
  const badges = useMemo(
    (): AppHeaderBadge[] =>
      profile
        ? [
            { label: PROFILE_TYPE_LABELS[profile.type] },
            ...(profile.is_builtin ? [MANAGED_BADGE] : []),
          ]
        : [],
    [profile]
  );
  const rules = useMemo(
    () => lists?.rules.filter(({ boost_profile: name }) => name === profileName) ?? NO_RULES,
    [lists, profileName]
  );

  return (
    <>
      {(profile || !lists) && <DetailsHeader title={profileName} parent={PARENT} badges={badges} />}
      <PageContent>
        <ProfileDetailsPage
          profile={profile}
          rules={rules}
          isLoading={!lists}
          backLinkProps={reactRouterNavigate(history, PROFILES_PATH)}
          getRuleLinkProps={(name) => reactRouterNavigate(history, getRulePath(name))}
          getRulesListLinkProps={(name) => reactRouterNavigate(history, getRulesListLocation(name))}
          canEdit={canEdit}
        />
      </PageContent>
    </>
  );
};
