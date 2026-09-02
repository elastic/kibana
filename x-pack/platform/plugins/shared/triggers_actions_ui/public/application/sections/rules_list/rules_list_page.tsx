/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { lazy, useEffect, useMemo } from 'react';
import { rulesAppDetailsRoute } from '@kbn/rule-data-utils';
import { useGetRuleTypesPermissions } from '@kbn/alerts-ui-shared';
import { i18n } from '@kbn/i18n';
import type { AppMenuConfig } from '@kbn/core-chrome-app-menu-components';
import { isAlertingV2Enabled } from '@kbn/alerting-v2-utils';
import {
  RULES_PAGE_TAB_IDS,
  getRulesPageHeaderTabs,
  shouldShowAlertingV2RulesTab,
} from '@kbn/response-ops-rules-page-tabs';
import { useHistory } from 'react-router-dom';
import { useKibana } from '../../../common/lib/kibana';
import { getAlertingSectionBreadcrumb } from '../../lib/breadcrumb';
import { getCurrentDocTitle } from '../../lib/doc_title';
import { RulesPageHeader } from '../rules_page/rules_page_header';
import { getClassicTabs } from '../rules_page/get_classic_tabs';
import { getRulesPageMenu } from '../rules_page/get_rules_page_menu';
import { useRulesPageActions } from '../rules_page/rules_page_actions';

const RulesList = lazy(() => import('./components/rules_list'));

export const RulesListContainer = () => {
  const history = useHistory();
  const kibanaServices = useKibana().services;
  const {
    application: {
      getUrlForApp,
      capabilities: { rulesSettings = {} },
    },
    chrome: { docTitle },
    http,
    notifications: { toasts },
    docLinks,
    setBreadcrumbs,
  } = kibanaServices;
  const { authorizedToReadAnyRules, authorizedToCreateAnyRules } = useGetRuleTypesPermissions({
    http,
    toasts,
    filteredRuleTypes: [],
  });
  const {
    openCreateRuleModal,
    openSettingsFlyout,
    navigateToCreateRuleForm,
    navigateToEditRuleForm,
  } = useRulesPageActions();

  const { show, readFlappingSettingsUI, readQueryDelaySettingsUI } = rulesSettings;
  const canShowSettings = Boolean(show && (readFlappingSettingsUI || readQueryDelaySettingsUI));

  const docLink = docLinks.links.alerting.guide;
  const alertsBackHref = getUrlForApp('observability-overview', { path: '/alerts' });
  const alertingV2Enabled = isAlertingV2Enabled(kibanaServices);
  const showV2Tabs = shouldShowAlertingV2RulesTab(kibanaServices);

  useEffect(() => {
    setBreadcrumbs?.([getAlertingSectionBreadcrumb('rules')]);
    docTitle.change(getCurrentDocTitle('rules'));
  }, [docTitle, setBreadcrumbs]);

  const rulesListTabs = useMemo(() => {
    if (showV2Tabs) {
      return getRulesPageHeaderTabs({
        selectedTab: RULES_PAGE_TAB_IDS.v1,
        prepend: http.basePath.prepend,
        showV2Tab: true,
      });
    }

    if (alertingV2Enabled) {
      return [];
    }

    return getClassicTabs('rules', authorizedToReadAnyRules, history);
  }, [alertingV2Enabled, authorizedToReadAnyRules, history, http.basePath.prepend, showV2Tabs]);

  const rulesListMenu = useMemo<AppMenuConfig>(() => {
    const extraItems: NonNullable<AppMenuConfig['items']> =
      alertingV2Enabled && authorizedToReadAnyRules
        ? [
            {
              id: 'rulesLogs',
              order: 200,
              label: i18n.translate('xpack.triggersActionsUI.rulesPage.logsLink.title', {
                defaultMessage: 'Logs',
              }),
              iconType: 'table' as const,
              run: () => history.push('/logs'),
              testId: 'rulesLogsLink',
            },
          ]
        : [];

    return getRulesPageMenu({
      authorizedToCreateAnyRules,
      canShowSettings,
      extraItems,
      onCreateRule: openCreateRuleModal,
      onOpenSettings: openSettingsFlyout,
    });
  }, [
    alertingV2Enabled,
    authorizedToCreateAnyRules,
    authorizedToReadAnyRules,
    canShowSettings,
    history,
    openCreateRuleModal,
    openSettingsFlyout,
  ]);

  return (
    <>
      <RulesPageHeader
        back={{
          href: alertsBackHref,
          label: i18n.translate('xpack.triggersActionsUI.rulesPage.backButtonLabel', {
            defaultMessage: 'Alerts',
          }),
        }}
        tabs={rulesListTabs}
        menu={rulesListMenu}
        docLink={docLink}
      />
      <RulesList
        rulesListKey="rules-page"
        showCreateRuleButtonInPrompt={true}
        navigateToEditRuleForm={navigateToEditRuleForm}
        navigateToCreateRuleForm={navigateToCreateRuleForm}
        ruleDetailsRoute={rulesAppDetailsRoute}
      />
    </>
  );
};
