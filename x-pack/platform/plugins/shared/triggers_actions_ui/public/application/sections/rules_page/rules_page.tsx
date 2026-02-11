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
import {
  getCreateRuleRoute,
  getEditRuleRoute,
  getRulesAppDetailsRoute,
  rulesAppDetailsRoute,
  getCreateRuleFromTemplateRoute,
} from '@kbn/rule-data-utils';
import { useGetRuleTypesPermissions } from '@kbn/alerts-ui-shared';
import { RuleTypeModal } from '@kbn/response-ops-rule-form';
import { RulesSettingsLink } from '../../components/rules_setting/rules_settings_link';
import { RulesListDocLink } from '../rules_list/components/rules_list_doc_link';
import { RulesPageTemplate } from './rules_page_template';
import { useKibana } from '../../../common/lib/kibana';
import { getIsExperimentalFeatureEnabled } from '../../../common/get_experimental_features';
import { getAlertingSectionBreadcrumb, getRulesBreadcrumbWithHref } from '../../lib/breadcrumb';
import { CreateRuleButton } from '../rules_list/components/create_rule_button';
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
    application: { navigateToApp, getUrlForApp, isAppRegistered },
    http,
    notifications: { toasts },
    ruleTypeRegistry,
  } = useKibana().services;
  const useUnifiedRulesPage = getIsExperimentalFeatureEnabled('unifiedRulesPage');

  const { authorizedToReadAnyRules, authorizedToCreateAnyRules } = useGetRuleTypesPermissions({
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
  const [ruleTypeModalVisible, setRuleTypeModalVisibility] = useState<boolean>(false);

  const openRuleTypeModal = useCallback(() => {
    setRuleTypeModalVisibility(true);
  }, []);

  const headerActions = [
    ...(authorizedToCreateAnyRules ? [<CreateRuleButton openFlyout={openRuleTypeModal} />] : []),
    <RulesSettingsLink
      alertDeleteCategoryIds={['management', 'observability', 'securitySolution']}
    />,
    <RulesListDocLink />,
  ];

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
      const returnPath = `${pathname}${search}${hash}` || '/';

      history.push({
        pathname: getEditRuleRoute(ruleId),
        search,
        hash,
        state: {
          returnPath,
        },
      });
    },
    [history]
  );

  const navigateToCreateRuleForm = useCallback(
    (ruleTypeId: string) => {
      const { pathname, search, hash } = locationRef.current;
      const returnPath = `${pathname}${search}${hash}`;

      if (useUnifiedRulesPage) {
        history.push({
          pathname: getCreateRuleRoute(ruleTypeId),
          search,
          hash,
          state: { returnPath },
        });
      } else {
        navigateToApp('management', {
          path: getCreateRuleRoute(ruleTypeId),
          state: {
            returnApp: 'management',
            returnPath,
          },
        });
      }
    },
    [navigateToApp, useUnifiedRulesPage, history]
  );

  const renderRulesList = useCallback(() => {
    return (
      <KibanaPageTemplate.Section paddingSize="l" data-test-subj="rulesListWrapper">
        <RulesList
          consumers={NON_SIEM_CONSUMERS}
          rulesListKey="rules-page"
          showCreateRuleButtonInPrompt={true}
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
          getRuleDetailsRoute: getRulesAppDetailsRoute,
        })}
      </KibanaPageTemplate.Section>
    );
  }, []);

  useEffect(() => {
    if (setBreadcrumbs) {
      if (currentSection === 'logs') {
        const rulesBreadcrumbWithAppPath = getRulesBreadcrumbWithHref(getUrlForApp);
        setBreadcrumbs([rulesBreadcrumbWithAppPath, getAlertingSectionBreadcrumb('logs')]);
      } else {
        setBreadcrumbs([getAlertingSectionBreadcrumb('rules')]);
      }
    }
    docTitle.change(getCurrentDocTitle('rules'));
  }, [docTitle, setBreadcrumbs, currentSection, getUrlForApp, isAppRegistered]);

  return (
    <>
      <RulesPageTemplate
        pageHeader={{
          paddingSize: 'xl',
          bottomBorder: true,
          pageTitle: (
            <span data-test-subj="appTitle">
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
      {ruleTypeModalVisible && (
        <RuleTypeModal
          onClose={() => setRuleTypeModalVisibility(false)}
          onSelectRuleType={(ruleTypeId) => {
            if (navigateToCreateRuleForm) {
              navigateToCreateRuleForm(ruleTypeId);
            } else {
              navigateToApp('management', {
                path: `insightsAndAlerting/triggersActions/${getCreateRuleRoute(ruleTypeId)}`,
              });
            }
          }}
          onSelectTemplate={(templateId) => {
            // For templates, we need to extract the ruleTypeId or handle it differently
            // For now, fall back to default behavior
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
export default RulesPage;
