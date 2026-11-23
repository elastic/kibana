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
import type { BoostLists } from '../../../api';
import { RULES_PATH, getProfilePath, getRulePath } from '../../../links';
import { DEFAULT_RULE_BADGE, PROFILE_TYPE_LABELS, RULES_TAB_LABEL } from '../../../translations';
import { PageContent } from '../../page_content';
import { DetailsHeader } from '../details_header';
import { RuleDetailsPage } from './rule_details_page';

const PARENT = { label: RULES_TAB_LABEL, path: RULES_PATH };

const DEFAULT_BADGE: AppHeaderBadge = { label: DEFAULT_RULE_BADGE, color: 'default' };

export interface RuleDetailsRouteProps {
  ruleName: string;
  /** Left out while loading. */
  lists?: BoostLists;
}

export const RuleDetailsRoute = ({ ruleName, lists }: RuleDetailsRouteProps) => {
  const history = useHistory();

  const rule = lists?.rules.find(({ name }) => name === ruleName);
  const profile = rule && lists?.profiles.find(({ name }) => name === rule.boost_profile);
  const badges = useMemo(
    (): AppHeaderBadge[] =>
      rule
        ? [{ label: PROFILE_TYPE_LABELS[rule.type] }, ...(rule.is_builtin ? [DEFAULT_BADGE] : [])]
        : [],
    [rule]
  );

  return (
    <>
      {(rule || !lists) && <DetailsHeader title={ruleName} parent={PARENT} badges={badges} />}
      <PageContent>
        <RuleDetailsPage
          rule={rule}
          profile={profile}
          isLoading={!lists}
          backLinkProps={reactRouterNavigate(history, RULES_PATH)}
          getProfileLinkProps={(name) => reactRouterNavigate(history, getProfilePath(name))}
          getRuleLinkProps={(name) => reactRouterNavigate(history, getRulePath(name))}
          isOutrankingComputed
        />
      </PageContent>
    </>
  );
};
