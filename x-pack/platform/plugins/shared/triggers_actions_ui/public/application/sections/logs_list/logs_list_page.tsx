/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { lazy, useEffect, useMemo } from 'react';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import { useHistory } from 'react-router-dom';
import { getRulesAppDetailsRoute, triggersActionsRoute } from '@kbn/rule-data-utils';
import { useGetRuleTypesPermissions } from '@kbn/alerts-ui-shared';
import { i18n } from '@kbn/i18n';
import { EuiSpacer } from '@elastic/eui';
import { useKibana } from '../../../common/lib/kibana';
import { getAlertingSectionBreadcrumb, getRulesBreadcrumbWithHref } from '../../lib/breadcrumb';
import { getCurrentDocTitle } from '../../lib/doc_title';
import { suspendedComponentWithProps } from '../../lib/suspended_component_with_props';
import { LogsListHeader } from './logs_list_header';
import { RulesPageHeader } from '../rules_page/rules_page_header';
import { getClassicTabs } from '../rules_page/get_classic_tabs';
import { getRulesPageMenu } from '../rules_page/get_rules_page_menu';
import { useRulesPageActions } from '../rules_page/rules_page_actions';
import { RULES_PAGE_MODE, useRulesPageMode } from '../rules_page/use_rules_page_mode';

const LogsList = lazy(() => import('../rule_details/components/global_rule_event_log_list'));

export const LogsListContainer = () => {
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
  const { openCreateRuleModal, openSettingsFlyout } = useRulesPageActions();

  const { show, readFlappingSettingsUI, readQueryDelaySettingsUI } = rulesSettings;
  const canShowSettings = Boolean(show && (readFlappingSettingsUI || readQueryDelaySettingsUI));

  const docLink = docLinks.links.alerting.guide;
  const rulesListHref = http.basePath.prepend(triggersActionsRoute);
  const alertsBackHref = getUrlForApp('observability-overview', { path: '/alerts' });
  const mode = useRulesPageMode();

  useEffect(() => {
    setBreadcrumbs?.([getRulesBreadcrumbWithHref(), getAlertingSectionBreadcrumb('logs')]);
    docTitle.change(getCurrentDocTitle('logs'));
  }, [docTitle, setBreadcrumbs]);

  const classicLogsMenu = useMemo(
    () =>
      getRulesPageMenu({
        authorizedToCreateAnyRules,
        canShowSettings,
        onCreateRule: openCreateRuleModal,
        onOpenSettings: openSettingsFlyout,
      }),
    [authorizedToCreateAnyRules, canShowSettings, openCreateRuleModal, openSettingsFlyout]
  );

  const classicLogsTabs = useMemo(
    () => getClassicTabs('logs', authorizedToReadAnyRules, history),
    [authorizedToReadAnyRules, history]
  );

  const heading =
    mode !== RULES_PAGE_MODE.v1Tabs ? (
      <LogsListHeader
        backHref={rulesListHref}
        canShowSettings={canShowSettings}
        docLink={docLink}
        onOpenSettings={openSettingsFlyout}
      />
    ) : (
      <RulesPageHeader
        back={{
          href: alertsBackHref,
          label: i18n.translate('xpack.triggersActionsUI.rulesPage.backButtonLabel', {
            defaultMessage: 'Alerts',
          }),
        }}
        tabs={classicLogsTabs}
        menu={classicLogsMenu}
        docLink={docLink}
      />
    );

  return (
    <>
      {heading}
      <KibanaPageTemplate.Section grow={false} paddingSize="none">
        <EuiSpacer size="s" />
        {suspendedComponentWithProps(
          LogsList,
          'xl'
        )({
          getRuleDetailsRoute: getRulesAppDetailsRoute,
        })}
      </KibanaPageTemplate.Section>
    </>
  );
};
