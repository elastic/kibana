/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { lazy, useEffect, useMemo } from 'react';
import { rulesAppDetailsRoute, triggersActionsRoute } from '@kbn/rule-data-utils';
import { useGetRuleTypesPermissions } from '@kbn/alerts-ui-shared';
import { i18n } from '@kbn/i18n';
import type { AppMenuConfig } from '@kbn/core-chrome-app-menu-components';
import { ALERTING_V2_RULES_BASE_PATH } from '@kbn/alerting-v2-constants';
import { useHistory } from 'react-router-dom';
import { useKibana } from '../../../common/lib/kibana';
import { getAlertingSectionBreadcrumb } from '../../lib/breadcrumb';
import { getCurrentDocTitle } from '../../lib/doc_title';
import { RulesPageHeader } from '../rules_page/rules_page_header';
import { getClassicTabs } from '../rules_page/get_classic_tabs';
import { getV1RulesPageTabs } from '../rules_page/get_v1_rules_page_tabs';
import { getRulesPageMenu } from '../rules_page/get_rules_page_menu';
import { useRulesPageActions } from '../rules_page/rules_page_actions';
import { RULES_PAGE_MODE, useRulesPageMode } from '../rules_page/use_rules_page_mode';

const RulesList = lazy(() => import('./components/rules_list'));

export const RulesListContainer = () => {
  const history = useHistory();
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
  } = useKibana().services;
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
  const mode = useRulesPageMode();

  useEffect(() => {
    setBreadcrumbs?.([getAlertingSectionBreadcrumb('rules')]);
    docTitle.change(getCurrentDocTitle('rules'));
  }, [docTitle, setBreadcrumbs]);

  const rulesListTabs = useMemo(() => {
    if (mode === RULES_PAGE_MODE.v1AndV2Tabs) {
      return getV1RulesPageTabs({
        v1Href: http.basePath.prepend(triggersActionsRoute),
        v2Href: http.basePath.prepend(ALERTING_V2_RULES_BASE_PATH),
      });
    }

    if (mode === RULES_PAGE_MODE.noTabs) {
      return [];
    }

    return getClassicTabs('rules', authorizedToReadAnyRules, history);
  }, [mode, authorizedToReadAnyRules, history, http.basePath]);

  const rulesListMenu = useMemo<AppMenuConfig>(() => {
    const extraItems: NonNullable<AppMenuConfig['items']> =
      mode !== RULES_PAGE_MODE.v1Tabs && authorizedToReadAnyRules
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
    mode,
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
