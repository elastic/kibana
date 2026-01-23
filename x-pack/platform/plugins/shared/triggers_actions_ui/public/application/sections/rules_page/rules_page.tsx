/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { lazy, useCallback, useEffect, useRef, useState } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiSpacer } from '@elastic/eui';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import { useHistory, useLocation } from 'react-router-dom';
import { Routes, Route } from '@kbn/shared-ux-router';
import useObservable from 'react-use/lib/useObservable';
import {
  getCreateRuleRoute,
  getEditRuleRoute,
  getRulesAppDetailsRoute,
  rulesAppDetailsRoute,
} from '@kbn/rule-data-utils';
import { useGetRuleTypesPermissions } from '@kbn/alerts-ui-shared';
import { RulesPageTemplate } from './rules_page_template';
import { useKibana } from '../../../common/lib/kibana';
import { getAlertingSectionBreadcrumb, getRulesBreadcrumbWithHref } from '../../lib/breadcrumb';
import { getCurrentDocTitle } from '../../lib/doc_title';
import { NON_SIEM_CONSUMERS } from '../alerts_search_bar/constants';
import type { Section } from '../../constants';
import { suspendedComponentWithProps } from '../../lib/suspended_component_with_props';

const LogsList = lazy(() => import('../rule_details/components/global_rule_event_log_list'));
const RulesList = lazy(() => import('../rules_list/components/rules_list'));

const RulesPage = () => {
  const history = useHistory();
  const location = useLocation();
  const {
    chrome: { docTitle },
    setBreadcrumbs,
    application: { navigateToApp, getUrlForApp, isAppRegistered, currentAppId$ },
    http,
    notifications: { toasts },
  } = useKibana().services;
  const currentAppId = useObservable(currentAppId$, undefined);

  const [headerActions, setHeaderActions] = useState<React.ReactNode[] | undefined>();

  const { authorizedToReadAnyRules } = useGetRuleTypesPermissions({
    http,
    toasts,
    filteredRuleTypes: [],
  });

  const currentSection: Section = location.pathname.endsWith('/logs') ? 'logs' : 'rules';

  const tabs: Array<{
    id: Section;
    name: React.ReactNode;
  }> = [];

  tabs.push({
    id: 'rules',
    name: (
      <FormattedMessage id="xpack.triggersActionsUI.home.rulesTabTitle" defaultMessage="Rules" />
    ),
  });

  if (authorizedToReadAnyRules) {
    tabs.push({
      id: 'logs',
      name: (
        <FormattedMessage id="xpack.triggersActionsUI.home.logsTabTitle" defaultMessage="Logs" />
      ),
    });
  }

  const onSectionChange = (newSection: Section) => {
    if (newSection === 'logs') {
      history.push('/logs');
    } else {
      history.push('/');
    }
  };

  // Use ref to store latest location to avoid recreating callbacks when search/hash changes
  // Updating ref.current doesn't cause re-renders, so we can do it directly in render
  const locationRef = useRef(location);
  locationRef.current = location;

  const navigateToEditRuleForm = useCallback(
    (ruleId: string) => {
      const { pathname, search, hash } = locationRef.current;
      const returnPath = `${pathname}${search}${hash}`;

      const returnApp = 'rules';
      navigateToApp('management', {
        path: `insightsAndAlerting/triggersActions/${getEditRuleRoute(ruleId)}`,
        state: {
          returnApp,
          returnPath,
        },
      });
    },
    [navigateToApp]
  );

  const navigateToCreateRuleForm = useCallback(
    (ruleTypeId: string) => {
      const { pathname, search, hash } = locationRef.current;
      const returnPath = `${pathname}${search}${hash}`;

      navigateToApp(currentAppId || 'management', {
        path: getCreateRuleRoute(ruleTypeId),
        state: {
          returnApp: currentAppId || 'management',
          returnPath,
        },
      });
    },
    [navigateToApp, currentAppId]
  );

  const renderRulesList = useCallback(() => {
    return (
      <KibanaPageTemplate.Section paddingSize="l" data-test-subj="rulesListWrapper">
        <RulesList
          consumers={NON_SIEM_CONSUMERS}
          rulesListKey="rules-page"
          showCreateRuleButtonInPrompt={true}
          setHeaderActions={setHeaderActions}
          navigateToEditRuleForm={navigateToEditRuleForm}
          navigateToCreateRuleForm={navigateToCreateRuleForm}
          ruleDetailsRoute={rulesAppDetailsRoute}
        />
      </KibanaPageTemplate.Section>
    );
  }, [navigateToEditRuleForm, navigateToCreateRuleForm]);

  const renderLogsList = useCallback(() => {
    return (
      <KibanaPageTemplate.Section grow={false} paddingSize="l">
        {suspendedComponentWithProps(
          LogsList,
          'xl'
        )({
          setHeaderActions,
          getRuleDetailsRoute: getRulesAppDetailsRoute,
        })}
      </KibanaPageTemplate.Section>
    );
  }, []);

  useEffect(() => {
    if (setBreadcrumbs) {
      if (currentSection === 'logs') {
        const rulesBreadcrumbWithAppPath = getRulesBreadcrumbWithHref(
          isAppRegistered,
          getUrlForApp
        );
        setBreadcrumbs([rulesBreadcrumbWithAppPath, getAlertingSectionBreadcrumb('logs')]);
      } else {
        setBreadcrumbs([getAlertingSectionBreadcrumb('rules')]);
      }
    }
    docTitle.change(getCurrentDocTitle('rules'));
  }, [docTitle, setBreadcrumbs, currentSection, getUrlForApp, isAppRegistered]);

  return (
    <RulesPageTemplate
      pageHeader={{
        paddingSize: 'xl',
        bottomBorder: true,
        pageTitle: (
          <span data-test-subj="rulesPageTitle">
            <FormattedMessage
              id="xpack.triggersActionsUI.rulesPage.pageTitle"
              defaultMessage="Rules"
            />
          </span>
        ),
        rightSideItems: headerActions,
        description: (
          <FormattedMessage
            id="xpack.triggersActionsUI.rulesPage.pageDescription"
            defaultMessage="Manage and monitor all of your rules in one place."
          />
        ),
        tabs: tabs.map((tab) => ({
          label: tab.name,
          onClick: () => onSectionChange(tab.id),
          isSelected: tab.id === currentSection,
          key: tab.id,
          'data-test-subj': `${tab.id}Tab`,
        })),
      }}
    >
      <EuiSpacer size="l" />
      <Routes>
        <Route exact path="/logs" component={renderLogsList} />
        <Route exact path="/" component={renderRulesList} />
      </Routes>
    </RulesPageTemplate>
  );
};

// eslint-disable-next-line import/no-default-export
export default RulesPage;
