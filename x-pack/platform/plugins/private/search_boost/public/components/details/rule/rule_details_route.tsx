/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { useHistory } from 'react-router-dom';
import type { IndexManagementLocatorParams } from '@kbn/index-management-shared-types';
import { reactRouterNavigate } from '@kbn/kibana-react-plugin/public';
import { getRouterLinkProps } from '@kbn/router-utils';
import { isDefaultRule } from '../../../../common/rules';
import type { BoostLists } from '../../../api';
import { RULES_PATH, getProfilePath, getRulePath } from '../../../links';
import type { IndexManagementServices, LinkProps } from '../../../types';
import { DEFAULT_RULE_BADGE, RULES_TAB_LABEL } from '../../../translations';
import { DetailsLayout } from '../details_layout';
import { RuleDetailsPage } from './rule_details_page';

const PARENT = { label: RULES_TAB_LABEL, path: RULES_PATH };

const toLinkProps = (href: string, onClick: () => void): LinkProps => ({
  href,
  onClick: getRouterLinkProps({ href, onClick }).onClick,
});

export interface RuleDetailsRouteProps {
  ruleName: string;
  /** Left out while loading. */
  lists?: BoostLists;
  onReload: () => void;
  indexManagement?: IndexManagementServices;
}

export const RuleDetailsRoute = ({
  ruleName,
  lists,
  onReload,
  indexManagement,
}: RuleDetailsRouteProps) => {
  const history = useHistory();
  const [flyoutDataStreamName, setFlyoutDataStreamName] = useState<string>();

  const rule = lists?.rules.find(({ name }) => name === ruleName);
  const profile = rule && lists?.profiles.find(({ name }) => name === rule.boost_profile);

  const getMatchLinkProps = (name: string): LinkProps | undefined => {
    if (!indexManagement) {
      return undefined;
    }
    const { locator } = indexManagement;
    if (rule?.type === 'data_streams') {
      const params: IndexManagementLocatorParams = {
        page: 'data_streams_details',
        dataStreamName: name,
      };
      return toLinkProps(locator.getRedirectUrl(params), () => setFlyoutDataStreamName(name));
    }
    const params: IndexManagementLocatorParams = { page: 'index_details', indexName: name };
    return toLinkProps(locator.getRedirectUrl(params), () => locator.navigateSync(params));
  };

  return (
    <>
      <DetailsLayout
        title={ruleName}
        parent={PARENT}
        showsHeader={Boolean(rule) || !lists}
        type={rule?.type}
        statusBadge={rule && isDefaultRule(rule) ? DEFAULT_RULE_BADGE : undefined}
      >
        <RuleDetailsPage
          rule={rule}
          profile={profile}
          isLoading={!lists}
          backLinkProps={reactRouterNavigate(history, RULES_PATH)}
          getProfileLinkProps={(name) => reactRouterNavigate(history, getProfilePath(name))}
          getRuleLinkProps={(name) => reactRouterNavigate(history, getRulePath(name))}
          getMatchLinkProps={getMatchLinkProps}
          isOutrankingComputed
        />
      </DetailsLayout>
      {indexManagement && flyoutDataStreamName && (
        <indexManagement.DataStreamFlyout
          datastreamName={flyoutDataStreamName}
          onClose={(shouldReload) => {
            setFlyoutDataStreamName(undefined);
            if (shouldReload) {
              onReload();
            }
          }}
        />
      )}
    </>
  );
};
