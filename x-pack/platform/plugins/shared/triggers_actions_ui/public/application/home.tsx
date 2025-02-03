/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, lazy, useEffect, useCallback } from 'react';
import { RouteComponentProps } from 'react-router-dom';
import { Routes, Route } from '@kbn/shared-ux-router';

import { FormattedMessage } from '@kbn/i18n-react';
import { EuiSpacer, EuiPageTemplate } from '@elastic/eui';

import { Section, routeToRules, routeToLogs } from './constants';
import { getAlertingSectionBreadcrumb } from './lib/breadcrumb';
import { getCurrentDocTitle } from './lib/doc_title';

import { HealthCheck } from './components/health_check';
import { HealthContextProvider } from './context/health_context';
import { useKibana } from '../common/lib/kibana';
import { suspendedComponentWithProps } from './lib/suspended_component_with_props';
import { useLoadRuleTypesQuery } from './hooks/use_load_rule_types_query';

const RulesList = lazy(() => import('./sections/rules_list/components/rules_list'));
const LogsList = lazy(
  () => import('./sections/rule_details/components/global_rule_event_log_list')
);

export interface MatchParams {
  section: Section;
}

export const TriggersActionsUIHome: React.FunctionComponent<RouteComponentProps<MatchParams>> = ({
  match: {
    params: { section },
  },
  history,
}) => {
  const [headerActions, setHeaderActions] = useState<React.ReactNode[] | undefined>();
  const { chrome, setBreadcrumbs } = useKibana().services;
  const { authorizedToReadAnyRules } = useLoadRuleTypesQuery({ filteredRuleTypes: [] });

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
    history.push(`/${newSection}`);
  };

  const renderRulesList = useCallback(() => {
    return suspendedComponentWithProps(
      RulesList,
      'xl'
    )({
      showCreateRuleButtonInPrompt: true,
      useNewRuleForm: true,
      setHeaderActions,
    });
  }, []);

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

  // Set breadcrumb and page title
  useEffect(() => {
    setBreadcrumbs([getAlertingSectionBreadcrumb(section || 'home')]);
    chrome.docTitle.change(getCurrentDocTitle(section || 'home'));
  }, [section, chrome, setBreadcrumbs]);

  return (
    <>
      <EuiPageTemplate.Header
        paddingSize="none"
        bottomBorder
        pageTitle={
          <span data-test-subj="appTitle">
            <FormattedMessage id="xpack.triggersActionsUI.home.appTitle" defaultMessage="Rules" />
          </span>
        }
        rightSideItems={headerActions}
        description={
          <FormattedMessage
            id="xpack.triggersActionsUI.home.sectionDescription"
            defaultMessage="Detect conditions using rules."
          />
        }
        tabs={tabs.map((tab) => ({
          label: tab.name,
          onClick: () => onSectionChange(tab.id),
          isSelected: tab.id === section,
          key: tab.id,
          'data-test-subj': `${tab.id}Tab`,
        }))}
      />
      <EuiSpacer size="l" />
      <HealthContextProvider>
        <HealthCheck waitForCheck={true}>
          <Routes>
            <Route exact path={routeToLogs} component={renderLogsList} />
            <Route exact path={routeToRules} component={renderRulesList} />
          </Routes>
        </HealthCheck>
      </HealthContextProvider>
    </>
  );
};

// eslint-disable-next-line import/no-default-export
export { TriggersActionsUIHome as default };
