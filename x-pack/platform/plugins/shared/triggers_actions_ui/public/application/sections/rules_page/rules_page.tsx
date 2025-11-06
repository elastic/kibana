/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { lazy, useCallback, useEffect, useState } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiPageTemplate, EuiSpacer } from '@elastic/eui';
import { useHistory, useLocation } from 'react-router-dom';
import { Routes, Route } from '@kbn/shared-ux-router';
import { getEditRuleRoute } from '@kbn/rule-data-utils';
import { useGetRuleTypesPermissions } from '@kbn/alerts-ui-shared';
import { useKibana } from '../../../common/lib/kibana';
import { getAlertingSectionBreadcrumb } from '../../lib/breadcrumb';
import { getCurrentDocTitle } from '../../lib/doc_title';
import { RulesList } from '../rules_list/components/rules_list';
import { NON_SIEM_CONSUMERS } from '../alerts_search_bar/constants';
import type { Section } from '../../constants';
import { suspendedComponentWithProps } from '../../lib/suspended_component_with_props';

const LogsList = lazy(() => import('../rule_details/components/global_rule_event_log_list'));

export const RulesPage = () => {
  const history = useHistory();
  const location = useLocation();
  const {
    chrome: { docTitle },
    setBreadcrumbs,
    application: { navigateToApp },
    http,
    notifications: { toasts },
  } = useKibana().services;

  const [headerActions, setHeaderActions] = useState<React.ReactNode[] | undefined>();

  const { authorizedToReadAnyRules } = useGetRuleTypesPermissions({
    http,
    toasts,
    filteredRuleTypes: [],
  });

  // when path is /app/rules, the pathname is /, check for /logs and handle for that tab
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

  const navigateToEditRuleForm = useCallback(
    (ruleId: string) => {
      navigateToApp('management', {
        path: `insightsAndAlerting/triggersActions/${getEditRuleRoute(ruleId)}`,
        state: {
          returnApp: 'management',
          returnPath: `insightsAndAlerting/triggersActions/rules`,
        },
      });
    },
    [navigateToApp]
  );

  const renderRulesList = useCallback(() => {
    return (
      <EuiPageTemplate.Section>
        <RulesList
          consumers={NON_SIEM_CONSUMERS}
          rulesListKey="rules-page"
          showCreateRuleButtonInPrompt={true}
          setHeaderActions={setHeaderActions}
          navigateToEditRuleForm={navigateToEditRuleForm}
        />
      </EuiPageTemplate.Section>
    );
  }, [navigateToEditRuleForm]);

  const renderLogsList = useCallback(() => {
    return (
      <EuiPageTemplate.Section grow={false} paddingSize="none">
        {suspendedComponentWithProps(
          LogsList,
          'xl'
        )({
          setHeaderActions,
        })}
      </EuiPageTemplate.Section>
    );
  }, []);

  useEffect(() => {
    if (setBreadcrumbs) {
      setBreadcrumbs([getAlertingSectionBreadcrumb(currentSection || 'rules')]);
    }
    docTitle.change(getCurrentDocTitle(currentSection || 'rules'));
  }, [docTitle, setBreadcrumbs, currentSection]);

  return (
    <EuiPageTemplate offset={0} grow={true} paddingSize="l">
      <EuiPageTemplate.Header
        paddingSize="none"
        bottomBorder
        pageTitle={
          <span data-test-subj="rulesPageTitle">
            <FormattedMessage
              id="xpack.triggersActionsUI.rulesPage.pageTitle"
              defaultMessage="Rules"
            />
          </span>
        }
        rightSideItems={headerActions}
        description={
          <FormattedMessage
            id="xpack.triggersActionsUI.rulesPage.pageDescription"
            defaultMessage="Manage and monitor all of your rules in one place."
          />
        }
        tabs={tabs.map((tab) => ({
          label: tab.name,
          onClick: () => onSectionChange(tab.id),
          isSelected: tab.id === currentSection,
          key: tab.id,
          'data-test-subj': `${tab.id}Tab`,
        }))}
      />
      <EuiSpacer size="l" />
      <Routes>
        <Route exact path="/logs" component={renderLogsList} />
        <Route exact path="/rules" component={renderRulesList} />
        <Route exact path="/" component={renderRulesList} />
      </Routes>
    </EuiPageTemplate>
  );
};
