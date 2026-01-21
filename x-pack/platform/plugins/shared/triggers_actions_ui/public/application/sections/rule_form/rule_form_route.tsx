/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { RuleForm, useRuleTemplate } from '@kbn/response-ops-rule-form';
import { AlertConsumers, getRuleDetailsRoute, getRulesAppDetailsRoute } from '@kbn/rule-data-utils';
import { useLocation, useParams, useHistory } from 'react-router-dom';
import useObservable from 'react-use/lib/useObservable';
import { useKibana } from '../../../common/lib/kibana';
import { getAlertingSectionBreadcrumb } from '../../lib/breadcrumb';
import { getCurrentDocTitle } from '../../lib/doc_title';
import { RuleTemplateError } from './components/rule_template_error';
import { CenterJustifiedSpinner } from '../../components/center_justified_spinner';

export const RuleFormRoute = () => {
  const {
    http,
    application,
    notifications,
    charts,
    settings,
    data,
    dataViews,
    unifiedSearch,
    docLinks,
    ruleTypeRegistry,
    actionTypeRegistry,
    contentManagement,
    uiActions,
    chrome,
    setBreadcrumbs,
    ...startServices
  } = useKibana().services;
  const { currentAppId$, navigateToApp, getUrlForApp } = application;
  const currentAppId = useObservable(currentAppId$, undefined);
  const isInRulesApp = currentAppId === 'rules';

  const location = useLocation<{ returnApp?: string; returnPath?: string }>();
  const history = useHistory();
  const {
    id,
    ruleTypeId: ruleTypeIdParams,
    templateId: templateIdParams,
  } = useParams<{
    id?: string;
    ruleTypeId?: string;
    templateId?: string;
  }>();
  const { returnApp, returnPath } = location.state || {};

  const templateId = templateIdParams;

  const {
    data: ruleTemplate,
    error: ruleTemplateError,
    isLoading: isLoadingRuleTemplate,
    isError: isErrorRuleTemplate,
  } = useRuleTemplate({
    http,
    templateId,
  });

  const ruleTypeId = ruleTypeIdParams ?? ruleTemplate?.ruleTypeId;

  // Set breadcrumb and page title
  useEffect(() => {
    const rulesBreadcrumb = getAlertingSectionBreadcrumb('rules', true);
    const breadcrumbHref = isInRulesApp
      ? getUrlForApp('rules', { path: '/' })
      : getUrlForApp('management', { path: 'insightsAndAlerting/triggersActions/rules' });

    const rulesBreadcrumbWithAppPath = {
      ...rulesBreadcrumb,
      href: breadcrumbHref,
    };

    if (id) {
      setBreadcrumbs([rulesBreadcrumbWithAppPath, getAlertingSectionBreadcrumb('editRule')]);
      chrome.docTitle.change(getCurrentDocTitle('editRule'));
    }
    if (ruleTypeId || templateId) {
      setBreadcrumbs([rulesBreadcrumbWithAppPath, getAlertingSectionBreadcrumb('createRule')]);
      chrome.docTitle.change(getCurrentDocTitle('createRule'));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ruleTypeId, templateId, id, getUrlForApp, isInRulesApp]);

  if (isLoadingRuleTemplate) {
    return <CenterJustifiedSpinner />;
  }

  if (isErrorRuleTemplate) {
    return <RuleTemplateError error={ruleTemplateError as Error} />; // TODO
  }

  return (
    <IntlProvider locale="en">
      <RuleForm
        plugins={{
          http,
          application,
          notifications,
          charts,
          settings,
          data,
          dataViews,
          unifiedSearch,
          docLinks,
          ruleTypeRegistry,
          actionTypeRegistry,
          contentManagement,
          uiActions,
          ...startServices,
        }}
        initialValues={ruleTemplate}
        id={id}
        ruleTypeId={ruleTypeId}
        onCancel={() => {
          if (isInRulesApp) {
            // Use history.push when in rules app
            // Use returnPath if available, otherwise default to root
            history.push(returnPath || '/');
          } else if (returnApp && returnPath) {
            // Navigate to other apps using navigateToApp
            navigateToApp(returnApp, { path: returnPath });
          } else {
            // Default: navigate to management app rules list
            navigateToApp('management', {
              path: `insightsAndAlerting/triggersActions/rules`,
            });
          }
        }}
        onSubmit={(ruleId) => {
          if (isInRulesApp) {
            // Navigate to rule details page in the rules app using history.push
            history.push(getRulesAppDetailsRoute(ruleId));
          } else if (returnApp && returnPath) {
            // Navigate back to the original app/path for other apps
            navigateToApp(returnApp, { path: returnPath });
          } else {
            // Default: navigate to management app rule details (existing behavior)
            navigateToApp('management', {
              path: `insightsAndAlerting/triggersActions/${getRuleDetailsRoute(ruleId)}`,
            });
          }
        }}
        multiConsumerSelection={AlertConsumers.ALERTS}
      />
    </IntlProvider>
  );
};

// eslint-disable-next-line import/no-default-export
export { RuleFormRoute as default };
