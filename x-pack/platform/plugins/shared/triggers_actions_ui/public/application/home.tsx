/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, lazy, useEffect, useCallback } from 'react';
import type { RouteComponentProps } from 'react-router-dom';
import { Routes, Route } from '@kbn/shared-ux-router';
import { css } from '@emotion/react';

import { FormattedMessage } from '@kbn/i18n-react';
import { EuiPageTemplate } from '@elastic/eui';

/** Body-only padding; Management uses mainProps paddingSize 'none' so tabs are edge-to-edge. */
// const bodyPaddingCss = css`
//   padding: 16px;
// `;

import { RuleTypeModal } from '@kbn/response-ops-rule-form';
import { useGetRuleTypesPermissions } from '@kbn/alerts-ui-shared/src/common/hooks/use_get_rule_types_permissions';
import { PerformanceContextProvider } from '@kbn/ebt-tools';
import { getCreateRuleRoute, getCreateRuleFromTemplateRoute } from '@kbn/rule-data-utils';
import type { Section } from './constants';
import { routeToRules, routeToLogs } from './constants';
import { getAlertingSectionBreadcrumb } from './lib/breadcrumb';
import { getCurrentDocTitle } from './lib/doc_title';

import { HealthCheck } from './components/health_check';
import { HealthContextProvider } from './context/health_context';
import { useKibana } from '../common/lib/kibana';
import { suspendedComponentWithProps } from './lib/suspended_component_with_props';

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
  const {
    chrome,
    setBreadcrumbs,
    http,
    notifications: { toasts },
    ruleTypeRegistry,
    application: { navigateToApp },
  } = useKibana().services;
  const { authorizedToReadAnyRules } = useGetRuleTypesPermissions({
    http,
    toasts,
    filteredRuleTypes: [],
  });

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

  const [ruleTypeModalVisible, setRuleTypeModalVisibility] = useState<boolean>(false);

  const openRuleTypeModal = useCallback(() => {
    setRuleTypeModalVisibility(true);
  }, []);

  const renderRulesList = useCallback(() => {
    return suspendedComponentWithProps(
      RulesList,
      'xl'
    )({
      showCreateRuleButtonInPrompt: true,
      calloutSlotId: 'rules-list-callout-slot',
    });
  }, []);

  const renderLogsList = useCallback(() => {
    return (
      <EuiPageTemplate.Section grow={false} paddingSize="none">
        <LogsList />
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
        bottomBorder="extended"
        tabs={tabs.map((tab) => ({
          label: tab.name,
          onClick: () => onSectionChange(tab.id),
          isSelected: tab.id === section,
          key: tab.id,
          'data-test-subj': `${tab.id}Tab`,
        }))}
        css={css`
          padding-inline: 8px;
        `}
      />
      <div id="rules-list-callout-slot" data-test-subj="rulesListCalloutSlot" />
      <div>
        <HealthContextProvider>
          <PerformanceContextProvider>
            <HealthCheck waitForCheck={true}>
              <Routes>
                <Route exact path={routeToLogs} component={renderLogsList} />
                <Route exact path={routeToRules} component={renderRulesList} />
              </Routes>
            </HealthCheck>
          </PerformanceContextProvider>
        </HealthContextProvider>
      </div>

      {ruleTypeModalVisible && (
        <RuleTypeModal
          onClose={() => setRuleTypeModalVisibility(false)}
          onSelectRuleType={(ruleTypeId) => {
            navigateToApp('management', {
              path: `insightsAndAlerting/triggersActions/${getCreateRuleRoute(ruleTypeId)}`,
            });
          }}
          onSelectTemplate={(templateId) => {
            navigateToApp('management', {
              path: `insightsAndAlerting/triggersActions/${getCreateRuleFromTemplateRoute(
                encodeURIComponent(templateId)
              )}`,
            });
          }}
          http={http}
          toasts={toasts}
          registeredRuleTypes={ruleTypeRegistry.list()}
          filteredRuleTypes={[]}
        />
      )}
    </>
  );
};

// eslint-disable-next-line import/no-default-export
export { TriggersActionsUIHome as default };
