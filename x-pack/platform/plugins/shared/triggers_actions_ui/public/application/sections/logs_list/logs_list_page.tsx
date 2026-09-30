/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { lazy, useEffect } from 'react';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import { getRulesAppDetailsRoute } from '@kbn/rule-data-utils';
import { EuiSpacer } from '@elastic/eui';
import { useKibana } from '../../../common/lib/kibana';
import { getAlertingSectionBreadcrumb, getRulesBreadcrumbWithHref } from '../../lib/breadcrumb';
import { getCurrentDocTitle } from '../../lib/doc_title';
import { suspendedComponentWithProps } from '../../lib/suspended_component_with_props';
import { LogsListHeader } from './logs_list_header';
import { useRulesPageActions } from '../rules_page/rules_page_actions';
import { useLocators } from '../../locator_context';

const LogsList = lazy(() => import('../rule_details/components/global_rule_event_log_list'));

export const LogsListContainer = () => {
  const {
    application: {
      capabilities: { rulesSettings = {} },
    },
    chrome: { docTitle },
    docLinks,
    setBreadcrumbs,
  } = useKibana().services;
  const { rules } = useLocators();
  const { openSettingsFlyout } = useRulesPageActions();

  const { show, readFlappingSettingsUI, readQueryDelaySettingsUI } = rulesSettings;
  const canShowSettings = Boolean(show && (readFlappingSettingsUI || readQueryDelaySettingsUI));

  const docLink = docLinks.links.alerting.guide;
  const rulesListHref = rules.useUrl({});

  useEffect(() => {
    setBreadcrumbs?.([getRulesBreadcrumbWithHref(), getAlertingSectionBreadcrumb('logs')]);
    docTitle.change(getCurrentDocTitle('logs'));
  }, [docTitle, setBreadcrumbs]);

  return (
    <>
      <LogsListHeader
        backHref={rulesListHref}
        shouldShowSettings={canShowSettings}
        docLink={docLink}
        onOpenSettings={openSettingsFlyout}
      />
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
